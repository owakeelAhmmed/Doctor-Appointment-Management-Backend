import mongoose from "mongoose";

const patientSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // Medical Information
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },
    allergies: {
      type: [String],
      default: [],
    },
    chronicDiseases: {
      type: [String],
      default: [],
    },
    emergencyContact: {
      name: String,
      phone: String,
      relation: String,
    },

    // Medical History
    medicalHistory: [
      {
        condition: String,
        diagnosedDate: Date,
        notes: String,
      },
    ],
    surgeries: [
      {
        name: String,
        date: Date,
        hospital: String,
        notes: String,
      },
    ],
    medications: [
      {
        name: String,
        dosage: String,
        frequency: String,
        startDate: Date,
        endDate: Date,
        prescribedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Doctor",
        },
      },
    ],

    // Lifestyle
    smoking: {
      type: String,
      enum: ["yes", "no", "occasional"],
      default: "no",
    },
    alcohol: {
      type: String,
      enum: ["yes", "no", "occasional"],
      default: "no",
    },
    exercise: {
      type: String,
      enum: ["daily", "weekly", "rarely", "never"],
      default: "rarely",
    },

    // Family History
    familyHistory: [
      {
        relation: String,
        condition: String,
        ageAtDiagnosis: Number,
      },
    ],

    // Insurance Information
    insurance: {
      provider: String,
      policyNumber: String,
      expiryDate: Date,
      coverage: String,
    },

    // Preferences
    preferences: {
      language: {
        type: String,
        enum: ["bangla", "english"],
        default: "bangla",
      },
      notification: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
      },
      defaultPaymentMethod: {
        type: String,
        enum: ["bKash", "Nagad", "card", "cash"],
        default: "bKash",
      },
    },

    // Statistics
    totalAppointments: {
      type: Number,
      default: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
    },
    lastVisit: Date,
    favoriteDoctors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Doctor",
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const Patient = mongoose.model("Patient", patientSchema);