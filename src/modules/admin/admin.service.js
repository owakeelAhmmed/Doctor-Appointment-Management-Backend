import { User } from "../auth/auth.model.js";
import { Doctor } from "../doctor/doctor.model.js";
import { Patient } from "../patient/patient.model.js";
import { Appointment } from "../appointment/appointment.model.js";
import { Payment } from "../payment/payment.model.js";
import { Review } from "../review/review.model.js";
import { Media } from "../upload/media.model.js";
import { sendEmail } from "../../services/email.service.js";
import { sendSMS } from "../../services/sms.service.js";
import { ApiError } from "../../utils/apiError.js";

export class AdminService {

  // ==================== Dashboard & Analytics ====================

  /**
   * Get admin dashboard stats
   */
  static async getDashboard() {
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // User stats
    const [
      totalUsers,
      totalPatients,
      totalDoctors,
      totalAdmins,
      pendingDoctors,
      newUsersToday,
      activeUsersToday,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "patient" }),
      User.countDocuments({ role: "doctor" }),
      User.countDocuments({ role: { $in: ["admin", "superadmin"] } }),
      Doctor.countDocuments({ verificationStatus: "pending" }),
      User.countDocuments({ createdAt: { $gte: today } }),
      User.countDocuments({ lastLogin: { $gte: today } }),
    ]);

    // Appointment stats
    const [
      totalAppointments,
      todayAppointments,
      completedAppointments,
      cancelledAppointments,
      upcomingAppointments,
    ] = await Promise.all([
      Appointment.countDocuments(),
      Appointment.countDocuments({
        appointmentDate: { $gte: today },
        status: { $in: ["confirmed", "pending"] },
      }),
      Appointment.countDocuments({ status: "completed" }),
      Appointment.countDocuments({ status: "cancelled" }),
      Appointment.countDocuments({
        appointmentDate: { $gte: today },
        status: { $in: ["confirmed", "pending"] },
      }),
    ]);

    // Payment stats
    const [
      totalRevenue,
      todayRevenue,
      monthRevenue,
      pendingWithdrawals,
    ] = await Promise.all([
      Payment.aggregate([
        { $match: { status: "completed" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Payment.aggregate([
        {
          $match: {
            status: "completed",
            createdAt: { $gte: today },
          }
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Payment.aggregate([
        {
          $match: {
            status: "completed",
            createdAt: { $gte: startOfMonth },
          }
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Doctor.aggregate([
        { $group: { _id: null, total: { $sum: "$pendingWithdrawal" } } },
      ]),
    ]);

    // Review stats
    const averageRating = await Review.aggregate([
      { $group: { _id: null, avg: { $avg: "$rating" } } },
    ]);

    return {
      users: {
        total: totalUsers,
        patients: totalPatients,
        doctors: totalDoctors,
        admins: totalAdmins,
        newToday: newUsersToday,
        activeToday: activeUsersToday,
        pendingVerification: pendingDoctors,
      },
      appointments: {
        total: totalAppointments,
        today: todayAppointments,
        completed: completedAppointments,
        cancelled: cancelledAppointments,
        upcoming: upcomingAppointments,
        completionRate: totalAppointments > 0
          ? Math.round((completedAppointments / totalAppointments) * 100)
          : 0,
      },
      revenue: {
        total: totalRevenue[0]?.total || 0,
        today: todayRevenue[0]?.total || 0,
        thisMonth: monthRevenue[0]?.total || 0,
        pendingWithdrawals: pendingWithdrawals[0]?.total || 0,
      },
      reviews: {
        average: averageRating[0]?.avg || 0,
        total: await Review.countDocuments(),
      },
      system: {
        totalMedia: await Media.countDocuments(),
        totalStorage: await this.getTotalStorage(),
      },
    };
  }

  /**
   * Get total storage used
   */
  static async getTotalStorage() {
    const media = await Media.find();
    return media.reduce((sum, m) => sum + (m.bytes || 0), 0);
  }

  /**
   * Get revenue analytics
   */
  static async getRevenueAnalytics(filters) {
    const { fromDate, toDate, groupBy = "day" } = filters;

    const match = { status: "completed" };

    if (fromDate || toDate) {
      match.createdAt = {};
      if (fromDate) match.createdAt.$gte = new Date(fromDate);
      if (toDate) match.createdAt.$lte = new Date(toDate);
    }

    let groupId;
    switch (groupBy) {
      case "day":
        groupId = {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
        };
        break;
      case "month":
        groupId = {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        };
        break;
      case "year":
        groupId = { year: { $year: "$createdAt" } };
        break;
    }

    const revenueByPeriod = await Payment.aggregate([
      { $match: match },
      {
        $group: {
          _id: groupId,
          total: { $sum: "$amount" },
          platformFee: { $sum: "$platformFee" },
          doctorAmount: { $sum: "$doctorAmount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    const byPaymentMethod = await Payment.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$paymentMethod",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    return {
      revenueByPeriod,
      byPaymentMethod,
      summary: {
        total: revenueByPeriod.reduce((sum, r) => sum + r.total, 0),
        platformFee: revenueByPeriod.reduce((sum, r) => sum + r.platformFee, 0),
        doctorPayout: revenueByPeriod.reduce((sum, r) => sum + r.doctorAmount, 0),
        transactions: revenueByPeriod.reduce((sum, r) => sum + r.count, 0),
      },
    };
  }

  // ==================== User Management ====================

  /**
   * Get all users with filters
   */
  static async getUsers(filters, pagination) {
    const { role, status, search } = filters;
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const query = {};

    if (role && role !== "all") {
      query.role = role;
    }

    if (status) {
      if (status === "active") query.isActive = true;
      if (status === "inactive") query.isActive = false;
      if (status === "pending") query.isEmailVerified = false;
    }

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(query)
      .select("-password -emailOTP -phoneOTP -resetPasswordToken -resetPasswordExpire")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    // Get additional info for doctors
    const usersWithDetails = await Promise.all(
      users.map(async (user) => {
        if (user.role === "doctor") {
          const doctor = await Doctor.findOne({ user: user._id });
          return {
            ...user.toObject(),
            doctorInfo: {
              verificationStatus: doctor?.verificationStatus,
              specialization: doctor?.specialization,
              consultationFee: doctor?.consultationFee,
              rating: doctor?.rating,
            },
          };
        }
        return user;
      })
    );

    return {
      users: usersWithDetails,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single user details
   */
  static async getUserDetails(userId) {
    const user = await User.findById(userId)
      .select("-password -emailOTP -phoneOTP -resetPasswordToken -resetPasswordExpire");

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    let profile = null;
    let stats = {};

    if (user.role === "doctor") {
      profile = await Doctor.findOne({ user: userId });

      // Get doctor stats
      const [totalAppointments, totalPatients, totalEarnings] = await Promise.all([
        Appointment.countDocuments({ doctor: profile?._id }),
        Appointment.distinct("patient", { doctor: profile?._id }).then(p => p.length),
        Payment.aggregate([
          { $match: { doctor: profile?._id, status: "completed" } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
      ]);

      stats = {
        totalAppointments,
        totalPatients,
        totalEarnings: totalEarnings[0]?.total || 0,
      };
    } else if (user.role === "patient") {
      profile = await Patient.findOne({ user: userId });

      // Get patient stats
      const [totalAppointments, totalSpent] = await Promise.all([
        Appointment.countDocuments({ patient: profile?._id }),
        Payment.aggregate([
          { $match: { patient: profile?._id, status: "completed" } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
      ]);

      stats = {
        totalAppointments,
        totalSpent: totalSpent[0]?.total || 0,
      };
    }

    return {
      user,
      profile,
      stats,
    };
  }

  /**
   * Update user status (activate/deactivate)
   */
  static async updateUserStatus(userId, statusData) {
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    user.isActive = statusData.isActive;
    await user.save();

    // Send notification
    await sendEmail({
      to: user.email,
      subject: statusData.isActive ? "Account Activated" : "Account Deactivated",
      template: "account-status",
      data: {
        name: user.fullName,
        status: statusData.isActive ? "activated" : "deactivated",
        reason: statusData.reason,
      },
    });

    await sendSMS({
      to: user.phone,
      message: `Your account has been ${statusData.isActive ? "activated" : "deactivated"}. ${statusData.reason ? `Reason: ${statusData.reason}` : ""
        }`,
    });

    return {
      userId: user._id,
      isActive: user.isActive,
    };
  }

  /**
   * Update user role
   */
  static async updateUserRole(userId, roleData) {
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const oldRole = user.role;
    user.role = roleData.role;
    await user.save();

    // Create appropriate profile if needed
    if (roleData.role === "doctor" && oldRole !== "doctor") {
      await Doctor.create({ user: userId });
    } else if (roleData.role === "patient" && oldRole !== "patient") {
      await Patient.create({ user: userId });
    }

    // Log the change
    console.log(`User role changed from ${oldRole} to ${roleData.role} by admin`);

    return {
      userId: user._id,
      oldRole,
      newRole: user.role,
    };
  }

  /**
   * Delete user (soft delete)
   */
  static async deleteUser(userId) {
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Soft delete - just deactivate
    user.isActive = false;
    user.email = `${user.email}.deleted.${Date.now()}`;
    user.phone = `${user.phone}.deleted`;
    await user.save();

    return { message: "User deleted successfully" };
  }

  // ==================== Doctor Verification ====================

  /**
   * Get doctors for verification
   */
  static async getDoctorsForVerification(filters, pagination) {
    const { verificationStatus, specialization, search } = filters;
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const query = {};

    if (verificationStatus && verificationStatus !== "all") {
      query.verificationStatus = verificationStatus;
    }

    if (specialization) {
      query.specialization = { $regex: specialization, $options: "i" };
    }

    if (search) {
      const users = await User.find({
        fullName: { $regex: search, $options: "i" },
        role: "doctor",
      }).select("_id");

      query.user = { $in: users.map(u => u._id) };
    }

    const doctors = await Doctor.find(query)
      .populate("user", "fullName email phone profileImage createdAt")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: 1 });

    const total = await Doctor.countDocuments(query);

    return {
      doctors,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Verify doctor
   */
  static async verifyDoctor(doctorId, verificationData) {
    const doctor = await Doctor.findById(doctorId).populate("user");

    if (!doctor) {
      throw new ApiError(404, "Doctor not found");
    }

    const { status, notes, commissionRate } = verificationData;

    doctor.verificationStatus = status;
    doctor.verificationNotes = notes;
    doctor.verifiedBy = verificationData.adminId;
    doctor.verifiedAt = new Date();

    if (commissionRate !== undefined) {
      doctor.commissionRate = commissionRate;
    }

    await doctor.save();

    // Send notification to doctor
    const subject = status === "verified"
      ? "Doctor Verification Approved"
      : "Doctor Verification Update";

    await sendEmail({
      to: doctor.user.email,
      subject,
      template: "doctor-verification",
      data: {
        name: doctor.user.fullName,
        status,
        notes,
        commissionRate,
      },
    });

    await sendSMS({
      to: doctor.user.phone,
      message: `Your doctor verification status has been updated to ${status}. ${notes ? `Notes: ${notes}` : ""
        }`,
    });

    return doctor;
  }

  /**
   * Verify doctor document
   */
  static async verifyDocument(doctorId, documentType, verificationData) {
    const doctor = await Doctor.findById(doctorId).populate("user");

    if (!doctor) {
      throw new ApiError(404, "Doctor not found");
    }

    if (!doctor.documents[documentType]) {
      throw new ApiError(404, "Document not found");
    }

    doctor.documents[documentType].verified = verificationData.verified;

    if (verificationData.notes) {
      doctor.documents[documentType].verificationNotes = verificationData.notes;
    }

    await doctor.save();

    // Check if all documents are verified
    const allDocuments = Object.values(doctor.documents);
    const allVerified = allDocuments.every(doc => doc.verified === true);

    if (allVerified && doctor.verificationStatus === "pending") {
      doctor.verificationStatus = "under_review";
      await doctor.save();
    }

    return {
      documentType,
      verified: doctor.documents[documentType].verified,
      allVerified,
    };
  }

  /**
   * Get doctor verification details
   */
  static async getVerificationDetails(doctorId) {
    const doctor = await Doctor.findById(doctorId)
      .populate("user", "fullName email phone profileImage createdAt")
      .populate("verifiedBy", "fullName email");

    if (!doctor) {
      throw new ApiError(404, "Doctor not found");
    }

    // Get document URLs from media collection
    const documents = {};

    for (const [key, doc] of Object.entries(doctor.documents)) {
      if (doc.public_id) {
        const media = await Media.findOne({ public_id: doc.public_id });
        documents[key] = {
          ...doc.toObject(),
          url: media?.url || doc.url,
          uploadedAt: media?.createdAt,
        };
      } else {
        documents[key] = doc;
      }
    }

    return {
      doctorInfo: {
        id: doctor._id,
        name: doctor.user.fullName,
        email: doctor.user.email,
        phone: doctor.user.phone,
        registeredAt: doctor.user.createdAt,
      },
      professionalInfo: {
        bmdcRegNo: doctor.bmdcRegNo,
        specialization: doctor.specialization,
        qualifications: doctor.qualifications,
        experienceYears: doctor.experienceYears,
        currentWorkplace: doctor.currentWorkplace,
      },
      documents,
      verificationStatus: doctor.verificationStatus,
      verificationNotes: doctor.verificationNotes,
      verifiedBy: doctor.verifiedBy,
      verifiedAt: doctor.verifiedAt,
      commissionRate: doctor.commissionRate,
    };
  }

  // ==================== Appointment Management ====================

  /**
   * Get all appointments with filters
   */
  static async getAllAppointments(filters, pagination) {
    const { status, fromDate, toDate, doctorId, patientId } = filters;
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const query = {};

    if (status && status !== "all") {
      query.status = status;
    }

    if (fromDate || toDate) {
      query.appointmentDate = {};
      if (fromDate) query.appointmentDate.$gte = new Date(fromDate);
      if (toDate) query.appointmentDate.$lte = new Date(toDate);
    }

    if (doctorId) {
      query.doctor = doctorId;
    }

    if (patientId) {
      query.patient = patientId;
    }

    const appointments = await Appointment.find(query)
      .populate({
        path: "doctor",
        populate: {
          path: "user",
          select: "fullName email phone",
        },
      })
      .populate({
        path: "patient",
        populate: {
          path: "user",
          select: "fullName email phone",
        },
      })
      .populate("payment")
      .populate("prescription")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Appointment.countDocuments(query);

    return {
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
   * Update appointment (admin override)
   */
  static async updateAppointment(appointmentId, updateData) {
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      throw new ApiError(404, "Appointment not found");
    }

    if (updateData.status) {
      appointment.status = updateData.status;
    }

    if (updateData.notes) {
      appointment.notes = updateData.notes;
    }

    await appointment.save();

    return appointment;
  }

  // ==================== Payment Management ====================

  /**
   * Get all payments with filters
   */
  static async getAllPayments(filters, pagination) {
    const { status, fromDate, toDate, paymentMethod } = filters;
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const query = {};

    if (status && status !== "all") {
      query.status = status;
    }

    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }

    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) query.createdAt.$lte = new Date(toDate);
    }

    const payments = await Payment.find(query)
      .populate({
        path: "doctor",
        populate: {
          path: "user",
          select: "fullName",
        },
      })
      .populate({
        path: "patient",
        populate: {
          path: "user",
          select: "fullName",
        },
      })
      .populate("appointment")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Payment.countDocuments(query);

    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update payment status
   */
  static async updatePayment(paymentId, updateData) {
    const payment = await Payment.findById(paymentId);

    if (!payment) {
      throw new ApiError(404, "Payment not found");
    }

    if (updateData.status) {
      payment.status = updateData.status;
    }

    if (updateData.transactionId) {
      payment.transactionId = updateData.transactionId;
    }

    await payment.save();

    return payment;
  }

  /**
   * Process withdrawal requests
   */
  static async processWithdrawal(withdrawalId, processData) {
    // This would interact with a Withdrawal model
    // For now, we'll just update doctor's pendingWithdrawal

    const { doctorId, amount, status, notes, transactionId } = processData;

    const doctor = await Doctor.findById(doctorId);

    if (!doctor) {
      throw new ApiError(404, "Doctor not found");
    }

    if (status === "approved" || status === "processed") {
      doctor.pendingWithdrawal -= amount;
      await doctor.save();
    }

    // Send notification to doctor
    const doctorUser = await User.findById(doctor.user);

    await sendSMS({
      to: doctorUser.phone,
      message: `Your withdrawal request of ${amount} BDT has been ${status}. ${transactionId ? `Transaction ID: ${transactionId}` : ""
        }`,
    });

    return {
      withdrawalId,
      status,
      amount,
      transactionId,
      processedAt: new Date(),
    };
  }

  // ==================== Commission Management ====================

  /**
   * Update doctor commission
   */
  static async updateDoctorCommission(doctorId, commissionData) {
    const doctor = await Doctor.findById(doctorId).populate("user");

    if (!doctor) {
      throw new ApiError(404, "Doctor not found");
    }

    const oldRate = doctor.commissionRate;
    doctor.commissionRate = commissionData.commissionRate;

    if (commissionData.effectiveFrom) {
      doctor.commissionEffectiveFrom = commissionData.effectiveFrom;
    }

    await doctor.save();

    // Send notification
    await sendEmail({
      to: doctor.user.email,
      subject: "Commission Rate Updated",
      template: "commission-update",
      data: {
        name: doctor.user.fullName,
        oldRate,
        newRate: commissionData.commissionRate,
        effectiveFrom: commissionData.effectiveFrom || "immediately",
      },
    });

    return {
      doctorId,
      oldRate,
      newRate: doctor.commissionRate,
    };
  }

  /**
   * Bulk update commission
   */
  static async bulkUpdateCommission(updateData) {
    const { specialization, commissionRate, applyToAll } = updateData;

    let query = {};

    if (!applyToAll && specialization) {
      query.specialization = specialization;
    }

    const result = await Doctor.updateMany(query, {
      commissionRate,
    });

    return {
      modifiedCount: result.modifiedCount,
      commissionRate,
      filter: applyToAll ? "all doctors" : `specialization: ${specialization}`,
    };
  }

  /**
   * Get commission report
   */
  static async getCommissionReport(filters) {
    const { fromDate, toDate } = filters;

    const match = { status: "completed" };

    if (fromDate || toDate) {
      match.createdAt = {};
      if (fromDate) match.createdAt.$gte = new Date(fromDate);
      if (toDate) match.createdAt.$lte = new Date(toDate);
    }

    const commissionByDoctor = await Payment.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$doctor",
          totalAmount: { $sum: "$amount" },
          platformFee: { $sum: "$platformFee" },
          doctorAmount: { $sum: "$doctorAmount" },
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "doctors",
          localField: "_id",
          foreignField: "_id",
          as: "doctor",
        },
      },
      { $unwind: "$doctor" },
      {
        $lookup: {
          from: "users",
          localField: "doctor.user",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          doctorName: "$user.fullName",
          specialization: "$doctor.specialization",
          totalAmount: 1,
          platformFee: 1,
          doctorAmount: 1,
          count: 1,
          commissionRate: "$doctor.commissionRate",
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);

    const totalCommission = commissionByDoctor.reduce(
      (sum, d) => sum + d.platformFee,
      0
    );

    return {
      commissionByDoctor,
      summary: {
        totalCommission,
        totalTransactions: commissionByDoctor.reduce((sum, d) => sum + d.count, 0),
        averageCommissionRate: commissionByDoctor.reduce(
          (sum, d) => sum + d.commissionRate,
          0
        ) / (commissionByDoctor.length || 1),
      },
    };
  }

  // ==================== System Settings ====================

  /**
   * Get system settings
   */
  static async getSettings() {
    // This would typically come from a Settings model
    // For now, return default settings
    return {
      commission: {
        default: 20,
        specializations: {
          cardiology: 18,
          neurology: 18,
          general: 20,
        },
      },
      appointment: {
        cancellationPolicy: {
          hours: [24, 12, 6],
          refundPercentage: [100, 50, 25],
        },
        maxAdvanceBooking: 30, // days
        minAdvanceBooking: 1, // hours
        slotDuration: 30, // minutes
      },
      payment: {
        methods: ["bKash", "Nagad", "card", "cash"],
        gatewayCharge: 1.5, // percentage
        settlementCycle: "weekly", // daily, weekly, monthly
      },
      notification: {
        email: true,
        sms: true,
        push: true,
        reminderHours: 24,
      },
      verification: {
        autoVerify: false,
        requiredDocuments: [
          "bmdcCertificate",
          "nid",
          "mbbsCertificate",
          "profilePhoto",
        ],
      },
    };
  }

  /**
   * Update system settings
   */
  static async updateSettings(settingsData) {
    // This would update a Settings model
    // For now, just return the data
    return {
      ...settingsData,
      updatedAt: new Date(),
      updatedBy: "admin",
    };
  }

  // ==================== Reports ====================

  /**
   * Generate doctor performance report
   */
  static async getDoctorPerformanceReport(doctorId, filters) {
    const { fromDate, toDate } = filters;

    const doctor = await Doctor.findById(doctorId).populate("user");

    if (!doctor) {
      throw new ApiError(404, "Doctor not found");
    }

    const dateMatch = {};
    if (fromDate || toDate) {
      dateMatch.createdAt = {};
      if (fromDate) dateMatch.createdAt.$gte = new Date(fromDate);
      if (toDate) dateMatch.createdAt.$lte = new Date(toDate);
    }

    // Appointment stats
    const appointments = await Appointment.find({
      doctor: doctorId,
      ...dateMatch,
    });

    const completedAppointments = appointments.filter(a => a.status === "completed");
    const cancelledAppointments = appointments.filter(a => a.status === "cancelled");

    // Revenue stats
    const payments = await Payment.find({
      doctor: doctorId,
      status: "completed",
      ...dateMatch,
    });

    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    const platformFee = payments.reduce((sum, p) => sum + (p.platformFee || 0), 0);

    // Patient stats
    const uniquePatients = new Set(appointments.map(a => a.patient.toString())).size;

    // Rating stats
    const reviews = await Review.find({
      doctor: doctorId,
      ...dateMatch,
    });

    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / (reviews.length || 1);

    return {
      doctor: {
        name: doctor.user.fullName,
        specialization: doctor.specialization,
        bmdcRegNo: doctor.bmdcRegNo,
      },
      period: {
        from: fromDate || "all time",
        to: toDate || "present",
      },
      appointments: {
        total: appointments.length,
        completed: completedAppointments.length,
        cancelled: cancelledAppointments.length,
        completionRate: appointments.length > 0
          ? Math.round((completedAppointments.length / appointments.length) * 100)
          : 0,
      },
      revenue: {
        total: totalRevenue,
        platformFee,
        doctorEarnings: totalRevenue - platformFee,
        averagePerAppointment: completedAppointments.length > 0
          ? totalRevenue / completedAppointments.length
          : 0,
      },
      patients: {
        unique: uniquePatients,
        returning: uniquePatients - (appointments.length - uniquePatients),
      },
      ratings: {
        average: avgRating.toFixed(1),
        total: reviews.length,
        distribution: {
          5: reviews.filter(r => r.rating === 5).length,
          4: reviews.filter(r => r.rating === 4).length,
          3: reviews.filter(r => r.rating === 3).length,
          2: reviews.filter(r => r.rating === 2).length,
          1: reviews.filter(r => r.rating === 1).length,
        },
      },
    };
  }

  /**
   * Generate patient report
   */
  static async getPatientReport(patientId, filters) {
    const { fromDate, toDate } = filters;

    const patient = await Patient.findById(patientId).populate("user");

    if (!patient) {
      throw new ApiError(404, "Patient not found");
    }

    const dateMatch = {};
    if (fromDate || toDate) {
      dateMatch.createdAt = {};
      if (fromDate) dateMatch.createdAt.$gte = new Date(fromDate);
      if (toDate) dateMatch.createdAt.$lte = new Date(toDate);
    }

    const appointments = await Appointment.find({
      patient: patientId,
      ...dateMatch,
    }).populate({
      path: "doctor",
      populate: {
        path: "user",
        select: "fullName",
      },
    });

    const payments = await Payment.find({
      patient: patientId,
      status: "completed",
      ...dateMatch,
    });

    const totalSpent = payments.reduce((sum, p) => sum + p.amount, 0);

    // Group by doctor
    const visitsByDoctor = {};
    appointments.forEach(a => {
      const doctorName = a.doctor?.user?.fullName || "Unknown";
      if (!visitsByDoctor[doctorName]) {
        visitsByDoctor[doctorName] = 0;
      }
      visitsByDoctor[doctorName]++;
    });

    return {
      patient: {
        name: patient.user.fullName,
        email: patient.user.email,
        phone: patient.user.phone,
        bloodGroup: patient.bloodGroup,
      },
      period: {
        from: fromDate || "all time",
        to: toDate || "present",
      },
      appointments: {
        total: appointments.length,
        byStatus: {
          completed: appointments.filter(a => a.status === "completed").length,
          cancelled: appointments.filter(a => a.status === "cancelled").length,
          pending: appointments.filter(a => a.status === "pending").length,
        },
        byDoctor: visitsByDoctor,
      },
      spending: {
        total: totalSpent,
        averagePerVisit: appointments.length > 0
          ? totalSpent / appointments.length
          : 0,
      },
      medical: {
        allergies: patient.allergies,
        chronicDiseases: patient.chronicDiseases,
        currentMedications: patient.medications?.length || 0,
      },
    };
  }

  static async getDoctorsByStatus(status, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const query = {};
    if (status && status !== "all") {
      query.verificationStatus = status;
    }

    const doctors = await Doctor.find(query)
      .populate("user", "fullName email phone createdAt profileImage")
      .populate("verifiedBy", "fullName email")
      .skip(skip)
      .limit(limit)
      .sort({ profileCompletedAt: -1, createdAt: -1 });

    const total = await Doctor.countDocuments(query);

    // Add profile completion info
    const doctorsWithInfo = doctors.map(doctor => {
      const doc = doctor.toObject();
      const hasCompletedProfile = !!(
        doctor.specialization &&
        doctor.consultationFee &&
        doctor.documents?.bmdcCertificate?.url &&
        doctor.documents?.profilePhoto?.url
      );

      return {
        ...doc,
        hasCompletedProfile,
        isReadyForReview: doctor.verificationStatus === "profile_submitted",
      };
    });

    return {
      doctors: doctorsWithInfo,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  static async getDoctorForReview(doctorId) {
    const doctor = await Doctor.findById(doctorId)
      .populate("user", "fullName email phone createdAt dateOfBirth gender")
      .populate("verifiedBy", "fullName email");

    if (!doctor) {
      throw new Error("Doctor not found");
    }

    // Calculate profile completion percentage
    const completionSteps = {
      hasSpecialization: !!doctor.specialization,
      hasQualifications: doctor.qualifications && doctor.qualifications.length > 0,
      hasExperience: doctor.experienceYears > 0,
      hasWorkplace: doctor.currentWorkplace?.name,
      hasFee: doctor.consultationFee > 0,
      hasSchedule: doctor.availableDays && doctor.availableDays.length > 0,
      hasBmdcCert: !!doctor.documents?.bmdcCertificate?.url,
      hasNid: !!doctor.documents?.nid?.url,
      hasMbbsCert: !!doctor.documents?.mbbsCertificate?.url,
      hasProfilePhoto: !!doctor.documents?.profilePhoto?.url,
      hasBankInfo: !!(doctor.bankInfo?.accountNumber || doctor.mobileBanking?.bKash),
    };

    const completedCount = Object.values(completionSteps).filter(Boolean).length;
    const completionPercentage = (completedCount / Object.keys(completionSteps).length) * 100;

    return {
      doctor,
      profileCompletion: {
        percentage: Math.round(completionPercentage),
        steps: completionSteps,
      },
    };
  }
  static async verifyDoctor(adminId, doctorId, status, notes) {
    const admin = await User.findById(adminId);
    if (!admin || !["admin", "superadmin"].includes(admin.role)) {
      throw new Error("Unauthorized");
    }

    const doctor = await Doctor.findById(doctorId).populate("user");
    if (!doctor) {
      throw new Error("Doctor not found");
    }

    const previousStatus = doctor.verificationStatus;

    doctor.verificationStatus = status;
    doctor.verifiedBy = adminId;
    doctor.verifiedAt = new Date();

    if (status === "rejected") {
      doctor.rejectionReason = notes;
      doctor.verificationNotes = notes;
    } else if (status === "verified") {
      doctor.verificationNotes = notes || "Account verified and activated";
    }

    await doctor.save();

    // Send email notification
    if (status === "verified") {
      await sendEmail({
        to: doctor.user.email,
        subject: "✅ Your Doctor Account is Now Verified & Active!",
        template: "doctor-verified-final",
        data: {
          name: doctor.user.fullName,
          message: notes || "Your account has been fully verified and activated. You can now start accepting appointments from patients.",
          loginUrl: `${process.env.CLIENT_URL}/login`,
          dashboardUrl: `${process.env.CLIENT_URL}/doctor/dashboard`,
        },
      });

      await sendSMS({
        to: doctor.user.phone,
        message: `Congratulations Dr. ${doctor.user.fullName}! Your account is now verified and active. Welcome to Doccure!`,
      });
    }

    // Create audit log
    await this.createAuditLog({
      adminId,
      action: "VERIFY_DOCTOR",
      targetId: doctorId,
      targetType: "Doctor",
      previousStatus,
      newStatus: status,
      notes,
    });

    return {
      doctorId: doctor._id,
      email: doctor.user.email,
      name: doctor.user.fullName,
      previousStatus,
      currentStatus: status,
      verifiedAt: doctor.verifiedAt,
    };
  }

  static async getVerificationStats() {
    const stats = await Doctor.aggregate([
      {
        $group: {
          _id: "$verificationStatus",
          count: { $sum: 1 },
        },
      },
    ]);

    const result = {
      pending: 0,
      profile_submitted: 0,
      under_review: 0,
      verified: 0,
      rejected: 0,
      suspended: 0,
    };

    stats.forEach(stat => {
      result[stat._id] = stat.count;
    });

    return result;
  }

  static async createAuditLog(logData) {
    // Create AuditLog model if needed
    console.log("Audit Log:", logData);
  }

  static async getDoctorsForVerification(filters = {}, pagination = {}) {
    const { status, search } = filters;
    const page = parseInt(pagination.page) || 1;
    const limit = parseInt(pagination.limit) || 20;
    const skip = (page - 1) * limit;

    // Query build
    const query = {};
    if (status && status !== "all") {
      query.verificationStatus = status;
    }

    let doctors = await Doctor.find(query)
      .populate("user", "fullName email phone createdAt profileImage")
      .populate("verifiedBy", "fullName email")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Name/email search
    if (search) {
      doctors = doctors.filter(
        (d) =>
          d.user?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
          d.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
          d.bmdcRegNo?.toLowerCase().includes(search.toLowerCase())
      );
    }

    const total = await Doctor.countDocuments(query);

    const statusCounts = await Doctor.aggregate([
      { $group: { _id: "$verificationStatus", count: { $sum: 1 } } },
    ]);
    const summary = {};
    statusCounts.forEach((item) => {
      summary[item._id] = item.count;
    });

    return {
      doctors,
      summary,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * getDoctorForReview - admin review panel এর জন্য full doctor details
   */
  static async getDoctorForReview(doctorId) {
    const doctor = await Doctor.findById(doctorId)
      .populate("user", "fullName email phone dateOfBirth gender profileImage createdAt address")
      .populate("verifiedBy", "fullName email");

    if (!doctor) {
      throw new ApiError(404, "Doctor not found");
    }

    return { doctor };
  }

  /**
 * getVerificationDetails - verification history + current status
 */
  static async getVerificationDetails(doctorId) {
    const doctor = await Doctor.findById(doctorId)
      .select("verificationStatus verificationHistory verificationNotes rejectionReason verifiedBy verifiedAt bmdcRegNo documents")
      .populate("verifiedBy", "fullName email")
      .populate("verificationHistory.updatedBy", "fullName email");

    if (!doctor) {
      throw new ApiError(404, "Doctor not found");
    }

    return {
      verificationStatus: doctor.verificationStatus,
      verificationNotes: doctor.verificationNotes,
      rejectionReason: doctor.rejectionReason,
      verifiedBy: doctor.verifiedBy,
      verifiedAt: doctor.verifiedAt,
      bmdcRegNo: doctor.bmdcRegNo,
      documents: doctor.documents,
      history: doctor.verificationHistory || [],
    };
  }

  /**
 * verifyDoctor - status change with email notification
 */
  static async verifyDoctor(adminId, doctorId, status, notes = "") {
    const validStatuses = ["verified", "rejected", "suspended", "under_review", "document_verification"];
    if (!validStatuses.includes(status)) {
      throw new ApiError(400, `Invalid status. Must be one of: ${validStatuses.join(", ")}`);
    }

    const admin = await User.findById(adminId);
    if (!admin || !["admin", "superadmin"].includes(admin.role)) {
      throw new ApiError(403, "Unauthorized: Only admins can verify doctors");
    }

    const doctor = await Doctor.findById(doctorId).populate("user");
    if (!doctor) {
      throw new ApiError(404, "Doctor not found");
    }

    if (doctor.verificationStatus === "verified" && status === "verified") {
      throw new ApiError(400, "Doctor is already verified");
    }

    const previousStatus = doctor.verificationStatus;

    const updateFields = {
      verificationStatus: status,
      verifiedBy: adminId,
      verifiedAt: new Date(),
      verificationNotes: notes,
      $push: {
        verificationHistory: {
          status,
          notes,
          updatedBy: adminId,
          updatedAt: new Date(),
        },
      },
    };

    if (status === "rejected") {
      updateFields.rejectionReason = notes;
    }

    await Doctor.findByIdAndUpdate(doctorId, updateFields, { runValidators: false });

    // Email notification
    try {
      if (status === "verified") {
        await sendEmail({
          to: doctor.user.email,
          subject: "🎉 Your Doctor Account is Verified!",
          template: "doctor-verified",
          data: {
            name: doctor.user.fullName,
            message: notes || "Your account has been verified. You can now start accepting appointments.",
            loginUrl: `${process.env.CLIENT_URL}/login`,
            dashboardUrl: `${process.env.CLIENT_URL}/doctor/dashboard`,
          },
        });

        if (doctor.user.phone) {
          await sendSMS({
            to: doctor.user.phone,
            message: `Congratulations Dr. ${doctor.user.fullName}! Your account has been verified.`,
          }).catch((err) => console.error("SMS failed:", err));
        }
      } else if (status === "rejected") {
        await sendEmail({
          to: doctor.user.email,
          subject: "Doctor Application Update",
          template: "doctor-rejected",
          data: {
            name: doctor.user.fullName,
            reason: notes || "Your application did not meet our verification criteria.",
            supportEmail: process.env.SUPPORT_EMAIL || "support@doccure.com",
            reapplyUrl: `${process.env.CLIENT_URL}/doctor/complete-profile`,
          },
        });
      } else if (status === "suspended") {
        await sendEmail({
          to: doctor.user.email,
          subject: "Doctor Account Suspended",
          template: "doctor-suspended",
          data: {
            name: doctor.user.fullName,
            reason: notes || "Violation of terms of service.",
            supportEmail: process.env.SUPPORT_EMAIL || "support@doccure.com",
          },
        });
      }
    } catch (emailError) {
      console.error("Email notification failed:", emailError);
    }

    return {
      doctorId: doctor._id,
      userId: doctor.user._id,
      email: doctor.user.email,
      fullName: doctor.user.fullName,
      previousStatus,
      currentStatus: status,
      verifiedAt: new Date(),
      notes,
    };
  }



  /**
   * verifyDocument - single document verify/reject
   */
  static async verifyDocument(doctorId, documentType, data) {
    const validDocTypes = [
      "bmdcCertificate", "nid", "basicDegree",
      "specializationCertificate", "tradeLicense", "profilePhoto", "chamberPhoto",
    ];

    if (!validDocTypes.includes(documentType)) {
      throw new ApiError(400, `Invalid document type`);
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      throw new ApiError(404, "Doctor not found");
    }

    if (!doctor.documents?.[documentType]?.url) {
      throw new ApiError(404, `Document "${documentType}" not uploaded yet`);
    }

    const updateFields = {
      [`documents.${documentType}.verified`]: data.verified,
      [`documents.${documentType}.verifiedAt`]: new Date(),
    };

    if (!data.verified && data.rejectionReason) {
      updateFields[`documents.${documentType}.rejectionReason`] = data.rejectionReason;
    }

    // ✅ dot notation + runValidators: false
    await Doctor.findByIdAndUpdate(doctorId, { $set: updateFields }, { runValidators: false });

    return {
      documentType,
      verified: data.verified,
      verifiedAt: new Date(),
      rejectionReason: data.rejectionReason,
    };
  }


  /**
 * getVerificationStats
 */
  static async getVerificationStats() {
    const statusCounts = await Doctor.aggregate([
      { $group: { _id: "$verificationStatus", count: { $sum: 1 } } },
    ]);

    const stats = {
      total: 0,
      pending: 0,
      profile_submitted: 0,
      document_verification: 0,
      under_review: 0,
      verified: 0,
      rejected: 0,
      suspended: 0,
    };

    statusCounts.forEach((item) => {
      if (stats.hasOwnProperty(item._id)) {
        stats[item._id] = item.count;
      }
      stats.total += item.count;
    });

    stats.actionRequired =
      (stats.profile_submitted || 0) +
      (stats.document_verification || 0) +
      (stats.under_review || 0);

    return stats;
  }


}