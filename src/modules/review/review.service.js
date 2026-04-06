import { Review } from "./review.model.js";
import { Appointment } from "../appointment/appointment.model.js";
import { Patient } from "../patient/patient.model.js";
import { Doctor } from "../doctor/doctor.model.js";
import { User } from "../auth/auth.model.js";
import { sendEmail } from "../../services/email.service.js";
import { sendSMS } from "../../services/sms.service.js";
import { ApiError } from "../../utils/apiError.js";
import mongoose from "mongoose";

export class ReviewService {
  
  // ==================== Create & Manage ====================

  /**
   * Create new review
   */
  static async createReview(patientId, reviewData) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { appointmentId, rating, comment } = reviewData;

      // Check if appointment exists and belongs to this patient
      const appointment = await Appointment.findOne({
        _id: appointmentId,
        patient: patientId,
      }).populate("doctor");

      if (!appointment) {
        throw new ApiError(404, "Appointment not found");
      }

      // Check if appointment is completed
      if (appointment.status !== "completed") {
        throw new ApiError(400, "Can only review completed appointments");
      }

      // Check if review already exists for this appointment
      const existingReview = await Review.findOne({ appointment: appointmentId });
      if (existingReview) {
        throw new ApiError(400, "Review already exists for this appointment");
      }

      // Create review
      const review = await Review.create([{
        appointment: appointmentId,
        patient: patientId,
        doctor: appointment.doctor._id,
        rating,
        comment,
        isVerified: true,
      }], { session });

      // Update doctor's rating
      await this.updateDoctorRating(appointment.doctor._id, session);

      await session.commitTransaction();

      // Send notification to doctor
      await this.sendReviewNotification(review[0], appointment);

      return review[0];
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Update review
   */
  static async updateReview(patientId, reviewId, updateData) {
    const review = await Review.findOne({
      _id: reviewId,
      patient: patientId,
    });

    if (!review) {
      throw new ApiError(404, "Review not found");
    }

    // Check if review is editable (within 7 days)
    const daysSinceCreation = (Date.now() - review.createdAt) / (1000 * 60 * 60 * 24);
    if (daysSinceCreation > 7) {
      throw new ApiError(400, "Review can only be edited within 7 days of creation");
    }

    // Update fields
    if (updateData.rating) review.rating = updateData.rating;
    if (updateData.comment) review.comment = updateData.comment;

    await review.save();

    // Update doctor's rating
    await this.updateDoctorRating(review.doctor);

    return review;
  }

  /**
   * Delete review
   */
  static async deleteReview(patientId, reviewId) {
    const review = await Review.findOne({
      _id: reviewId,
      patient: patientId,
    });

    if (!review) {
      throw new ApiError(404, "Review not found");
    }

    // Check if review is deletable (within 7 days)
    const daysSinceCreation = (Date.now() - review.createdAt) / (1000 * 60 * 60 * 24);
    if (daysSinceCreation > 7) {
      throw new ApiError(400, "Review can only be deleted within 7 days of creation");
    }

    const doctorId = review.doctor;
    await review.deleteOne();

    // Update doctor's rating
    await this.updateDoctorRating(doctorId);

    return { message: "Review deleted successfully" };
  }

  /**
   * Respond to review (Doctor only)
   */
  static async respondToReview(doctorId, reviewId, responseData) {
    const review = await Review.findOne({
      _id: reviewId,
      doctor: doctorId,
    });

    if (!review) {
      throw new ApiError(404, "Review not found");
    }

    // Check if already responded
    if (review.doctorResponse?.comment) {
      throw new ApiError(400, "Already responded to this review");
    }

    review.doctorResponse = {
      comment: responseData.comment,
      respondedAt: new Date(),
    };

    await review.save();

    // Send notification to patient
    await this.sendResponseNotification(review);

    return review;
  }

