import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
    },
    
    appointmentDate: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    symptoms: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ["in-person", "video", "phone"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled", "rescheduled", "no-show"],
      default: "pending",
    },
    fee: {
      type: Number,
      required: true,
    },
    
    doctorInfo: {
      name: String,
      specialization: String,
      profileImage: String,
      consultationFee: Number,
    },
    
    patientInfo: {
      name: String,
      email: String,
      phone: String,
      profileImage: String,
    },
    
    meetingLink: {
      type: String,
    },
    notes: {
      type: String,
    },
    cancelledAt: Date,
    cancellationReason: String,
    rescheduledFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
    },
    prescription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Prescription",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
appointmentSchema.index({ patientId: 1, appointmentDate: -1 });
appointmentSchema.index({ doctorId: 1, appointmentDate: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ patientId: 1, status: 1 });
appointmentSchema.index({ doctorId: 1, status: 1 });

export const Appointment = mongoose.model("Appointment", appointmentSchema);