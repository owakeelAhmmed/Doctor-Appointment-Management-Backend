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
    diagnosis: {
      type: String,
      required: true,
    },
    medicines: [
      {
        name: String,
        dosage: String,
        frequency: String,
        duration: String,
        instructions: String,
      },
    ],
    tests: [
      {
        name: String,
        instructions: String,
      },
    ],
    advice: {
      type: String,
    },
    followUpDate: {
      type: Date,
    },
    isDigital: {
      type: Boolean,
      default: true,
    },
    pdfUrl: String,
  },
  {
    timestamps: true,
  }
);

export const Prescription = mongoose.model("Prescription", prescriptionSchema);