  /**
   * Update doctor's rating based on all reviews
   */
  static async updateDoctorRating(doctorId, session = null) {
    const result = await Review.aggregate([
      { $match: { doctor: doctorId } },
      {
        $group: {
          _id: "$doctor",
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    const updateData = {
      rating: result[0]?.averageRating || 0,
      totalReviews: result[0]?.totalReviews || 0,
    };

    const query = Doctor.findByIdAndUpdate(doctorId, updateData, { new: true });
    
    if (session) {
      query.session(session);
    }
    
    await query.exec();
  }

  // ==================== Query Methods ====================

  /**
   * Get reviews for a doctor
   */
  static async getDoctorReviews(doctorId, filters) {
    const { page = 1, limit = 10, sortBy = "recent", rating } = filters;
    const skip = (page - 1) * limit;

    const query = { doctor: doctorId };

    if (rating) {
      query.rating = rating;
    }

    // Sorting
    let sort = {};
    switch (sortBy) {
      case "recent":
        sort = { createdAt: -1 };
        break;
      case "oldest":
        sort = { createdAt: 1 };
        break;
      case "rating":
        sort = { rating: -1, createdAt: -1 };
        break;
      default:
        sort = { createdAt: -1 };
    }

    const reviews = await Review.find(query)
      .populate({
        path: "patient",
        populate: {
          path: "user",
          select: "fullName profileImage",
        },
      })
      .populate("appointment", "appointmentDate type")
      .skip(skip)
      .limit(limit)
      .sort(sort);

    const total = await Review.countDocuments(query);

    // Get rating distribution
    const distribution = await Review.aggregate([
      { $match: { doctor: doctorId } },
      { $group: { _id: "$rating", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const ratingDistribution = {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0,
    };
    
    distribution.forEach(item => {
      ratingDistribution[item._id] = item.count;
    });

    // Get doctor info
    const doctor = await Doctor.findById(doctorId)
      .populate("user", "fullName specialization");

    return {
      doctor: {
        id: doctor._id,
        name: doctor.user?.fullName,
        specialization: doctor.specialization,
        rating: doctor.rating,
        totalReviews: doctor.totalReviews,
      },
      ratingDistribution,
      reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get reviews by a patient
   */
  static async getPatientReviews(patientId, filters) {
    const { page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const reviews = await Review.find({ patient: patientId })
      .populate({
        path: "doctor",
        populate: {
          path: "user",
          select: "fullName specialization",
        },
      })
      .populate("appointment", "appointmentDate type")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Review.countDocuments({ patient: patientId });

    // Calculate patient's average rating given
    const avgRating = await Review.aggregate([
      { $match: { patient: patientId } },
      { $group: { _id: null, average: { $avg: "$rating" } } },
    ]);

    return {
      reviews,
      stats: {
        total,
        averageRating: avgRating[0]?.average || 0,
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single review details
   */
  static async getReviewById(reviewId) {
    const review = await Review.findById(reviewId)
      .populate({
        path: "patient",
        populate: {
          path: "user",
          select: "fullName profileImage",
        },
      })
      .populate({
        path: "doctor",
        populate: {
          path: "user",
          select: "fullName specialization",
        },
      })
      .populate("appointment", "appointmentDate startTime type symptoms");

    if (!review) {
      throw new ApiError(404, "Review not found");
    }

    return review;
  }

  /**
   * Check if patient can review doctor
   */
  static async canReview(patientId, doctorId) {
    // Check if patient has completed appointment with this doctor
    const completedAppointment = await Appointment.findOne({
      patient: patientId,
      doctor: doctorId,
      status: "completed",
    });

    if (!completedAppointment) {
      return {
        canReview: false,
        message: "You need to have a completed appointment with this doctor to review",
      };
    }

    // Check if already reviewed
    const existingReview = await Review.findOne({
      patient: patientId,
      doctor: doctorId,
    });

    if (existingReview) {
      return {
        canReview: false,
        message: "You have already reviewed this doctor",
        reviewId: existingReview._id,
      };
    }

    return {
      canReview: true,
      appointmentId: completedAppointment._id,
    };
  }

  /**
   * Get recent reviews (for homepage)
   */
  static async getRecentReviews(limit = 10) {
    const reviews = await Review.find()
      .populate({
        path: "patient",
        populate: {
          path: "user",
          select: "fullName profileImage",
        },
      })
      .populate({
        path: "doctor",
        populate: {
          path: "user",
          select: "fullName specialization",
        },
      })
      .sort({ createdAt: -1 })
      .limit(limit);

    return reviews;
  }

  /**
   * Get top rated doctors
   */
  static async getTopRatedDoctors(limit = 10) {
    const doctors = await Doctor.find({ verificationStatus: "verified" })
      .populate("user", "fullName profileImage")
      .sort({ rating: -1, totalReviews: -1 })
      .limit(limit);

    return doctors;
  }

  // ==================== Statistics ====================

  /**
   * Get review statistics for a doctor
   */
  static async getDoctorStats(doctorId) {
    const [
      totalReviews,
      averageRating,
      ratingDistribution,
      recentTrend,
    ] = await Promise.all([
      Review.countDocuments({ doctor: doctorId }),
      Review.aggregate([
        { $match: { doctor: doctorId } },
        { $group: { _id: null, avg: { $avg: "$rating" } } },
      ]),
      Review.aggregate([
        { $match: { doctor: doctorId } },
        { $group: { _id: "$rating", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Review.aggregate([
        { $match: { doctor: doctorId } },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            count: { $sum: 1 },
            avgRating: { $avg: "$rating" },
          },
        },
        { $sort: { "_id.year": -1, "_id.month": -1 } },
        { $limit: 6 },
      ]),
    ]);

    const distribution = {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0,
    };
    
    ratingDistribution.forEach(item => {
      distribution[item._id] = item.count;
    });

    return {
      totalReviews,
      averageRating: averageRating[0]?.avg || 0,
      ratingDistribution: distribution,
      recentTrend,
      responseRate: await this.calculateResponseRate(doctorId),
    };
  }

  /**
   * Calculate doctor's response rate to reviews
   */
  static async calculateResponseRate(doctorId) {
    const reviews = await Review.find({ 
      doctor: doctorId,
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    });

    if (reviews.length === 0) return 0;

    const responded = reviews.filter(r => r.doctorResponse?.comment).length;
    return Math.round((responded / reviews.length) * 100);
  }

  /**
   * Get platform-wide review statistics
   */
  static async getPlatformStats() {
    const [
      totalReviews,
      averageRating,
      reviewsByRating,
      topDoctors,
      recentActivity,
    ] = await Promise.all([
      Review.countDocuments(),
      Review.aggregate([
        { $group: { _id: null, avg: { $avg: "$rating" } } },
      ]),
      Review.aggregate([
        { $group: { _id: "$rating", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Doctor.find()
        .populate("user", "fullName")
        .sort({ rating: -1, totalReviews: -1 })
        .limit(5)
        .select("rating totalReviews user"),
      Review.find()
        .populate({
          path: "patient",
          populate: { path: "user", select: "fullName" },
        })
        .populate({
          path: "doctor",
          populate: { path: "user", select: "fullName" },
        })
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    const distribution = {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0,
    };
    
    reviewsByRating.forEach(item => {
      distribution[item._id] = item.count;
    });

    return {
      totalReviews,
      averageRating: averageRating[0]?.avg || 0,
      ratingDistribution: distribution,
      topDoctors: topDoctors.map(d => ({
        id: d._id,
        name: d.user?.fullName,
        rating: d.rating,
        totalReviews: d.totalReviews,
      })),
      recentActivity,
    };
  }

  // ==================== Admin Moderation ====================

  /**
   * Get flagged reviews (for admin)
   */
  static async getFlaggedReviews(filters) {
    const { page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    // This would require a Report model
    // For now, return reviews with suspicious patterns
    const reviews = await Review.find({
      $or: [
        { comment: { $regex: /bad|worst|terrible|spam|fake/i } },
        { rating: { $in: [1, 5] }, comment: { $exists: false } },
      ],
    })
      .populate({
        path: "patient",
        populate: { path: "user", select: "fullName" },
      })
      .populate({
        path: "doctor",
        populate: { path: "user", select: "fullName" },
      })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Review.countDocuments();

    return {
      reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Moderate review (admin)
   */
  static async moderateReview(reviewId, action, reason) {
    const review = await Review.findById(reviewId);

    if (!review) {
      throw new ApiError(404, "Review not found");
    }

    switch (action) {
      case "approve":
        review.isVerified = true;
        break;
      case "reject":
        await review.deleteOne();
        // Update doctor's rating after deletion
        await this.updateDoctorRating(review.doctor);
        return { message: "Review rejected and deleted" };
      case "hide":
        review.isVerified = false;
        break;
      case "feature":
        // Add to featured reviews (would need a field)
        break;
    }

    await review.save();

    // Update doctor's rating if verification status changed
    if (action === "approve" || action === "hide") {
      await this.updateDoctorRating(review.doctor);
    }

    // Notify user
    if (action === "reject" || action === "hide") {
      await this.sendModerationNotification(review, action, reason);
    }

    return review;
  }

  // ==================== Notifications ====================

  /**
   * Send review notification to doctor
   */
  static async sendReviewNotification(review, appointment) {
    const doctorUser = await User.findById(appointment.doctor.user);
    const patientUser = await User.findById(appointment.patient.user);

    await sendEmail({
      to: doctorUser.email,
      subject: "New Review Received",
      template: "new-review",
      data: {
        doctorName: doctorUser.fullName,
        patientName: patientUser.fullName,
        rating: review.rating,
        comment: review.comment,
        reviewId: review._id,
      },
    });

    await sendSMS({
      to: doctorUser.phone,
      message: `You received a ${review.rating}-star review from ${patientUser.fullName}. Check your dashboard.`,
    });
  }

  /**
   * Send response notification to patient
   */
  static async sendResponseNotification(review) {
    const patient = await Patient.findById(review.patient).populate("user");
    const doctor = await Doctor.findById(review.doctor).populate("user");

    await sendEmail({
      to: patient.user.email,
      subject: "Doctor Responded to Your Review",
      template: "review-response",
      data: {
        patientName: patient.user.fullName,
        doctorName: doctor.user.fullName,
        response: review.doctorResponse.comment,
      },
    });

    await sendSMS({
      to: patient.user.phone,
      message: `Dr. ${doctor.user.fullName} responded to your review. Check your dashboard.`,
    });
  }

  /**
   * Send moderation notification
   */
  static async sendModerationNotification(review, action, reason) {
    const patient = await Patient.findById(review.patient).populate("user");

    const actionMessages = {
      hide: "hidden",
      reject: "rejected",
    };

    await sendEmail({
      to: patient.user.email,
      subject: "Review Moderation Update",
      template: "review-moderation",
      data: {
        patientName: patient.user.fullName,
        action: actionMessages[action],
        reason,
      },
    });
  }
}