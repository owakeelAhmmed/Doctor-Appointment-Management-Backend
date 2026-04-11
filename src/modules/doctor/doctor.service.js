import { Doctor } from "./doctor.model.js";
import { User } from "../auth/auth.model.js";
import { Appointment } from "../appointment/appointment.model.js";
import { Review } from "../review/review.model.js";
import { Payment } from "../payment/payment.model.js";
import { Patient } from "../patient/patient.model.js";
import { sendEmail } from "../../services/email.service.js";
import { sendSMS } from "../../services/sms.service.js";
import { ApiError } from "../../utils/apiError.js";
import { uploadMedia } from "../upload/media.service.js";

export class DoctorService {
  
  // ==================== Profile Management ====================

  /**
   * Get doctor profile
   */
  static async getProfile(userId) {
    const user = await User.findById(userId).select("-password -emailOTP -phoneOTP -resetPasswordToken -resetPasswordExpire");
    
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const doctor = await Doctor.findOne({ user: userId });

    if (!doctor) {
      throw new ApiError(404, "Doctor profile not found");
    }

    return {
      user,
      doctor,
    };
  }

  /**
   * Update doctor profile
   */
  static async updateProfile(userId, updateData) {
    const doctor = await Doctor.findOneAndUpdate(
      { user: userId },
      {
        specialization: updateData.specialization,
        qualifications: updateData.qualifications,
        experienceYears: updateData.experienceYears,
        currentWorkplace: updateData.currentWorkplace,
        consultationFee: updateData.consultationFee,
        consultationTypes: updateData.consultationTypes,
        bankInfo: updateData.bankInfo,
        mobileBanking: updateData.mobileBanking,
      },
      { new: true, runValidators: true }
    );

    if (!doctor) {
      throw new ApiError(404, "Doctor profile not found");
    }

    return doctor;
  }

  /**
   * Update doctor schedule
   */
  static async updateSchedule(userId, scheduleData) {
    const doctor = await Doctor.findOneAndUpdate(
      { user: userId },
      { availableDays: scheduleData.availableDays },
      { new: true, runValidators: true }
    );

    if (!doctor) {
      throw new ApiError(404, "Doctor profile not found");
    }

    return doctor.availableDays;
  }

  /**
   * Update consultation fee
   */
  static async updateFee(userId, feeData) {
    const doctor = await Doctor.findOneAndUpdate(
      { user: userId },
      { consultationFee: feeData.consultationFee },
      { new: true, runValidators: true }
    );

    if (!doctor) {
      throw new ApiError(404, "Doctor profile not found");
    }

    return {
      consultationFee: doctor.consultationFee,
    };
  }

  /**
   * Update bank information
   */
  static async updateBankInfo(userId, bankData) {
    const doctor = await Doctor.findOneAndUpdate(
      { user: userId },
      { bankInfo: bankData.bankInfo },
      { new: true, runValidators: true }
    );

    if (!doctor) {
      throw new ApiError(404, "Doctor profile not found");
    }

    return doctor.bankInfo;
  }

  /**
   * Update mobile banking information
   */
  static async updateMobileBanking(userId, mobileData) {
    const doctor = await Doctor.findOneAndUpdate(
      { user: userId },
      { mobileBanking: mobileData.mobileBanking },
      { new: true, runValidators: true }
    );

    if (!doctor) {
      throw new ApiError(404, "Doctor profile not found");
    }

    return doctor.mobileBanking;
  }

  /**
   * Upload documents
   */
  static async uploadDocuments(userId, files) {
    const doctor = await Doctor.findOne({ user: userId });
    
    if (!doctor) {
      throw new ApiError(404, "Doctor profile not found");
    }

    const updateFields = {};
    
    if (files) {
      for (const [key, fileArray] of Object.entries(files)) {
        if (fileArray && fileArray[0]) {
          const file = fileArray[0];
          const uploaded = await uploadMedia({
            buffer: file.buffer,
            originalFilename: file.originalname,
            ownerType: "doctors",
            ownerId: userId,
            folder: "verification-documents",
            tags: ["doctor", "verification", key],
          });
          
          updateFields[`documents.${key}`] = {
            url: uploaded.url,
            public_id: uploaded.public_id,
            verified: false,
            uploadedAt: new Date(),
          };
        }
      }
    }

    const updatedDoctor = await Doctor.findOneAndUpdate(
      { user: userId },
      { $set: updateFields },
      { new: true, runValidators: false }
    );

    return updatedDoctor.documents;
  }

