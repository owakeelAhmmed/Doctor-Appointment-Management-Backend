import { Doctor } from "./doctor.model.js";
import { DoctorService } from "./doctor.service.js";
import { ApiError } from "../../utils/apiError.js";
import { Review } from "../review/review.model.js";
import mongoose from "mongoose";

export class DoctorController {

  // ==================== Profile ====================

  static async getProfile(req, res, next) {
    try {
      const result = await DoctorService.getProfile(req.user._id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      const result = await DoctorService.updateProfile(req.user._id, req.body);
      res.json({ success: true, message: "Profile updated successfully", data: result });
    } catch (error) {
      next(error);
    }
  }

  static async updateSchedule(req, res, next) {
    try {
      const result = await DoctorService.updateSchedule(req.user._id, req.body);
      res.json({ success: true, message: "Schedule updated successfully", data: result });
    } catch (error) {
      next(error);
    }
  }

  static async updateFee(req, res, next) {
    try {
      const result = await DoctorService.updateFee(req.user._id, req.body);
      res.json({ success: true, message: "Fee updated successfully", data: result });
    } catch (error) {
      next(error);
    }
  }

  static async updateBankInfo(req, res, next) {
    try {
      const result = await DoctorService.updateBankInfo(req.user._id, req.body);
      res.json({ success: true, message: "Bank info updated", data: result });
    } catch (error) {
      next(error);
    }
  }

  static async updateMobileBanking(req, res, next) {
    try {
      const result = await DoctorService.updateMobileBanking(req.user._id, req.body);
      res.json({ success: true, message: "Mobile banking updated", data: result });
    } catch (error) {
      next(error);
    }
  }

  static async uploadDocuments(req, res, next) {
    try {
      const result = await DoctorService.uploadDocuments(req.user._id, req.files);
      res.json({ success: true, message: "Documents uploaded successfully", data: result });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Complete Profile ====================

  static async getCompleteProfile(req, res, next) {
    try {
      const doctor = await Doctor.findOne({ user: req.user._id });
      if (!doctor) {
        throw new ApiError(404, "Doctor profile not found");
      }

      res.json({
        success: true,
        data: {
          doctor,
          isProfileComplete: !!(doctor.specialization && doctor.consultationFee),
          verificationStatus: doctor.verificationStatus,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async submitCompleteProfile(req, res, next) {
    try {
      const doctor = await Doctor.findOne({ user: req.user._id });
      if (!doctor) {
        throw new ApiError(404, "Doctor profile not found");
      }

      // Update professional info
      const updateData = {
        specialization: req.body.specialization,
        experienceYears: parseInt(req.body.experienceYears) || 0,
        consultationFee: parseInt(req.body.consultationFee) || 0,
        currentWorkplace: req.body.currentWorkplace,
        qualifications: req.body.qualifications,
        consultationTypes: req.body.consultationTypes || ["in-person", "video"],
      };

      // Update status to profile_submitted if currently pending
      if (doctor.verificationStatus === "pending") {
        updateData.verificationStatus = "profile_submitted";
        updateData.profileCompletedAt = new Date();
      }

      const updatedDoctor = await Doctor.findOneAndUpdate(
        { user: req.user._id },
        updateData,
        { new: true, runValidators: true }
      );

      res.json({
        success: true,
        message: "Profile completed successfully! Please upload your documents.",
        data: {
          verificationStatus: updatedDoctor.verificationStatus,
          doctor: updatedDoctor,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Verification Status ====================

  static async getVerificationStatus(req, res, next) {
    try {
      const doctor = await Doctor.findOne({ user: req.user._id });

      if (!doctor) {
        throw new ApiError(404, "Doctor profile not found");
      }

      const steps = {
        pending: [
          { step: "Basic Registration", completed: true },
          { step: "Email Verification", completed: true },
          { step: "Professional Details", completed: false, required: true, action: "/doctor/complete-profile" },
          { step: "Document Upload", completed: false, required: true, action: "/doctor/documents" },
        ],
        profile_submitted: [
          { step: "Basic Registration", completed: true },
          { step: "Email Verification", completed: true },
          { step: "Professional Details", completed: true },
          { step: "Document Upload", completed: false, required: true, action: "/doctor/documents" },
        ],
        document_verification: [
          { step: "Basic Registration", completed: true },
          { step: "Email Verification", completed: true },
          { step: "Professional Details", completed: true },
          { step: "Document Upload", completed: true },
          { step: "Admin Verification", completed: false, required: true, action: null },
        ],
        under_review: [
          { step: "Basic Registration", completed: true },
          { step: "Email Verification", completed: true },
          { step: "Professional Details", completed: true },
          { step: "Document Upload", completed: true },
          { step: "Admin Review", completed: false, required: true, action: null },
        ],
        verified: [
          { step: "All Steps Completed", completed: true },
        ],
      };

      res.json({
        success: true,
        data: {
          verificationStatus: doctor.verificationStatus,
          profileCompletionPercentage: doctor.profileCompletionPercentage || 0,
          rejectionReason: doctor.rejectionReason,
          verifiedAt: doctor.verifiedAt,
          steps: steps[doctor.verificationStatus] || steps.pending,
          canAccessFullFeatures: doctor.verificationStatus === "verified",
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Dashboard (Status-Aware) ====================

  static async getDashboard(req, res, next) {
    try {
      const doctor = await Doctor.findOne({ user: req.user._id });

      if (!doctor) {
        throw new ApiError(404, "Doctor profile not found");
      }

      const verificationStatus = doctor.verificationStatus;
      const isVerified = verificationStatus === "verified";

      // Check if profile is complete
      const isProfileComplete = !!(doctor.specialization && doctor.consultationFee);
      const hasDocuments = !!(doctor.documents?.bmdcCertificate?.url && doctor.documents?.profilePhoto?.url);

      // For non-verified doctors, return limited dashboard with next steps
      if (!isVerified) {
        let nextAction = null;
        let nextActionLink = null;

        if (verificationStatus === "pending" && !isProfileComplete) {
          nextAction = "Complete your professional profile";
          nextActionLink = "/doctor/complete-profile";
        } else if (verificationStatus === "profile_submitted" && !hasDocuments) {
          nextAction = "Upload verification documents";
          nextActionLink = "/doctor/documents";
        } else if (verificationStatus === "document_verification" || verificationStatus === "under_review") {
          nextAction = "Waiting for admin verification";
          nextActionLink = null;
        }

        return res.json({
          success: true,
          data: {
            isVerified: false,
            verificationStatus,
            isProfileComplete,
            hasDocuments,
            nextAction,
            nextActionLink,
            steps: await DoctorController.getSteps(verificationStatus, isProfileComplete, hasDocuments),
            // Limited stats (empty or zero)
            stats: {
              totalPatients: 0,
              totalEarnings: 0,
              averageRating: 0,
              totalReviews: 0,
              todayAppointments: 0,
              pendingAppointments: 0,
              monthEarnings: 0,
            },
            upcomingAppointments: [],
            recentPatients: [],
          },
        });
      }

      // Verified doctor - full dashboard
      const result = await DoctorService.getDashboard(req.user._id);
      res.json({
        success: true,
        data: {
          isVerified: true,
          verificationStatus,
          ...result,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSteps(status, isProfileComplete, hasDocuments) {
    const steps = {
      pending: [
        { name: "Basic Registration", completed: true, icon: "CheckCircle" },
        { name: "Email Verification", completed: true, icon: "CheckCircle" },
        { name: "Professional Details", completed: isProfileComplete, icon: isProfileComplete ? "CheckCircle" : "Edit", action: "/doctor/complete-profile" },
        { name: "Document Upload", completed: false, icon: "Upload", action: "/doctor/documents" },
      ],
      profile_submitted: [
        { name: "Basic Registration", completed: true, icon: "CheckCircle" },
        { name: "Email Verification", completed: true, icon: "CheckCircle" },
        { name: "Professional Details", completed: true, icon: "CheckCircle" },
        { name: "Document Upload", completed: hasDocuments, icon: hasDocuments ? "CheckCircle" : "Upload", action: "/doctor/documents" },
      ],
      document_verification: [
        { name: "Basic Registration", completed: true, icon: "CheckCircle" },
        { name: "Email Verification", completed: true, icon: "CheckCircle" },
        { name: "Professional Details", completed: true, icon: "CheckCircle" },
        { name: "Document Upload", completed: true, icon: "CheckCircle" },
        { name: "Admin Verification", completed: false, icon: "Clock", action: null },
      ],
    };
    return steps[status] || steps.pending;
  }

  // ==================== Appointments (Verified only) ====================

  static async getAppointments(req, res, next) {
    try {
      const result = await DoctorService.getAppointments(req.user._id, req.query);
      res.json({
        success: true,
        data: {
          todayAppointments: result.todayAppointments,
          appointments: result.appointments,
        },
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAppointmentDetails(req, res, next) {
    try {
      const result = await DoctorService.getAppointmentDetails(req.user._id, req.params.appointmentId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async updateAppointmentStatus(req, res, next) {
    try {
      const result = await DoctorService.updateAppointmentStatus(
        req.user._id,
        req.params.appointmentId,
        req.body
      );
      res.json({ success: true, message: "Appointment status updated", data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getTodaySchedule(req, res, next) {
    try {
      const result = await DoctorService.getTodaySchedule(req.user._id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Patients (Verified only) ====================

  static async getPatients(req, res, next) {
    try {
      const result = await DoctorService.getPatients(req.user._id, req.query);
      res.json({ success: true, data: result.patients, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }

  static async getPatientDetails(req, res, next) {
    try {
      const result = await DoctorService.getPatientDetails(req.user._id, req.params.patientId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Reviews (Verified only) ====================

  static async getReviews(req, res, next) {
    try {
      const result = await DoctorService.getReviews(req.user._id, req.query);
      res.json({
        success: true,
        data: result.reviews,
        ratingDistribution: result.ratingDistribution,
        stats: result.stats,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  static async respondToReview(req, res, next) {
    try {
      const result = await DoctorService.respondToReview(req.user._id, req.params.reviewId, req.body);
      res.json({ success: true, message: "Response added", data: result });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Earnings (Verified only) ====================

  static async getEarnings(req, res, next) {
    try {
      const result = await DoctorService.getEarnings(req.user._id, req.query);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async requestWithdrawal(req, res, next) {
    try {
      const result = await DoctorService.requestWithdrawal(req.user._id, req.body);
      res.json({ success: true, message: result.message, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getWithdrawalHistory(req, res, next) {
    try {
      const result = await DoctorService.getWithdrawalHistory(req.user._id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // public endpoint
static async getPublicDoctors(req, res, next) {
  try {
    const { page = 1, limit = 12, search, specialization, city, sortBy } = req.query;
    const skip = (page - 1) * limit;

    let query = { verificationStatus: "verified" };

    // Search by name
    if (search) {
      const users = await User.find({
        fullName: { $regex: search, $options: "i" },
        role: "doctor"
      }).select("_id");
      query.user = { $in: users.map(u => u._id) };
    }

    // Filter by specialization
    if (specialization) {
      query.specialization = specialization;
    }

    // Filter by city
    if (city) {
      query["currentWorkplace.city"] = { $regex: city, $options: "i" };
    }

    // Sorting
    let sortOptions = {};
    switch (sortBy) {
      case "rating": sortOptions = { rating: -1 }; break;
      case "experience": sortOptions = { experienceYears: -1 }; break;
      case "fee_low": sortOptions = { consultationFee: 1 }; break;
      case "fee_high": sortOptions = { consultationFee: -1 }; break;
      default: sortOptions = { rating: -1 };
    }

    const doctors = await Doctor.find(query)
      .populate("user", "fullName email phone profileImage")
      .skip(skip)
      .limit(parseInt(limit))
      .sort(sortOptions);

    const total = await Doctor.countDocuments(query);

    res.json({
      success: true,
      data: {
        doctors,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

// Get filters for verified doctors only
static async getPublicFilters(req, res, next) {
  try {
    const doctors = await Doctor.find({ verificationStatus: "verified" });
    
    const specializations = [...new Set(doctors.map(d => d.specialization).filter(Boolean))];
    const cities = [...new Set(doctors.map(d => d.currentWorkplace?.city).filter(Boolean))];
    
    res.json({
      success: true,
      data: { specializations, cities }
    });
  } catch (error) {
    next(error);
  }
}

  static async getPublicDoctorById(req, res, next) {
    try {
      const doctor = await Doctor.findOne({ 
        _id: req.params.id,
        verificationStatus: "verified"
      }).populate("user", "fullName email phone profileImage bio");

      if (!doctor) {
        throw new ApiError(404, "Doctor not found");
      }

      // Get reviews for this doctor
      const reviews = await Review.find({ doctor: doctor._id })
        .populate({
          path: "patient",
          populate: { path: "user", select: "fullName profileImage" }
        })
        .limit(10);

      res.json({
        success: true,
        data: {
          ...doctor.toObject(),
          reviews
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPublicDoctorSlots(req, res, next) {
  try {
    const { id } = req.params;
    const { date } = req.query;

    if (!date) {
      throw new ApiError(400, "Date is required");
    }

    // Find verified doctor
    const doctor = await Doctor.findOne({ 
      _id: id,
      verificationStatus: "verified" 
    });

    if (!doctor) {
      throw new ApiError(404, "Doctor not found");
    }

    // Get day of week from date
    const selectedDate = new Date(date);
    const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    // Find schedule for that day
    const daySchedule = doctor.availableDays?.find(d => d.day === dayName);
    
    if (!daySchedule || !daySchedule.isAvailable || !daySchedule.slots?.length) {
      return res.json({
        success: true,
        data: {
          slots: [],
          message: "No available slots for this date"
        }
      });
    }

    // Get booked appointments for this doctor on this date
    const Appointment = mongoose.model("Appointment");
    const bookedAppointments = await Appointment.find({
      doctor: doctor._id,
      appointmentDate: {
        $gte: new Date(date),
        $lt: new Date(new Date(date).setDate(new Date(date).getDate() + 1))
      },
      status: { $in: ["confirmed", "pending"] }
    });

    // Get booked times
    const bookedTimes = bookedAppointments.map(apt => apt.startTime);

    // Filter available slots (not booked)
    const availableSlots = daySchedule.slots
      .filter(slot => !bookedTimes.includes(slot.startTime))
      .map(slot => ({
        time: slot.startTime,
        endTime: slot.endTime,
        type: slot.type,
        maxPatients: slot.maxPatients,
        available: true
      }));

    res.json({
      success: true,
      data: {
        doctorId: doctor._id,
        doctorName: doctor.user?.fullName,
        date: date,
        dayName: dayName,
        slots: availableSlots,
        consultationFee: doctor.consultationFee,
        consultationTypes: doctor.consultationTypes
      }
    });
  } catch (error) {
    next(error);
  }
}

}