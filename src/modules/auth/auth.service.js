import { User } from "./auth.model.js";
import { Doctor } from "../doctor/doctor.model.js";
import crypto from "crypto";
import { sendEmail } from "../../services/email.service.js";
import { sendSMS } from "../../services/sms.service.js";
import { uploadMedia } from "../upload/media.service.js";
import { Patient } from "../patient/patient.model.js";

export class AuthService {

  // ==================== REGISTER ====================

  // Register new user (Patient or Doctor)
  static async register(userData) {
    const { email, phone, role = "patient", bmdcRegNo } = userData;

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }],
    });

    if (existingUser) {
      throw new Error("User already exists with this email or phone");
    }

    // Create user
    const user = await User.create(userData);

    // ========== PATIENT REGISTRATION ==========
    if (user.role === "patient") {
      await Patient.create({
        user: user._id,
        totalAppointments: 0,
        totalSpent: 0,
      });
    }

    // ========== DOCTOR REGISTRATION (MINIMAL) ==========
    if (user.role === "doctor") {
      const existingDoctor = await Doctor.findOne({ bmdcRegNo });
      if (existingDoctor) {
        await User.findByIdAndDelete(user._id);
        throw new Error("Doctor already registered with this BMDC number");
      }

      await Doctor.create({
        user: user._id,
        bmdcRegNo,
        verificationStatus: "pending",
      });

      console.log(`✅ Doctor registered with minimal info: ${user.email}`);
    }

    // Generate OTP
    const emailOTP = user.setEmailOTP();
    await user.save();

    // ========== FIX: Direct email sending (no method call) ==========
    // Send email directly
    try {
      await sendEmail({
        to: user.email,
        subject: "Email Verification OTP",
        template: "email-otp",
        data: { otp: emailOTP, name: user.fullName, role: user.role },
      });
      console.log(`✅ OTP email sent to ${user.email}`);
    } catch (error) {
      console.error("Failed to send OTP email:", error);
    }

    const response = {
      userId: user._id,
      email: user.email,
      role: user.role,
    };

    if (user.phone) {
      response.phone = user.phone;
    }

    if (user.role === "doctor") {
      response.message = "Registration successful! Please verify your email. After verification, you will need to complete your profile.";
    } else {
      response.message = "Registration successful. Please verify your email.";
    }

    return response;
  }

  // Helper method to upload documents
  static async uploadDocument(file) {
    try {
      const uploaded = await uploadMedia({
        buffer: file.buffer,
        originalFilename: file.originalname,
        ownerType: "doctors",
        folder: "verification-documents",
        tags: ["doctor", "verification"],
      });
      return uploaded.url;
    } catch (error) {
      console.error("Document upload failed:", error);
      return null;
    }
  }

  // Send OTP emails and SMS
  static async sendOTPEmails(user, emailOTP, phoneOTP) {
    const promises = [
      sendEmail({
        to: user.email,
        subject: "Email Verification OTP",
        template: "email-otp",
        data: { otp: emailOTP, name: user.fullName, role: user.role },
      }),
    ];

    // Only send SMS if phone OTP exists and phone number is available
    if (phoneOTP && user.phone) {
      promises.push(
        sendSMS({
          to: user.phone,
          message: `Your phone verification OTP is: ${phoneOTP}`,
        })
      );
    }

    await Promise.all(promises);
  }

  // Notify admins about new doctor registration
  static async notifyAdminsForVerification(user) {
    try {
      const admins = await User.find({
        role: { $in: ["admin", "superadmin"] }
      }).select("email fullName");

      if (admins.length === 0) return;

      // Send email to all admins
      for (const admin of admins) {
        await sendEmail({
          to: admin.email,
          subject: "New Doctor Registration - Pending Verification",
          template: "admin-doctor-verification",
          data: {
            adminName: admin.fullName,
            doctorName: user.fullName,
            doctorEmail: user.email,
            doctorId: user._id,
            pendingUrl: `${process.env.ADMIN_URL || "http://localhost:3000"}/admin/doctors/pending`,
          },
        });
      }

      console.log(`✅ Notified ${admins.length} admins about new doctor registration`);
    } catch (error) {
      console.error("Failed to notify admins:", error);
    }
  }

  // ==================== VERIFICATION ====================

  // Verify email OTP
  static async verifyEmail(email, otp) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error("User not found");
    }

    if (!user.verifyOTP("email", otp)) {
      throw new Error("Invalid or expired OTP");
    }

    user.isEmailVerified = true;
    user.emailOTP = undefined;
    await user.save();

    return { message: "Email verified successfully" };
  }

  // Verify phone OTP
  static async verifyPhone(phone, otp) {
    const user = await User.findOne({ phone });
    if (!user) {
      throw new Error("User not found");
    }

    if (!user.verifyOTP("phone", otp)) {
      throw new Error("Invalid or expired OTP");
    }

    user.isPhoneVerified = true;
    user.phoneOTP = undefined;
    await user.save();

    return { message: "Phone verified successfully" };
  }

  // Resend OTP
  static async resendOTP(identifier, type) {
    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (type === "email") {
      const otp = user.setEmailOTP();
      await user.save();

      await sendEmail({
        to: user.email,
        subject: "New Email Verification OTP",
        template: "email-otp",
        data: { otp, name: user.fullName },
      });
    } else if (type === "phone") {
      if (!user.phone) {
        throw new Error("Phone number not found");
      }
      const otp = user.setPhoneOTP();
      await user.save();

      await sendSMS({
        to: user.phone,
        message: `Your new phone verification OTP is: ${otp}`,
      });
    } else {
      throw new Error("Invalid OTP type");
    }

    return { message: `New OTP sent to your ${type}` };
  }

  // ==================== LOGIN ====================

  // Login user
  static async login(email, password) {
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      throw new Error("Invalid credentials");
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
      throw new Error(`Account is locked. Try again after ${minutesLeft} minutes`);
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      user.loginAttempts += 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
      }
      await user.save();
      throw new Error("Invalid credentials");
    }

    // Reset login attempts
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();
    await user.save();

    let verificationStatus = null;
    let profileCompletionPercentage = 0;
    let needsProfileCompletion = false;
    let needsDocumentSubmission = false;
    let isVerified = false;

    // Handle doctor-specific checks
    if (user.role === "doctor") {
      const doctor = await Doctor.findOne({ user: user._id });

      if (!doctor) {
        throw new Error("Doctor profile not found");
      }

      verificationStatus = doctor.verificationStatus;
      profileCompletionPercentage = doctor.profileCompletionPercentage || 0;

      // Check what step the doctor is in
      switch (verificationStatus) {
        case "pending":
          needsProfileCompletion = true;
          break;
        case "profile_submitted":
          needsDocumentSubmission = true;
          break;
        case "document_verification":
        case "bmdc_verification":
        case "under_review":
          // Waiting for admin
          break;
        case "verified":
          isVerified = true;
          break;
        case "rejected":
          throw new Error(`REJECTED: ${doctor.rejectionReason || "Your application has been rejected. Please contact support."}`);
        case "suspended":
          throw new Error("SUSPENDED: Your account has been suspended. Please contact support.");
      }

      console.log(`✅ Doctor ${user.email} logged in with status: ${verificationStatus}`);
    }

    // Generate token
    const token = user.getSignedJwtToken();

    return {
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        permissions: user.adminPermissions,
        verificationStatus,
        profileCompletionPercentage,
        needsProfileCompletion,
        needsDocumentSubmission,
        isVerified
      },
    };
  }
  // ==================== DOCTOR VERIFICATION (ADMIN) ====================

  // Admin: Verify doctor
  static async verifyDoctor(adminId, doctorId, status, notes = "") {
    // Check if admin is authorized
    const admin = await User.findById(adminId);
    if (!admin || !["admin", "superadmin"].includes(admin.role)) {
      throw new Error("Unauthorized: Only admins can verify doctors");
    }

    // Find doctor
    const doctor = await Doctor.findOne({ user: doctorId });
    if (!doctor) {
      throw new Error("Doctor not found");
    }

    // Find user
    const user = await User.findById(doctorId);
    if (!user) {
      throw new Error("User not found");
    }

    // Update verification status
    doctor.verificationStatus = status;
    doctor.verificationNotes = notes;
    doctor.verifiedBy = adminId;
    doctor.verifiedAt = new Date();
    await doctor.save();

    // Send email notification to doctor
    if (status === "verified") {
      await sendEmail({
        to: user.email,
        subject: "Doctor Account Verified - Welcome to Doccure",
        template: "doctor-verified",
        data: {
          name: user.fullName,
          loginUrl: `${process.env.CLIENT_URL || "http://localhost:3000"}/login`,
          dashboardUrl: `${process.env.CLIENT_URL || "http://localhost:3000"}/doctor/dashboard`,
        },
      });
      console.log(`✅ Doctor ${user.email} account verified`);

    } else if (status === "rejected") {
      await sendEmail({
        to: user.email,
        subject: "Doctor Application Update - Not Approved",
        template: "doctor-rejected",
        data: {
          name: user.fullName,
          reason: notes || "Your application did not meet our verification criteria.",
          supportEmail: process.env.SUPPORT_EMAIL || "support@doccure.com",
        },
      });
      console.log(`❌ Doctor ${user.email} application rejected`);

    } else if (status === "suspended") {
      await sendEmail({
        to: user.email,
        subject: "Doctor Account Suspended",
        template: "doctor-suspended",
        data: {
          name: user.fullName,
          reason: notes || "Violation of terms of service.",
          supportEmail: process.env.SUPPORT_EMAIL || "support@doccure.com",
        },
      });
      console.log(`⚠️ Doctor ${user.email} account suspended`);
    }

    return {
      doctorId: doctor._id,
      userId: user._id,
      email: user.email,
      fullName: user.fullName,
      verificationStatus: status,
      verifiedAt: doctor.verifiedAt,
      notes: notes,
    };
  }

  // Admin: Get pending doctors
  static async getPendingDoctors(page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const pendingDoctors = await Doctor.find({ verificationStatus: "pending" })
      .populate("user", "fullName email phone dateOfBirth gender createdAt")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: 1 });

    const total = await Doctor.countDocuments({ verificationStatus: "pending" });

    return {
      doctors: pendingDoctors,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Admin: Get all doctors with filters
  static async getAllDoctors(filters = {}, page = 1, limit = 10) {
    const { verificationStatus, specialization, search } = filters;
    const skip = (page - 1) * limit;

    const query = {};
    if (verificationStatus && verificationStatus !== "all") {
      query.verificationStatus = verificationStatus;
    }
    if (specialization) {
      query.specialization = { $regex: specialization, $options: "i" };
    }

    let doctors = await Doctor.find(query)
      .populate("user", "fullName email phone dateOfBirth gender createdAt")
      .populate("verifiedBy", "fullName email")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Search by doctor name if provided
    if (search) {
      doctors = doctors.filter(doctor =>
        doctor.user?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        doctor.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
        doctor.specialization?.toLowerCase().includes(search.toLowerCase())
      );
    }

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

  // Admin: Get doctor statistics
  static async getDoctorStatistics() {
    const totalDoctors = await Doctor.countDocuments();
    const pendingDoctors = await Doctor.countDocuments({ verificationStatus: "pending" });
    const verifiedDoctors = await Doctor.countDocuments({ verificationStatus: "verified" });
    const rejectedDoctors = await Doctor.countDocuments({ verificationStatus: "rejected" });
    const suspendedDoctors = await Doctor.countDocuments({ verificationStatus: "suspended" });

    return {
      total: totalDoctors,
      pending: pendingDoctors,
      verified: verifiedDoctors,
      rejected: rejectedDoctors,
      suspended: suspendedDoctors,
    };
  }

  // ==================== DOCTOR PROFILE COMPLETION ====================

  // Complete doctor profile (for existing doctors)
  static async completeDoctorProfile(userId, profileData, files) {
    const doctor = await Doctor.findOne({ user: userId });

    if (!doctor) {
      throw new Error("Doctor profile not found");
    }

    // Check current status
    if (doctor.verificationStatus === "verified") {
      throw new Error("Your profile is already verified and active");
    }

    if (doctor.verificationStatus === "under_review") {
      throw new Error("Your profile is already under review. Please wait for admin approval.");
    }

    // Parse JSON data
    const parsedData = {};

    if (profileData.qualifications) {
      parsedData.qualifications = typeof profileData.qualifications === 'string'
        ? JSON.parse(profileData.qualifications)
        : profileData.qualifications;
    }

    if (profileData.currentWorkplace) {
      parsedData.currentWorkplace = typeof profileData.currentWorkplace === 'string'
        ? JSON.parse(profileData.currentWorkplace)
        : profileData.currentWorkplace;
    }

    if (profileData.availableDays) {
      parsedData.availableDays = typeof profileData.availableDays === 'string'
        ? JSON.parse(profileData.availableDays)
        : profileData.availableDays;
    }

    if (profileData.consultationTypes) {
      parsedData.consultationTypes = typeof profileData.consultationTypes === 'string'
        ? JSON.parse(profileData.consultationTypes)
        : profileData.consultationTypes;
    }

    if (profileData.bankInfo) {
      parsedData.bankInfo = typeof profileData.bankInfo === 'string'
        ? JSON.parse(profileData.bankInfo)
        : profileData.bankInfo;
    }

    if (profileData.mobileBanking) {
      parsedData.mobileBanking = typeof profileData.mobileBanking === 'string'
        ? JSON.parse(profileData.mobileBanking)
        : profileData.mobileBanking;
    }

    // Add basic fields
    parsedData.specialization = profileData.specialization;
    parsedData.experienceYears = parseInt(profileData.experienceYears) || 0;
    parsedData.consultationFee = parseInt(profileData.consultationFee) || 0;
    parsedData.consultationTypes = profileData.consultationTypes || ["in-person", "video"];

    // Handle file uploads
    if (files) {
      const documents = { ...doctor.documents };

      for (const [key, fileArray] of Object.entries(files)) {
        if (fileArray && fileArray[0]) {
          const uploaded = await uploadMedia({
            buffer: fileArray[0].buffer,
            originalFilename: fileArray[0].originalname,
            ownerType: "doctors",
            ownerId: userId,
            folder: "doctor-verification",
          });

          documents[key] = {
            url: uploaded.url,
            public_id: uploaded.public_id,
            verified: false,
          };
        }
      }

      parsedData.documents = documents;
    }

    // Update status to profile_submitted (Step 2 complete)
    parsedData.verificationStatus = "profile_submitted";
    parsedData.profileCompletedAt = new Date();

    const updatedDoctor = await Doctor.findOneAndUpdate(
      { user: userId },
      parsedData,
      { new: true, runValidators: true }
    );

    // Notify admins that doctor has submitted full profile
    await this.notifyAdminsForReview(updatedDoctor);

    return {
      doctor: updatedDoctor,
      message: "Profile completed successfully! Your information is now pending admin review. You will receive an email once verified.",
      status: "profile_submitted"
    };
  }


  // ========== NOTIFY ADMINS FOR REVIEW ==========
  static async notifyAdminsForReview(doctor) {
    try {
      const user = await User.findById(doctor.user);
      const admins = await User.find({
        role: { $in: ["admin", "superadmin"] }
      }).select("email fullName");

      for (const admin of admins) {
        await sendEmail({
          to: admin.email,
          subject: "Doctor Profile Ready for Review",
          template: "admin-doctor-review",
          data: {
            adminName: admin.fullName,
            doctorName: user.fullName,
            doctorEmail: user.email,
            doctorId: doctor._id,
            reviewUrl: `${process.env.ADMIN_URL}/admin/doctors/${doctor._id}/review`,
          },
        });
      }

      console.log(`✅ Notified admins for doctor review: ${user.email}`);
    } catch (error) {
      console.error("Failed to notify admins:", error);
    }
  }


  // ========== ADMIN: GET DOCTORS BY STATUS ==========
  static async getDoctorsByStatus(status, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const query = {};
    if (status && status !== "all") {
      query.verificationStatus = status;
    }

    const doctors = await Doctor.find(query)
      .populate("user", "fullName email phone createdAt")
      .populate("verifiedBy", "fullName email")
      .skip(skip)
      .limit(limit)
      .sort({ profileCompletedAt: -1, createdAt: -1 });

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

  // ========== ADMIN: VERIFY DOCTOR (STEP 3 - FINAL) ==========
  static async verifyDoctor(adminId, doctorId, status, notes = "") {
    // Check admin authorization
    const admin = await User.findById(adminId);
    if (!admin || !["admin", "superadmin"].includes(admin.role)) {
      throw new Error("Unauthorized: Only admins can verify doctors");
    }

    // Find doctor
    const doctor = await Doctor.findById(doctorId).populate("user");
    if (!doctor) {
      throw new Error("Doctor not found");
    }

    // Check current status
    if (doctor.verificationStatus === "verified") {
      throw new Error("Doctor is already verified");
    }

    const previousStatus = doctor.verificationStatus;

    // Update verification status
    doctor.verificationStatus = status;
    doctor.verifiedBy = adminId;
    doctor.verifiedAt = new Date();

    if (status === "rejected") {
      doctor.rejectionReason = notes;
      doctor.verificationNotes = notes;
    } else if (status === "verified") {
      doctor.verificationNotes = notes || "Account verified successfully";
    } else {
      doctor.verificationNotes = notes;
    }

    await doctor.save();

    // Send email notification to doctor
    if (status === "verified") {
      await sendEmail({
        to: doctor.user.email,
        subject: "🎉 Congratulations! Your Doctor Account is Verified",
        template: "doctor-verified",
        data: {
          name: doctor.user.fullName,
          message: notes || "Your account has been verified. You can now start accepting appointments.",
          loginUrl: `${process.env.CLIENT_URL}/login`,
          dashboardUrl: `${process.env.CLIENT_URL}/doctor/dashboard`,
        },
      });

      // Send SMS notification
      await sendSMS({
        to: doctor.user.phone,
        message: `Congratulations Dr. ${doctor.user.fullName}! Your account has been verified. You can now login and start practicing.`,
      });

      console.log(`✅ Doctor verified: ${doctor.user.email}`);

    } else if (status === "rejected") {
      await sendEmail({
        to: doctor.user.email,
        subject: "Doctor Application Update - Action Required",
        template: "doctor-rejected",
        data: {
          name: doctor.user.fullName,
          reason: notes || "Your application did not meet our verification criteria.",
          supportEmail: process.env.SUPPORT_EMAIL || "support@doccure.com",
          reapplyUrl: `${process.env.CLIENT_URL}/doctor/complete-profile`,
        },
      });

      console.log(`❌ Doctor rejected: ${doctor.user.email}`);
    }

    // Log the verification
    console.log(`Doctor ${doctor.user.email} status changed from ${previousStatus} to ${status} by admin ${admin.email}`);

    return {
      doctorId: doctor._id,
      userId: doctor.user._id,
      email: doctor.user.email,
      fullName: doctor.user.fullName,
      previousStatus,
      currentStatus: status,
      verifiedAt: doctor.verifiedAt,
      notes: doctor.verificationNotes,
    };
  }

  // ==================== PASSWORD MANAGEMENT ====================

  // Forgot password
  static async forgotPassword(email) {
    const user = await User.findOne({ email });

    if (!user) {
      throw new Error("User not found");
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();

    // Send email
    await sendEmail({
      to: user.email,
      subject: "Password Reset Request",
      template: "reset-password",
      data: {
        name: user.fullName,
        resetToken,
        resetUrl: `${process.env.CLIENT_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`,
      },
    });

    return { message: "Password reset email sent" };
  }

  // Reset password
  static async resetPassword(token, newPassword) {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      throw new Error("Invalid or expired reset token");
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    return { message: "Password reset successful" };
  }

  // Change password
  static async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select("+password");

    if (!user) {
      throw new Error("User not found");
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      throw new Error("Current password is incorrect");
    }

    user.password = newPassword;
    await user.save();

    return { message: "Password changed successfully" };
  }

  // ==================== ADMIN MANAGEMENT ====================

  // Create admin user (superadmin only)
  static async createAdmin(adminData, createdBy) {
    const { email, phone, fullName, department, designation, permissions } =
      adminData;

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }],
    });

    if (existingUser) {
      throw new Error("User already exists with this email or phone");
    }

    // Generate random password
    const tempPassword = crypto.randomBytes(8).toString("hex");

    // Create admin user
    const admin = await User.create({
      email,
      phone,
      password: tempPassword,
      fullName,
      dateOfBirth: new Date("1990-01-01"), // Default date
      gender: "O",
      role: "admin",
      isEmailVerified: true,
      isPhoneVerified: true,
      department,
      designation,
      adminPermissions: permissions,
      createdBy,
    });

    // Send welcome email with credentials
    await sendEmail({
      to: admin.email,
      subject: "Welcome to Admin Panel",
      template: "admin-welcome",
      data: {
        name: admin.fullName,
        email: admin.email,
        password: tempPassword,
        loginUrl: `${process.env.CLIENT_URL || "http://localhost:3000"}/admin/login`,
      },
    });

    return {
      id: admin._id,
      email: admin.email,
      fullName: admin.fullName,
      role: admin.role,
      department: admin.department,
      designation: admin.designation,
      permissions: admin.adminPermissions,
    };
  }

  // Get all admins (superadmin only)
  static async getAllAdmins() {
    const admins = await User.find({
      role: { $in: ["admin", "superadmin"] },
    }).select(
      "-password -emailOTP -phoneOTP -resetPasswordToken -resetPasswordExpire",
    );

    return admins;
  }

  // Update admin permissions (superadmin only)
  static async updateAdminPermissions(adminId, permissions, updatedBy) {
    const admin = await User.findById(adminId);

    if (!admin || admin.role !== "admin") {
      throw new Error("Admin not found");
    }

    admin.adminPermissions = permissions;
    await admin.save();

    // Log the change
    console.log(`Admin permissions updated by ${updatedBy}`);

    return {
      id: admin._id,
      email: admin.email,
      permissions: admin.adminPermissions,
    };
  }

  // ==================== PROFILE MANAGEMENT ====================

  // Get user profile
  static async getProfile(userId) {
    const user = await User.findById(userId).select(
      "-password -emailOTP -phoneOTP -resetPasswordToken -resetPasswordExpire",
    );

    if (!user) {
      throw new Error("User not found");
    }

    let profile = null;

    if (user.role === "doctor") {
      profile = await Doctor.findOne({ user: user._id });
    } else if (user.role === "patient") {
      profile = await Patient.findOne({ user: user._id });
    }

    return { user, profile };
  }

  // Update profile
  static async updateProfile(userId, updateData) {
    const user = await User.findByIdAndUpdate(
      userId,
      {
        fullName: updateData.fullName,
        address: updateData.address,
        profileImage: updateData.profileImage,
      },
      { new: true, runValidators: true },
    ).select(
      "-password -emailOTP -phoneOTP -resetPasswordToken -resetPasswordExpire",
    );

    return user;
  }
}