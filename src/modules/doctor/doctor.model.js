import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    
    // Professional Information
    bmdcRegNo: {
      type: String,
      required: [true, "BMDC Registration Number is required"],
      unique: true,
      trim: true,
    },
    specialization: {
      type: String,
      required: [true, "Specialization is required"],
      trim: true,
    },
    qualifications: [
      {
        degree: String,
        institute: String,
        year: Number,
        certificate: {
          url: String,
          public_id: String,
        },
      },
    ],
    experienceYears: {
      type: Number,
      required: true,
      min: 0,
    },
    
    // Current Workplace
    currentWorkplace: {
      name: String,
      address: String,
      contactNumber: String,
    },
    
    // Documents for Verification
    documents: {
      bmdcCertificate: {
        url: String,
        public_id: String,
        verified: { type: Boolean, default: false },
      },
      nid: {
        url: String,
        public_id: String,
        verified: { type: Boolean, default: false },
      },
      mbbsCertificate: {
        url: String,
        public_id: String,
        verified: { type: Boolean, default: false },
      },
      specializationCertificate: {
        url: String,
        public_id: String,
        verified: { type: Boolean, default: false },
      },
      profilePhoto: {
        url: String,
        public_id: String,
        verified: { type: Boolean, default: false },
      },
    },
    
    // Verification Status
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
    
    // Practice Settings
    consultationFee: {
      type: Number,
      required: true,
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
    
    // Consultation Types Offered
    consultationTypes: [
      {
        type: String,
        enum: ["in-person", "video", "phone"],
      },
    ],
    
    // Bank Information for Payment
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
    
    // Rating and Reviews
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    totalPatients: {
      type: Number,
      default: 0,
    },
    
    // Commission Settings
    commissionRate: {
      type: Number,
      default: 20, // 20% default commission
      min: 0,
      max: 100,
    },
    
    // Earnings
    totalEarnings: {
      type: Number,
      default: 0,
    },
    pendingWithdrawal: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for search
doctorSchema.index({ specialization: 1, verificationStatus: 1 });
doctorSchema.index({ "availableDays.day": 1, consultationFee: 1 });

export const Doctor = mongoose.model("Doctor", doctorSchema);