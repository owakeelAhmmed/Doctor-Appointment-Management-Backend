import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    
    bmdcRegNo: {
      type: String,
      required: [true, "BMDC Registration Number is required"],
      unique: true,
      trim: true,
      uppercase: true,
      validate: {
        validator: function(v) {
          return /^BMDC-\d{5,}$/i.test(v);
        },
        message: "Please enter a valid BMDC registration number (e.g., BMDC-12345)"
      }
    },
    bmdcVerificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending"
    },
    bmdcVerificationDate: Date,
    bmdcCertificateUrl: String,
    
    // ========== PROFESSIONAL INFORMATION ==========
    specialization: {
      type: String,
      required: [true, "Specialization is required"],
      enum: [
        "Cardiology", "Neurology", "Dermatology", "Pediatrics", 
        "Orthopedics", "Gynecology & Obstetrics", "Ophthalmology", 
        "ENT", "Dentistry", "Psychiatry", "General Medicine",
        "Gastroenterology", "Nephrology", "Urology", "Radiology",
        "Anesthesiology", "Pathology", "Emergency Medicine"
      ]
    },
    subSpecialization: String,
    
    qualifications: [{
      degree: {
        type: String,
        required: true,
        enum: ["MBBS", "BDS", "BMDC", "FCPS", "MD", "MS", "PhD", "FRCS", "MRCP", "Diploma"]
      },
      institute: { type: String, required: true },
      year: { type: Number, required: true, min: 1950, max: new Date().getFullYear() },
      country: { type: String, default: "Bangladesh" },
      certificateUrl: String,
      verified: { type: Boolean, default: false }
    }],
    
    experienceYears: {
      type: Number,
      min: 0,
      default: 0
    },
    
    // ========== CURRENT WORKPLACE ==========
    currentWorkplace: {
      name: { type: String, required: true },
      address: String,
      city: { type: String, required: true },
      district: String,
      contactNumber: String,
      isPrimary: { type: Boolean, default: true }
    },
    
    previousWorkplaces: [{
      name: String,
      fromDate: Date,
      toDate: Date,
      designation: String
    }],
    
    // ========== CONSULTATION SETTINGS ==========
    consultationFee: {
      type: Number,
      required: true,
      min: 0
    },
    followUpFee: {
      type: Number,
      default: function() { return this.consultationFee * 0.5; }
    },
    
    // ========== SCHEDULE ==========
    availableDays: [{
      day: {
        type: String,
        enum: ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
        required: true
      },
      slots: [{
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },
        maxPatients: { type: Number, default: 1 },
        type: { type: String, enum: ["in-person", "video", "phone"], default: "in-person" },
        isBooked: { type: Boolean, default: false }
      }],
      isAvailable: { type: Boolean, default: true },
      location: String // For in-person consultation
    }],
    
    consultationTypes: {
      type: [String],
      enum: ["in-person", "video", "phone"],
      default: ["in-person", "video"]
    },
    
    documents: {
      // BMDC Certificate (Required)
      bmdcCertificate: {
        url: String,
        public_id: String,
        verified: { type: Boolean, default: false },
        verifiedAt: Date,
        rejectionReason: String
      },
      // National ID Card (Required)
      nid: {
        url: String,
        public_id: String,
        verified: { type: Boolean, default: false },
        verifiedAt: Date,
        rejectionReason: String
      },
      // MBBS/BDS Certificate (Required)
      basicDegree: {
        url: String,
        public_id: String,
        verified: { type: Boolean, default: false },
        verifiedAt: Date,
        rejectionReason: String
      },
      // Specialization Certificate (If any)
      specializationCertificate: {
        url: String,
        public_id: String,
        verified: { type: Boolean, default: false },
        verifiedAt: Date,
        rejectionReason: String
      },
      // Trade License (For Private Practice)
      tradeLicense: {
        url: String,
        public_id: String,
        verified: { type: Boolean, default: false },
        verifiedAt: Date,
        rejectionReason: String
      },
      // Chamber Photo (Optional)
      chamberPhoto: {
        url: String,
        public_id: String,
        verified: { type: Boolean, default: false }
      },
      // Profile Photo (Required)
      profilePhoto: {
        url: String,
        public_id: String,
        verified: { type: Boolean, default: false }
      }
    },
    
    // ========== VERIFICATION STATUS (Complete Flow) ==========
    verificationStatus: {
      type: String,
      enum: [
        "pending",              // Just registered, waiting to submit profile
        "profile_submitted",    // Profile submitted, waiting for document verification
        "document_verification", // Documents under review
        "bmdc_verification",    // BMDC verification in progress
        "under_review",         // Final review by admin
        "verified",             // FULLY VERIFIED - Dashboard Access
        "rejected",             // Rejected
        "suspended"             // Suspended
      ],
      default: "pending"
    },
    
    verificationHistory: [{
      status: String,
      notes: String,
      updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      updatedAt: { type: Date, default: Date.now }
    }],
    
    verificationNotes: String,
    rejectionReason: String,
    
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    verifiedAt: Date,
    
    // ========== BMDC VERIFICATION DETAILS ==========
    bmdcVerification: {
      verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      verifiedAt: Date,
      verificationNumber: String,
      notes: String
    },
    
    // When profile was completed
    profileCompletedAt: Date,
    documentsSubmittedAt: Date,
    
    // ========== RATINGS & REVIEWS ==========
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    totalPatients: { type: Number, default: 0 },
    totalAppointments: { type: Number, default: 0 },
    
    // ========== EARNINGS & COMMISSION ==========
    commissionRate: { type: Number, default: 20, min: 0, max: 100 },
    totalEarnings: { type: Number, default: 0 },
    pendingWithdrawal: { type: Number, default: 0 },
    
    // ========== BANK INFORMATION ==========
    bankInfo: {
      bankName: String,
      accountNumber: String,
      accountHolderName: String,
      routingNumber: String,
      branchName: String,
      verified: { type: Boolean, default: false }
    },
    mobileBanking: {
      bKash: String,
      nagad: String,
      rocket: String,
      verified: { type: Boolean, default: false }
    },
    
    // ========== CHAMBER INFORMATION ==========
    chambers: [{
      name: String,
      address: String,
      city: String,
      phone: String,
      consultationFee: Number,
      availableDays: [String],
      availableTime: String,
      isPrimary: { type: Boolean, default: false }
    }]
  },
  { timestamps: true }
);

// Indexes for better performance
doctorSchema.index({ specialization: 1, verificationStatus: 1 });
doctorSchema.index({ bmdcRegNo: 1 });
doctorSchema.index({ verificationStatus: 1, createdAt: 1 });
doctorSchema.index({ "user": 1 });
doctorSchema.index({ rating: -1 });

// Virtual for profile completion percentage
doctorSchema.virtual('profileCompletionPercentage').get(function() {
  const fields = [
    this.specialization,
    this.qualifications?.length > 0,
    this.experienceYears > 0,
    this.currentWorkplace?.name,
    this.consultationFee > 0,
    this.availableDays?.length > 0,
    this.documents?.bmdcCertificate?.url,
    this.documents?.nid?.url,
    this.documents?.basicDegree?.url,
    this.documents?.profilePhoto?.url
  ];
  const completed = fields.filter(Boolean).length;
  return Math.round((completed / fields.length) * 100);
});

export const Doctor = mongoose.model("Doctor", doctorSchema);