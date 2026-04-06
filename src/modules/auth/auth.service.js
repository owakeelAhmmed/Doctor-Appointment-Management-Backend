import { User } from "./auth.model.js";
import { Doctor } from "../doctor/doctor.model.js";
import crypto from "crypto";
import { sendEmail } from "../../services/email.service.js";
import { sendSMS } from "../../services/sms.service.js";
import { uploadMedia } from "../upload/media.service.js";

export class AuthService {

  // Register new user
  static async register(userData) {
    const { email, phone, role, bmdcRegNo } = userData;

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }],
    });

    if (existingUser) {
      throw new Error("User already exists with this email or phone");
    }

    // Create user
    const user = await User.create(userData);

    // If doctor, create minimal doctor profile
    if (role === "doctor") {
      // Check if BMDC already exists
      const existingDoctor = await Doctor.findOne({ bmdcRegNo });
      if (existingDoctor) {
        await User.findByIdAndDelete(user._id);
        throw new Error("Doctor already registered with this BMDC number");
      }

      await Doctor.create({
        user: user._id,
        bmdcRegNo,
        verificationStatus: "pending",
        profileCompletionStep: 1,
      });
    }

    // Generate OTPs
    const emailOTP = user.setEmailOTP();
    const phoneOTP = user.setPhoneOTP();
    await user.save();

    // Send OTPs
    this.sendOTPEmails(user, emailOTP, phoneOTP).catch(console.error);

    return {
      userId: user._id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      requiresVerification: role === "doctor",
      message: role === "doctor"
        ? "Registration successful. Your application is pending admin approval."
        : "Registration successful. Please verify your email.",
    };
  }

  // Send OTP emails
  static async sendOTPEmails(user, emailOTP, phoneOTP) {
    await Promise.all([
      sendEmail({
        to: user.email,
        subject: "Email Verification OTP",
        template: "email-otp",
        data: { otp: emailOTP, name: user.fullName },
      }),
      sendSMS({
        to: user.phone,
        message: `Your phone verification OTP is: ${phoneOTP}`,
      }),
    ]);
  }

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
      // Increment login attempts
      user.loginAttempts += 1;

      // Lock account after 5 failed attempts
      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      }

      await user.save();
      throw new Error("Invalid credentials");
    }

    // Reset login attempts
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();
    await user.save();

    // Check doctor verification status
    if (user.role === "doctor") {
      const doctor = await Doctor.findOne({ user: user._id });
      if (doctor && doctor.verificationStatus !== "verified") {
        throw new Error(
          `Your doctor account is ${doctor.verificationStatus}. Please wait for verification.`,
          { verificationStatus: doctor.verificationStatus }
        );
      }
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
      },
    };
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

  // Complete doctor profile
  // auth.service.js - Add this method
  static async completeDoctorProfile(userId, profileData, files) {
    const doctor = await Doctor.findOne({ user: userId });

    if (!doctor) {
      throw new Error("Doctor profile not found");
    }

    // Check if doctor is verified
    if (doctor.verificationStatus !== "verified") {
      throw new Error("Your account is not verified yet. Please wait for admin approval.");
    }

    // Update profile with new data
    const updateData = { ...profileData };

    // Parse JSON fields
    if (profileData.qualifications) {
      updateData.qualifications = typeof profileData.qualifications === 'string'
        ? JSON.parse(profileData.qualifications)
        : profileData.qualifications;
    }

    if (profileData.availableDays) {
      updateData.availableDays = typeof profileData.availableDays === 'string'
        ? JSON.parse(profileData.availableDays)
        : profileData.availableDays;
    }

    if (profileData.consultationTypes) {
      updateData.consultationTypes = typeof profileData.consultationTypes === 'string'
        ? JSON.parse(profileData.consultationTypes)
        : profileData.consultationTypes;
    }

    if (profileData.bankInfo) {
      updateData.bankInfo = typeof profileData.bankInfo === 'string'
        ? JSON.parse(profileData.bankInfo)
        : profileData.bankInfo;
    }

    if (profileData.mobileBanking) {
      updateData.mobileBanking = typeof profileData.mobileBanking === 'string'
        ? JSON.parse(profileData.mobileBanking)
        : profileData.mobileBanking;
    }

    // Handle file uploads
    if (files) {
      for (const [key, fileArray] of Object.entries(files)) {
        if (fileArray && fileArray[0]) {
          const uploaded = await uploadMedia({
            buffer: fileArray[0].buffer,
            originalFilename: fileArray[0].originalname,
            ownerType: "doctors",
            ownerId: userId,
            folder: "doctor_documents",
          });

          if (!updateData.documents) updateData.documents = {};
          updateData.documents[key] = {
            url: uploaded.url,
            public_id: uploaded.public_id,
            verified: false,
          };
        }
      }
    }

    // Update completion step
    updateData.profileCompletionStep = 4; // Complete
    updateData.isProfileComplete = true;

    const updatedDoctor = await Doctor.findOneAndUpdate(
      { user: userId },
      updateData,
      { new: true, runValidators: true }
    );

    return updatedDoctor;
  }

  // Get doctor profile with completion status
  static async getDoctorProfile(userId) {
    const doctor = await Doctor.findOne({ user: userId }).populate('user', '-password');

    if (!doctor) {
      throw new Error("Doctor profile not found");
    }

    // Calculate profile completion percentage
    const completionSteps = {
      basicInfo: !!(doctor.bmdcRegNo && doctor.specialization),
      documents: !!(doctor.documents?.bmdcCertificate?.url && doctor.documents?.profilePhoto?.url),
      professional: !!(doctor.consultationFee && doctor.availableDays?.length > 0),
      payment: !!(doctor.bankInfo?.accountNumber || doctor.mobileBanking?.bKash),
    };

    const completedSteps = Object.values(completionSteps).filter(Boolean).length;
    const completionPercentage = (completedSteps / 4) * 100;

    return {
      doctor,
      profileCompletion: {
        percentage: completionPercentage,
        steps: completionSteps,
        isVerified: doctor.verificationStatus === "verified",
        isComplete: doctor.isProfileComplete,
        currentStep: doctor.profileCompletionStep,
      },
    };
  }

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
      },
    });

    return { message: "Password reset email sent" };
  }

  // Reset password
  static async resetPassword(token, newPassword) {
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

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

  // Create admin user (superadmin only)
  static async createAdmin(adminData, createdBy) {
    const { email, phone, fullName, department, designation, permissions } = adminData;

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
        loginUrl: `${process.env.CLIENT_URL}/admin/login`,
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
    }).select("-password -emailOTP -phoneOTP -resetPasswordToken -resetPasswordExpire");

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

    // Log the change (you can add audit log here)
    console.log(`Admin permissions updated by ${updatedBy}`);

    return {
      id: admin._id,
      email: admin.email,
      permissions: admin.adminPermissions,
    };
  }

  // Get user profile
  static async getProfile(userId) {
    const user = await User.findById(userId).select("-password -emailOTP -phoneOTP -resetPasswordToken -resetPasswordExpire");

    if (!user) {
      throw new Error("User not found");
    }

    let profile = null;

    if (user.role === "doctor") {
      profile = await Doctor.findOne({ user: user._id });
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
      { new: true, runValidators: true }
    ).select("-password -emailOTP -phoneOTP -resetPasswordToken -resetPasswordExpire");

    return user;
  }
}