  // ==================== Appointment Management ====================

  /**
   * Get doctor's appointments
   */
  static async getAppointments(userId, filters) {
    const doctor = await Doctor.findOne({ user: userId });
    
    if (!doctor) {
      throw new ApiError(404, "Doctor profile not found");
    }

    const { status, fromDate, toDate, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const query = { doctor: doctor._id };

    if (status && status !== "all") {
      query.status = status;
    }

    if (fromDate || toDate) {
      query.appointmentDate = {};
      if (fromDate) query.appointmentDate.$gte = new Date(fromDate);
      if (toDate) query.appointmentDate.$lte = new Date(toDate);
    }

    const appointments = await Appointment.find(query)
      .populate({
        path: "patient",
        populate: {
          path: "user",
          select: "fullName phone email profileImage dateOfBirth gender",
        },
      })
      .populate("payment")
      .populate("prescription")
      .skip(skip)
      .limit(limit)
      .sort({ appointmentDate: -1, startTime: -1 });

    const total = await Appointment.countDocuments(query);

    // Get today's appointments separately
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAppointments = await Appointment.find({
      doctor: doctor._id,
      appointmentDate: { $gte: today, $lt: tomorrow },
      status: { $in: ["confirmed", "pending"] },
    })
      .populate({
        path: "patient",
        populate: {
          path: "user",
          select: "fullName phone profileImage",
        },
      })
      .sort({ startTime: 1 });

    return {
      todayAppointments,
      appointments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single appointment details
   */
  static async getAppointmentDetails(userId, appointmentId) {
    const doctor = await Doctor.findOne({ user: userId });
    
    if (!doctor) {
      throw new ApiError(404, "Doctor profile not found");
    }

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      doctor: doctor._id,
    })
      .populate({
        path: "patient",
        populate: {
          path: "user",
          select: "fullName email phone profileImage dateOfBirth gender address",
        },
      })
      .populate({
        path: "patient",
        populate: {
          path: "medications",
        },
      })
      .populate("payment")
      .populate("prescription");

    if (!appointment) {
      throw new ApiError(404, "Appointment not found");
    }

    // Get patient's medical history
    const patient = await Patient.findById(appointment.patient._id);

    return {
      appointment,
      patientMedicalHistory: {
        allergies: patient?.allergies || [],
        chronicDiseases: patient?.chronicDiseases || [],
        medicalHistory: patient?.medicalHistory || [],
        medications: patient?.medications || [],
        bloodGroup: patient?.bloodGroup,
      },
    };
  }

  /**
   * Update appointment status
   */
  static async updateAppointmentStatus(userId, appointmentId, statusData) {
    const doctor = await Doctor.findOne({ user: userId });
    
    if (!doctor) {
      throw new ApiError(404, "Doctor profile not found");
    }

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      doctor: doctor._id,
    });

    if (!appointment) {
      throw new ApiError(404, "Appointment not found");
    }

    const { status, notes } = statusData;

    // Validate status transition
    const validTransitions = {
      pending: ["confirmed", "cancelled"],
      confirmed: ["completed", "cancelled", "no-show"],
      completed: [],
      cancelled: [],
      "no-show": [],
    };

    if (!validTransitions[appointment.status]?.includes(status)) {
      throw new ApiError(400, `Cannot change status from ${appointment.status} to ${status}`);
    }

    appointment.status = status;
    if (notes) appointment.notes = notes;
    
    if (status === "completed") {
      appointment.completedAt = new Date();
      
      // Update doctor's patient count
      doctor.totalPatients += 1;
      await doctor.save();

      // Update patient's total spent
      const patient = await Patient.findById(appointment.patient);
      if (patient) {
        patient.totalSpent += appointment.fee;
        patient.lastVisit = new Date();
        await patient.save();
      }
    }

    await appointment.save();

    // Send notification to patient
    const patientUser = await User.findById(appointment.patient.user);
    
