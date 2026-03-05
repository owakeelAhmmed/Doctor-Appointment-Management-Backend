import mongoose from "mongoose";

const prescriptionSchema = new mongoose.Schema(
  {
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
      unique: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    
    // Diagnosis
    diagnosis: {
      type: String,
      required: true,
    },
    
    // Medicines
    medicines: [
      {
        name: { type: String, required: true },
        dosage: { type: String, required: true },
        frequency: { type: String, required: true },
        duration: String,
        instructions: String,
        beforeMeal: { type: Boolean, default: true },
      },
    ],
    
    // Tests
    tests: [
      {
        name: { type: String, required: true },
        instructions: String,
        isCompleted: { type: Boolean, default: false },
      },
    ],
    
    // Advice
    advice: {
      type: String,
    },
    
    // Follow-up
    followUpDate: {
      type: Date,
    },
    
    // Additional Info
    notes: String,
    
    // Digital Signature
    digitalSignature: {
      url: String,
      public_id: String,
    },
    
    // PDF Version
    pdfUrl: String,
    
    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
prescriptionSchema.index({ patient: 1, createdAt: -1 });
prescriptionSchema.index({ doctor: 1, createdAt: -1 });
prescriptionSchema.index({ appointment: 1 }, { unique: true });

export const Prescription = mongoose.model("Prescription", prescriptionSchema);