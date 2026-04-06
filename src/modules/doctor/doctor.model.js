import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    
    // ========== STEP 1: MINIMUM REGISTRATION ==========
    bmdcRegNo: {
      type: String,
      required: [true, "BMDC Registration Number is required"],
      unique: true,
      trim: true,
    },
    
    // ========== STEP 2: COMPLETE PROFILE (After admin sees pending) ==========
    specialization: {
      type: String,
      trim: true,
    },
    qualifications: [
      {
        degree: String,
        institute: String,
        year: Number,
        certificate: { url: String, public_id: String },
      },
    ],
    experienceYears: {
      type: Number,
      min: 0,
      default: 0,
    },
    currentWorkplace: {
      name: String,
      address: String,
      contactNumber: String,
    },
    consultationFee: {
      type: Number,
      min: 0,
    },
    availableDays: [
      {
        day: {
          type: String,
          enum: ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
        },
        slots: [
          {
            startTime: String,
            endTime: String,
            maxPatients: { type: Number, default: 1 },
            type: { type: String, enum: ["in-person", "video", "phone"] },
          },
        ],
        isAvailable: { type: Boolean, default: true },
      },
    ],
    consultationTypes: [
      {
        type: String,
        enum: ["in-person", "video", "phone"],
      },
    ],
    
    // Documents
    documents: {
      bmdcCertificate: { url: String, public_id: String, verified: { type: Boolean, default: false } },
      nid: { url: String, public_id: String, verified: { type: Boolean, default: false } },
      mbbsCertificate: { url: String, public_id: String, verified: { type: Boolean, default: false } },
      specializationCertificate: { url: String, public_id: String, verified: { type: Boolean, default: false } },
      profilePhoto: { url: String, public_id: String, verified: { type: Boolean, default: false } },
    },
    
    // Bank Information
    bankInfo: {
      bankName: String,
      accountNumber: String,
      accountHolderName: String,
      routingNumber: String,
      branchName: String,
    },
    mobileBanking: {
      bKash: String,
      nagad: String,
      rocket: String,
    },
    
    // ========== VERIFICATION STATUS (CRITICAL) ==========
    verificationStatus: {
      type: String,
      enum: [
        "pending",              // Step 1: Just registered, waiting to submit full profile
        "profile_submitted",    // Step 2: Submitted full profile, waiting for admin review
        "under_review",         // Admin is reviewing
        "verified",             // Step 3: Approved - FULLY ACTIVE
        "rejected",             // Rejected
        "suspended"             // Suspended
      ],
      default: "pending",
    },
    verificationNotes: String,
    rejectionReason: String,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    verifiedAt: Date,
    
    // When profile was completed
    profileCompletedAt: Date,
    
    // Rating and Reviews
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    totalPatients: { type: Number, default: 0 },
    
    // Commission & Earnings
    commissionRate: { type: Number, default: 20, min: 0, max: 100 },
    totalEarnings: { type: Number, default: 0 },
    pendingWithdrawal: { type: Number, default: 0 },
  },
  { timestamps: true }
);

doctorSchema.index({ specialization: 1, verificationStatus: 1 });
doctorSchema.index({ bmdcRegNo: 1 });
doctorSchema.index({ verificationStatus: 1, createdAt: 1 });

export const Doctor = mongoose.model("Doctor", doctorSchema);