    await sendSMS({
      to: patientUser.phone,
      message: `Your appointment status has been updated to ${status}`,
    });

    return appointment;
  }

  /**
   * Get today's schedule
   */
  static async getTodaySchedule(userId) {
    const doctor = await Doctor.findOne({ user: userId });
    
    if (!doctor) {
      throw new ApiError(404, "Doctor profile not found");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointments = await Appointment.find({
      doctor: doctor._id,
      appointmentDate: { $gte: today, $lt: tomorrow },
      status: { $in: ["confirmed", "pending"] },
    })
      .populate({
        path: "patient",
        populate: {
          path: "user",
          select: "fullName phone profileImage age",
        },
      })
      .sort({ startTime: 1 });

    // Get day's schedule from doctor's availableDays
    const dayName = today.toLocaleDateString("en-US", { weekday: "lowercase" });
    const daySchedule = doctor.availableDays.find(d => d.day === dayName);

    return {
      date: today,
      daySchedule: daySchedule || { day: dayName, slots: [], isAvailable: false },
      appointments,
      totalPatients: appointments.length,
      completed: appointments.filter(a => a.status === "completed").length,
      pending: appointments.filter(a => a.status === "pending").length,
      noShow: appointments.filter(a => a.status === "no-show").length,
    };
  }

  // ==================== Patients Management ====================

  /**
   * Get doctor's patients
   */
  static async getPatients(userId, filters) {
    const doctor = await Doctor.findOne({ user: userId });
    
    if (!doctor) {
      throw new ApiError(404, "Doctor profile not found");
    }

    const { search, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    // Get unique patients who have appointments with this doctor
    const appointments = await Appointment.find({ 
      doctor: doctor._id,
      status: "completed",
    }).distinct("patient");

    let query = { _id: { $in: appointments } };

    // Search by patient name
    if (search) {
      const users = await User.find({
        fullName: { $regex: search, $options: "i" },
        role: "patient",
      }).select("_id");
      
      const patientIds = await Patient.find({
        user: { $in: users.map(u => u._id) },
      }).select("_id");
      
      query._id.$in = patientIds.map(p => p._id);
    }

    const patients = await Patient.find(query)
      .populate("user", "fullName phone email profileImage dateOfBirth gender")
      .skip(skip)
      .limit(limit)
      .sort({ lastVisit: -1 });

    // Get visit count for each patient
    const patientsWithStats = await Promise.all(
      patients.map(async (patient) => {
        const visitCount = await Appointment.countDocuments({
          doctor: doctor._id,
          patient: patient._id,
          status: "completed",
        });

        const lastVisit = await Appointment.findOne({
          doctor: doctor._id,
          patient: patient._id,
          status: "completed",
        }).sort({ appointmentDate: -1 });

        return {
          ...patient.toObject(),
          visitCount,
          lastVisitDate: lastVisit?.appointmentDate,
        };
      })
    );

    const total = await Patient.countDocuments(query);

    return {
      patients: patientsWithStats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single patient details
   */
  static async getPatientDetails(userId, patientId) {
    const doctor = await Doctor.findOne({ user: userId });
    
    if (!doctor) {
      throw new ApiError(404, "Doctor profile not found");
    }

    const patient = await Patient.findById(patientId)
      .populate("user", "fullName email phone profileImage dateOfBirth gender address");

    if (!patient) {
      throw new ApiError(404, "Patient not found");
    }

    // Get all appointments with this doctor
    const appointments = await Appointment.find({
      doctor: doctor._id,
      patient: patientId,
    })
      .populate("prescription")
      .sort({ appointmentDate: -1, startTime: -1 });

    // Get all prescriptions
    const prescriptions = appointments
      .filter(a => a.prescription)
      .map(a => a.prescription);

    return {
      patient,
      appointments,
      prescriptions,
      stats: {
        totalVisits: appointments.length,
        lastVisit: appointments[0]?.appointmentDate,
        totalSpent: appointments.reduce((sum, a) => sum + (a.fee || 0), 0),
      },
    };
  }

  // ==================== Reviews Management ====================

  /**
   * Get doctor's reviews
   */
  static async getReviews(userId, filters) {
    const doctor = await Doctor.findOne({ user: userId });
    
    if (!doctor) {
      throw new ApiError(404, "Doctor profile not found");
    }

    const { page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const reviews = await Review.find({ doctor: doctor._id })
      .populate({
        path: "patient",
        populate: {
          path: "user",
          select: "fullName profileImage",
        },
      })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Review.countDocuments({ doctor: doctor._id });

    // Calculate rating distribution
    const ratingDistribution = await Review.aggregate([
      { $match: { doctor: doctor._id } },
      { $group: { _id: "$rating", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const distribution = {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0,
    };
    
    ratingDistribution.forEach(item => {
      distribution[item._id] = item.count;
    });

    return {
      reviews,
      ratingDistribution,
      stats: {
        average: doctor.rating,
        total: doctor.totalReviews,
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
   * Respond to review
   */
  static async respondToReview(userId, reviewId, responseData) {
    const doctor = await Doctor.findOne({ user: userId });
    
    if (!doctor) {
      throw new ApiError(404, "Doctor profile not found");
    }

    const review = await Review.findOne({
      _id: reviewId,
      doctor: doctor._id,
    });

    if (!review) {
      throw new ApiError(404, "Review not found");
    }

    review.doctorResponse = {
      comment: responseData.comment,
      respondedAt: new Date(),
    };

    await review.save();

    return review;
  }

  // ==================== Earnings & Withdrawals ====================

  /**
   * Get earnings summary
   */
  static async getEarnings(userId, filters) {
    const doctor = await Doctor.findOne({ user: userId });
    
    if (!doctor) {
      throw new ApiError(404, "Doctor profile not found");
    }

    const { fromDate, toDate, groupBy = "day" } = filters;

    const dateFilter = {};
    if (fromDate || toDate) {
      dateFilter.createdAt = {};
      if (fromDate) dateFilter.createdAt.$gte = new Date(fromDate);
      if (toDate) dateFilter.createdAt.$lte = new Date(toDate);
    }

    // Get completed payments
    const payments = await Payment.find({
      doctor: doctor._id,
      status: "completed",
      ...dateFilter,
    });

    // Calculate totals
    const totalEarnings = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalPlatformFee = payments.reduce((sum, p) => sum + (p.platformFee || 0), 0);
    const totalDoctorAmount = payments.reduce((sum, p) => sum + (p.doctorAmount || p.amount), 0);

    // Group by time period
    let groupedData = [];
    
    if (groupBy === "day") {
      const grouped = {};
      payments.forEach(p => {
        const date = p.createdAt.toISOString().split("T")[0];
        if (!grouped[date]) {
          grouped[date] = {
            date,
            earnings: 0,
            count: 0,
          };
        }
        grouped[date].earnings += p.amount;
        grouped[date].count += 1;
      });
      groupedData = Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
    } else if (groupBy === "month") {
      const grouped = {};
      payments.forEach(p => {
        const month = p.createdAt.toISOString().slice(0, 7);
        if (!grouped[month]) {
          grouped[month] = {
            month,
            earnings: 0,
            count: 0,
          };
        }
        grouped[month].earnings += p.amount;
        grouped[month].count += 1;
      });
      groupedData = Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month));
    }

    return {
      summary: {
        totalEarnings,
        totalPlatformFee,
        totalDoctorAmount,
        pendingWithdrawal: doctor.pendingWithdrawal,
        availableForWithdrawal: totalDoctorAmount - doctor.pendingWithdrawal,
        totalTransactions: payments.length,
      },
      groupedData,
      payments: payments.slice(0, 20), // Last 20 payments
    };
  }

  /**
   * Request withdrawal
   */
  static async requestWithdrawal(userId, withdrawalData) {
    const doctor = await Doctor.findOne({ user: userId });
    
    if (!doctor) {
      throw new ApiError(404, "Doctor profile not found");
    }

    const { amount, paymentMethod } = withdrawalData;

    // Check if enough balance
    const availableBalance = doctor.totalEarnings - doctor.pendingWithdrawal;
    
    if (amount > availableBalance) {
      throw new ApiError(400, "Insufficient balance");
    }

    // Create withdrawal request (you might want to create a separate model for this)
    const withdrawalRequest = {
      doctor: doctor._id,
      amount,
      paymentMethod,
      status: "pending",
      requestedAt: new Date(),
      // Add payment details based on method
      ...(paymentMethod === "bank" && { bankInfo: doctor.bankInfo }),
      ...(paymentMethod === "bKash" && { bKashNumber: doctor.mobileBanking?.bKash }),
      ...(paymentMethod === "nagad" && { nagadNumber: doctor.mobileBanking?.nagad }),
    };

    // Update pending withdrawal
    doctor.pendingWithdrawal += amount;
    await doctor.save();

    // TODO: Save withdrawal request to database
    // await Withdrawal.create(withdrawalRequest);

    // Notify admin
    // ...

    return {
      message: "Withdrawal request submitted successfully",
      amount,
      paymentMethod,
      status: "pending",
      expectedSettlement: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
    };
  }

  /**
   * Get withdrawal history
   */
  static async getWithdrawalHistory(userId) {
    const doctor = await Doctor.findOne({ user: userId });
    
    if (!doctor) {
      throw new ApiError(404, "Doctor profile not found");
    }

    // TODO: Get from Withdrawal model
    // const withdrawals = await Withdrawal.find({ doctor: doctor._id }).sort({ createdAt: -1 });

    return {
      pending: doctor.pendingWithdrawal,
      totalWithdrawn: doctor.totalEarnings - doctor.pendingWithdrawal,
      // withdrawals,
    };
  }

  // ==================== Dashboard ====================

  /**
   * Get doctor dashboard
   */
  static async getDashboard(userId) {
    const doctor = await Doctor.findOne({ user: userId });
    
    if (!doctor) {
      throw new ApiError(404, "Doctor profile not found");
    }

    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Today's appointments
    const todayAppointments = await Appointment.find({
      doctor: doctor._id,
      appointmentDate: { $gte: today, $lt: tomorrow },
      status: { $in: ["confirmed", "pending"] },
    }).countDocuments();

    // Today's completed
    const todayCompleted = await Appointment.countDocuments({
      doctor: doctor._id,
      appointmentDate: { $gte: today, $lt: tomorrow },
      status: "completed",
    });

    // Pending appointments
    const pendingAppointments = await Appointment.countDocuments({
      doctor: doctor._id,
      status: "pending",
    });

    // This month's earnings
    const monthPayments = await Payment.find({
      doctor: doctor._id,
      status: "completed",
      createdAt: { $gte: startOfMonth },
    });

    const monthEarnings = monthPayments.reduce((sum, p) => sum + p.amount, 0);

    // This year's earnings
    const yearPayments = await Payment.find({
      doctor: doctor._id,
      status: "completed",
      createdAt: { $gte: startOfYear },
    });

    const yearEarnings = yearPayments.reduce((sum, p) => sum + p.amount, 0);

    // Upcoming appointments (next 7 days)
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const upcomingAppointments = await Appointment.find({
      doctor: doctor._id,
      appointmentDate: { $gte: today, $lte: nextWeek },
      status: { $in: ["confirmed", "pending"] },
    })
      .populate({
        path: "patient",
        populate: {
          path: "user",
          select: "fullName phone profileImage",
        },
      })
      .sort({ appointmentDate: 1, startTime: 1 })
      .limit(10);

    // Recent patients
    const recentPatients = await Appointment.find({
      doctor: doctor._id,
      status: "completed",
    })
      .populate({
        path: "patient",
        populate: {
          path: "user",
          select: "fullName profileImage",
        },
      })
      .sort({ appointmentDate: -1 })
      .limit(5);

    return {
      stats: {
        totalPatients: doctor.totalPatients,
        totalEarnings: doctor.totalEarnings,
        averageRating: doctor.rating,
        totalReviews: doctor.totalReviews,
        todayAppointments,
        todayCompleted,
        pendingAppointments,
        monthEarnings,
        yearEarnings,
        completionRate: doctor.totalPatients > 0 
          ? Math.round((todayCompleted / todayAppointments) * 100) 
          : 0,
      },
      upcomingAppointments,
      recentPatients,
      verificationStatus: doctor.verificationStatus,
      schedule: doctor.availableDays,
    };
  }
}