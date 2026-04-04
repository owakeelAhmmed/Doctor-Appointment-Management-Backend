import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { JWT_SECRET, JWT_EXPIRE } from "../../config/env.js";

const userSchema = new mongoose.Schema(
  {
    // Basic Information
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      required: [true, "Date of birth is required"],
    },
    gender: {
      type: String,
      enum: ["M", "F", "O"],
      required: true,
    },

    // Role Management
    role: {
      type: String,
      enum: ["patient", "doctor", "admin", "superadmin"],
      default: "patient",
    },

    // Verification Status
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    // OTP Verification
    emailOTP: {
      code: String,
      expiresAt: Date,
    },
    phoneOTP: {
      code: String,
      expiresAt: Date,
    },

    // Profile Information
    profileImage: {
      url: String,
      public_id: String,
    },
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: { type: String, default: "Bangladesh" },
    },

    // For Password Reset
    resetPasswordToken: String,
    resetPasswordExpire: Date,

    // Last Login Tracking
    lastLogin: Date,
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: Date,

    // Admin Specific Fields
    adminPermissions: {
      type: [String],
      enum: [
        "manage_users",
        "manage_doctors",
        "manage_appointments",
        "manage_payments",
        "view_reports",
        "manage_settings",
        "manage_roles",
        "view_logs",
      ],
      default: [],
    },
    verificationStatus: {
      type: String,
      enum: ["pending", "under_review", "verified", "rejected", "suspended"],
      default: "pending",
    },
    verificationNotes: String,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    verifiedAt: Date,
    department: String,
    designation: String,

    // Created By (for audit)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

// Encrypt password before save
userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT Token
userSchema.methods.getSignedJwtToken = function () {
  return jwt.sign(
    {
      id: this._id,
      email: this.email,
      role: this.role,
      permissions: this.adminPermissions,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRE,
    },
  );
};

// Match password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate OTP
userSchema.methods.generateOTP = function () {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Set Email OTP
userSchema.methods.setEmailOTP = function () {
  const otp = this.generateOTP();
  this.emailOTP = {
    code: otp,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
  };
  return otp;
};

// Set Phone OTP
userSchema.methods.setPhoneOTP = function () {
  const otp = this.generateOTP();
  this.phoneOTP = {
    code: otp,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
  };
  return otp;
};

// Verify OTP
userSchema.methods.verifyOTP = function (type, enteredOTP) {
  const otpData = type === "email" ? this.emailOTP : this.phoneOTP;

  if (!otpData || !otpData.code) return false;
  if (otpData.expiresAt < new Date()) return false;
  if (otpData.code !== enteredOTP) return false;

  return true;
};

export const User = mongoose.model("User", userSchema);
