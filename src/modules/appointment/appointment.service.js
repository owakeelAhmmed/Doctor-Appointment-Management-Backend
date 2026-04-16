import { Appointment } from "./appointment.model.js";
import { Patient } from "../patient/patient.model.js";
import { Doctor } from "../doctor/doctor.model.js";
import { User } from "../auth/auth.model.js";
import { Payment } from "../payment/payment.model.js";
import { Prescription } from "../prescription/prescription.model.js";
import { sendEmail } from "../../services/email.service.js";
import { sendSMS } from "../../services/sms.service.js";
import { ApiError } from "../../utils/apiError.js";
import crypto from "crypto";

export class AppointmentService {

  // ==================== Booking & Management ====================

  /**
   * Book new appointment
   */
  static async bookAppointment(userId, bookingData) {
    const { doctorId, appointmentDate, startTime, symptoms, type, paymentMethod } = bookingData;

    // Get patient
    const patient = await Patient.findOne({ user: userId });
    if (!patient) {
      throw new ApiError(404, "Patient profile not found");
    }

    // Check if doctor exists and is verified
    const doctor = await Doctor.findOne({
      _id: doctorId,
      verificationStatus: "verified"
    }).populate("user");

    if (!doctor) {
      throw new ApiError(404, "Doctor not found or not verified");
    }

    // Validate slot availability
    await this.validateSlotAvailability(doctorId, appointmentDate, startTime);

    // Calculate end time (default 30 minutes)
    const endTime = this.calculateEndTime(startTime);

    // Check for duplicate booking
    const existingAppointment = await Appointment.findOne({
      doctor: doctorId,
      patient: patient._id,
      appointmentDate,
      startTime,
      status: { $in: ["pending", "confirmed"] },
    });

    if (existingAppointment) {
      throw new ApiError(400, "You already have an appointment at this time");
    }

    // Create appointment
    const appointment = await Appointment.create({
      patient: patient._id,
      doctor: doctorId,
      appointmentDate,
      startTime,
      endTime,
      symptoms,
      type,
      fee: doctor.consultationFee,
      status: "pending",
    });

    // Create payment record
    const payment = await Payment.create({
      appointment: appointment._id,
      patient: patient._id,
      doctor: doctorId,
      amount: doctor.consultationFee,
      paymentMethod: paymentMethod || "bKash",
      platformFee: Math.round(doctor.consultationFee * (doctor.commissionRate / 100)),
      doctorAmount: doctor.consultationFee - Math.round(doctor.consultationFee * (doctor.commissionRate / 100)),
      status: "pending",
    });

    // Update appointment with payment reference
    appointment.payment = payment._id;
    await appointment.save();

    // Send notifications
    await this.sendBookingNotifications(appointment, doctor, patient);

    // Generate video link if video consultation
    let meetingLink = null;
    if (type === "video") {
      meetingLink = await this.generateMeetingLink(appointment._id);
    }

    return {
      appointment,
      payment,
      meetingLink,
      message: "Appointment booked successfully. Please complete payment to confirm.",
    };
  }

  /**
   * Validate slot availability
   */
  static async validateSlotAvailability(doctorId, date, time) {
    const doctor = await Doctor.findById(doctorId);

    if (!doctor) {
      throw new ApiError(404, "Doctor not found");
    }

    const dayName = new Date(date).toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();

    // Check doctor's available days
    const daySchedule = doctor.availableDays.find(d => d.day === dayName);

    if (!daySchedule || !daySchedule.isAvailable) {
      throw new ApiError(400, "Doctor not available on this day");
    }

    // Check if time slot exists in schedule
    const slot = daySchedule.slots.find(s => s.startTime === time);
    if (!slot) {
      throw new ApiError(400, "Selected time slot not available");
    }

    // Check if slot is already booked
    const bookedCount = await Appointment.countDocuments({
      doctor: doctorId,
      appointmentDate: date,
      startTime: time,
      status: { $in: ["confirmed", "pending"] },
    });

    if (bookedCount >= (slot.maxPatients || 1)) {
      throw new ApiError(400, "This time slot is fully booked");
    }

    return true;
  }

  /**
   * Calculate end time (30 minutes after start)
   */
  static calculateEndTime(startTime) {
    const [hours, minutes] = startTime.split(":").map(Number);
    const endMinutes = minutes + 30;
    const endHours = hours + Math.floor(endMinutes / 60);
    const endMinutesFormatted = endMinutes % 60;

    return `${endHours.toString().padStart(2, "0")}:${endMinutesFormatted.toString().padStart(2, "0")}`;
  }

  /**
   * Generate meeting link for video consultation
   */
  static async generateMeetingLink(appointmentId) {
    // You can integrate with Zoom/Google Meet/Jitsi here
    // For now, generate a simple unique link
    const uniqueId = crypto.randomBytes(16).toString("hex");
    const meetingLink = `https://meet.doctorsystem.com/${appointmentId}-${uniqueId}`;

    await Appointment.findByIdAndUpdate(appointmentId, { meetingLink });

    return meetingLink;
  }

  /**
   * Send booking notifications
   */
  static async sendBookingNotifications(appointment, doctor, patient) {
    const patientUser = await User.findById(patient.user);
    const doctorUser = doctor.user;

    // Email to patient
    await sendEmail({
      to: patientUser.email,
      subject: "Appointment Booked - Pending Payment",
      template: "appointment-booked-patient",
      data: {
        patientName: patientUser.fullName,
        doctorName: doctorUser.fullName,
        doctorSpecialization: doctor.specialization,
        date: new Date(appointment.appointmentDate).toLocaleDateString("bn-BD"),
        time: appointment.startTime,
        fee: appointment.fee,
        type: appointment.type,
      },
    });

    // SMS to patient
    await sendSMS({
      to: patientUser.phone,
      message: `Your appointment with Dr. ${doctorUser.fullName} on ${new Date(
        appointment.appointmentDate
      ).toLocaleDateString("bn-BD")} at ${appointment.startTime} is pending payment. Please complete payment to confirm.`,
    });

    // Email to doctor
    await sendEmail({
      to: doctorUser.email,
      subject: "New Appointment Request",
      template: "appointment-booked-doctor",
      data: {
        doctorName: doctorUser.fullName,
        patientName: patientUser.fullName,
        date: new Date(appointment.appointmentDate).toLocaleDateString("bn-BD"),
        time: appointment.startTime,
        type: appointment.type,
      },
    });
  }

  /**
   * Confirm appointment after payment
   */
  static async confirmAppointment(appointmentId, paymentId) {
    const appointment = await Appointment.findById(appointmentId)
      .populate("patient")
      .populate("doctor");

    if (!appointment) {
      throw new ApiError(404, "Appointment not found");
    }

    appointment.status = "confirmed";
    await appointment.save();

    // Update payment status
    await Payment.findByIdAndUpdate(paymentId, {
      status: "completed",
      paymentDate: new Date(),
    });

    // Send confirmation notifications
    await this.sendConfirmationNotifications(appointment);

    return appointment;
  }

  /**
   * Send confirmation notifications
   */
  static async sendConfirmationNotifications(appointment) {
    const patientUser = await User.findById(appointment.patient.user);
    const doctorUser = await User.findById(appointment.doctor.user);

    // Email to patient
    await sendEmail({
      to: patientUser.email,
      subject: "Appointment Confirmed",
      template: "appointment-confirmed-patient",
      data: {
        patientName: patientUser.fullName,
        doctorName: doctorUser.fullName,
        date: new Date(appointment.appointmentDate).toLocaleDateString("bn-BD"),
        time: appointment.startTime,
        meetingLink: appointment.meetingLink,
      },
    });

    // SMS to patient
    await sendSMS({
      to: patientUser.phone,
      message: `Your appointment with Dr. ${doctorUser.fullName} on ${new Date(
        appointment.appointmentDate
      ).toLocaleDateString("bn-BD")} at ${appointment.startTime} is confirmed. ${appointment.meetingLink ? `Join: ${appointment.meetingLink}` : ""
        }`,
    });

    // Email to doctor
    await sendEmail({
      to: doctorUser.email,
      subject: "Appointment Confirmed",
      template: "appointment-confirmed-doctor",
      data: {
        doctorName: doctorUser.fullName,
        patientName: patientUser.fullName,
        date: new Date(appointment.appointmentDate).toLocaleDateString("bn-BD"),
        time: appointment.startTime,
      },
    });
  }

  // ==================== Status Management ====================

  /**
   * Update appointment status (by doctor)
   */
  static async updateStatus(doctorId, appointmentId, statusData) {
    const { status, notes } = statusData;

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      doctor: doctorId,
    })
      .populate("patient")
      .populate("doctor");

    if (!appointment) {
      throw new ApiError(404, "Appointment not found");
    }

    // Validate status transition
    const validTransitions = {
      confirmed: ["completed", "cancelled", "no-show"],
      pending: ["confirmed", "cancelled"],
    };

    if (!validTransitions[appointment.status]?.includes(status)) {
      throw new ApiError(400, `Cannot change status from ${appointment.status} to ${status}`);
    }

    // Update status
    appointment.status = status;
    if (notes) appointment.notes = notes;

    // Handle special cases
    if (status === "completed") {
      appointment.completedAt = new Date();

      // Update doctor stats
      await Doctor.findByIdAndUpdate(doctorId, {
        $inc: { totalPatients: 1 },
      });

      // Update patient stats
      await Patient.findByIdAndUpdate(appointment.patient._id, {
        $inc: { totalAppointments: 1, totalSpent: appointment.fee },
        lastVisit: new Date(),
      });
    }

    if (status === "cancelled") {
      appointment.cancelledAt = new Date();
      appointment.cancellationReason = notes || "Cancelled by doctor";
    }

    await appointment.save();

    // Send notifications
    await this.sendStatusUpdateNotifications(appointment, status);

    return appointment;
  }

  /**
   * Send status update notifications
   */
  static async sendStatusUpdateNotifications(appointment, status) {
    const patientUser = await User.findById(appointment.patient.user);

    const statusMessages = {
      confirmed: "has been confirmed",
      completed: "is completed",
      cancelled: "has been cancelled",
      "no-show": "marked as no-show",
    };

    await sendSMS({
      to: patientUser.phone,
      message: `Your appointment with Dr. ${appointment.doctor.user.fullName} on ${new Date(appointment.appointmentDate).toLocaleDateString("bn-BD")
        } at ${appointment.startTime} ${statusMessages[status]}.`,
    });
  }

  /**
   * Cancel appointment (by patient)
   */
  static async cancelAppointment(userId, appointmentId, cancelData) {
    const { reason, cancelledBy = "patient" } = cancelData;

    const patient = await Patient.findOne({ user: userId });
    if (!patient) {
      throw new ApiError(404, "Patient not found");
    }

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      patient: patient._id,
    }).populate("doctor");

    if (!appointment) {
      throw new ApiError(404, "Appointment not found");
    }

    if (appointment.status === "completed") {
      throw new ApiError(400, "Cannot cancel completed appointment");
    }

    if (appointment.status === "cancelled") {
      throw new ApiError(400, "Appointment already cancelled");
    }

    // Calculate refund based on cancellation policy
    const refundAmount = this.calculateRefund(appointment);

    // Update appointment
    appointment.status = "cancelled";
    appointment.cancelledAt = new Date();
    appointment.cancellationReason = reason || "Cancelled by patient";
    await appointment.save();

    // Update payment status
    if (appointment.payment) {
      await Payment.findByIdAndUpdate(appointment.payment, {
        status: refundAmount > 0 ? "refunded" : "cancelled",
        refundAmount,
        refundedAt: new Date(),
      });
    }

    // Send notifications
    await this.sendCancellationNotifications(appointment, reason, refundAmount);

    return {
      appointment,
      refundAmount,
      message: refundAmount > 0
        ? `Appointment cancelled. ${refundAmount} BDT will be refunded.`
        : "Appointment cancelled. No refund applicable.",
    };
  }

  /**
   * Calculate refund amount based on cancellation time
   */
  static calculateRefund(appointment) {
    const appointmentTime = new Date(appointment.appointmentDate);
    const [hours, minutes] = appointment.startTime.split(":");
    appointmentTime.setHours(parseInt(hours), parseInt(minutes), 0);

    const now = new Date();
    const hoursDiff = (appointmentTime - now) / (1000 * 60 * 60);

    // Cancellation policy:
    // - 24+ hours before: 100% refund
    // - 12-24 hours before: 50% refund
    // - 6-12 hours before: 25% refund
    // - Less than 6 hours: No refund

    if (hoursDiff >= 24) {
      return appointment.fee;
    } else if (hoursDiff >= 12) {
      return Math.round(appointment.fee * 0.5);
    } else if (hoursDiff >= 6) {
      return Math.round(appointment.fee * 0.25);
    } else {
      return 0;
    }
  }

  /**
   * Send cancellation notifications
   */
  static async sendCancellationNotifications(appointment, reason, refundAmount) {
    const patientUser = await User.findById(appointment.patient.user);
    const doctorUser = await User.findById(appointment.doctor.user);

    // Notify patient
    await sendSMS({
      to: patientUser.phone,
      message: `Your appointment on ${new Date(
        appointment.appointmentDate
      ).toLocaleDateString("bn-BD")} at ${appointment.startTime} has been cancelled. ${refundAmount > 0 ? `Refund: ${refundAmount} BDT` : ""
        }`,
    });

    // Notify doctor
    await sendSMS({
      to: doctorUser.phone,
      message: `Appointment on ${new Date(
        appointment.appointmentDate
      ).toLocaleDateString("bn-BD")} at ${appointment.startTime} has been cancelled by patient. ${reason ? `Reason: ${reason}` : ""
        }`,
    });
  }

  /**
   * Reschedule appointment
   */
  static async rescheduleAppointment(userId, appointmentId, rescheduleData) {
    const { newDate, newTime, reason } = rescheduleData;

    const patient = await Patient.findOne({ user: userId });
    if (!patient) {
      throw new ApiError(404, "Patient not found");
    }

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      patient: patient._id,
    }).populate("doctor");

    if (!appointment) {
      throw new ApiError(404, "Appointment not found");
    }

    if (appointment.status !== "confirmed") {
      throw new ApiError(400, "Only confirmed appointments can be rescheduled");
    }

    // Validate new slot availability
    await this.validateSlotAvailability(appointment.doctor._id, newDate, newTime);

    // Store old details for history
    const oldDate = appointment.appointmentDate;
    const oldTime = appointment.startTime;

    // Update appointment
    appointment.appointmentDate = newDate;
    appointment.startTime = newTime;
    appointment.endTime = this.calculateEndTime(newTime);
    appointment.status = "rescheduled";
    appointment.notes = reason ? `Rescheduled: ${reason}` : "Rescheduled by patient";
    await appointment.save();

    // Send notifications
    await this.sendRescheduleNotifications(appointment, oldDate, oldTime, reason);

    return appointment;
  }

  /**
   * Send reschedule notifications
   */
  static async sendRescheduleNotifications(appointment, oldDate, oldTime, reason) {
    const patientUser = await User.findById(appointment.patient.user);
    const doctorUser = await User.findById(appointment.doctor.user);

    const oldDateStr = new Date(oldDate).toLocaleDateString("bn-BD");
    const newDateStr = new Date(appointment.appointmentDate).toLocaleDateString("bn-BD");

    // Notify patient
    await sendSMS({
      to: patientUser.phone,
      message: `Your appointment has been rescheduled from ${oldDateStr} ${oldTime} to ${newDateStr} ${appointment.startTime}.`,
    });

    // Notify doctor
    await sendSMS({
      to: doctorUser.phone,
      message: `Appointment rescheduled: ${oldDateStr} ${oldTime} → ${newDateStr} ${appointment.startTime}. ${reason ? `Reason: ${reason}` : ""
        }`,
    });
  }

  // ==================== Query Methods ====================

  /**
   * Get appointments for a user based on role
   */
  static async getAppointments(userId, role, filters) {
    const { status, type, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    console.log('=== DEBUG START ===');
    console.log('userId:', userId.toString());
    console.log('role:', role);

    let query = {};

    if (role === "patient") {
      // প্রথমে patient খুঁজুন
      const patient = await Patient.findOne({ user: userId });
      console.log('Patient found:', patient ? patient._id : 'NOT FOUND');
      
      if (!patient) {
        console.log('❌ Patient not found for user:', userId);
        return {
          appointments: [],
          pagination: { page, limit, total: 0, pages: 0 }
        };
      }
      
      query.patient = patient._id;
      console.log('Query patient ID:', query.patient);
      
      // সরাসরি DB থেকে কাউন্ট চেক করুন
      const directCount = await Appointment.countDocuments({ patient: patient._id });
      console.log('Direct count in DB:', directCount);
    }

    // Add status filter if not 'all'
    if (status && status !== 'all') {
      query.status = status;
    }

    // Add type filter if not 'all'
    if (type && type !== 'all') {
      query.type = type;
    }

    console.log('Final query:', JSON.stringify(query));

    // Execute query
    const appointments = await Appointment.find(query)
      .populate({
        path: "patient",
        populate: {
          path: "user",
          select: "fullName phone email profileImage",
        },
      })
      .populate({
        path: "doctor",
        populate: {
          path: "user",
          select: "fullName specialization profileImage",
        },
      })
      .populate("payment")
      .populate("prescription")
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ appointmentDate: -1, startTime: -1 });

    console.log('Appointments found:', appointments.length);
    
    if (appointments.length > 0) {
      console.log('First appointment doctor:', appointments[0].doctor?.user?.fullName);
    }

    const total = await Appointment.countDocuments(query);
    console.log('Total count:', total);
    console.log('=== DEBUG END ===');

    return {
      appointments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single appointment details
   */
  static async getAppointmentDetails(userId, role, appointmentId) {
    let query = { _id: appointmentId };

    if (role === "patient") {
      const patient = await Patient.findOne({ user: userId });
      if (!patient) throw new ApiError(404, "Patient not found");
      query.patient = patient._id;
    } else if (role === "doctor") {
      const doctor = await Doctor.findOne({ user: userId });
      if (!doctor) throw new ApiError(404, "Doctor not found");
      query.doctor = doctor._id;
    }

    const appointment = await Appointment.findOne(query)
      .populate({
        path: "patient",
        populate: {
          path: "user",
          select: "fullName email phone profileImage dateOfBirth gender address",
        },
      })
      .populate({
        path: "doctor",
        populate: {
          path: "user",
          select: "fullName email phone profileImage",
        },
      })
      .populate("payment")
      .populate("prescription");

    if (!appointment) {
      throw new ApiError(404, "Appointment not found");
    }

    // Get patient's medical history for doctor
    let medicalHistory = null;
    if (role === "doctor") {
      const patient = await Patient.findById(appointment.patient._id);
      medicalHistory = {
        allergies: patient?.allergies || [],
        chronicDiseases: patient?.chronicDiseases || [],
        medicalHistory: patient?.medicalHistory || [],
        medications: patient?.medications || [],
        bloodGroup: patient?.bloodGroup,
      };
    }

    return {
      appointment,
      medicalHistory,
    };
  }

  /**
   * Get today's appointments for doctor
   */
  static async getTodayAppointments(doctorId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointments = await Appointment.find({
      doctor: doctorId,
      appointmentDate: { $gte: today, $lt: tomorrow },
      status: { $in: ["confirmed", "pending"] },
    })
      .populate({
        path: "patient",
        populate: {
          path: "user",
          select: "fullName phone profileImage age",
        },
      })
      .sort({ startTime: 1 });

    const summary = {
      total: appointments.length,
      confirmed: appointments.filter(a => a.status === "confirmed").length,
      pending: appointments.filter(a => a.status === "pending").length,
      completed: appointments.filter(a => a.status === "completed").length,
      inPerson: appointments.filter(a => a.type === "in-person").length,
      video: appointments.filter(a => a.type === "video").length,
      phone: appointments.filter(a => a.type === "phone").length,
    };

    return {
      date: today,
      appointments,
      summary,
    };
  }

  /**
   * Get upcoming appointments for patient
   */
  static async getUpcomingAppointments(patientId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const appointments = await Appointment.find({
      patient: patientId,
      appointmentDate: { $gte: today },
      status: { $in: ["confirmed", "pending"] },
    })
      .populate({
        path: "doctor",
        populate: {
          path: "user",
          select: "fullName specialization profileImage",
        },
      })
      .sort({ appointmentDate: 1, startTime: 1 })
      .limit(10);

    return appointments;
  }

  /**
   * Get appointment history for patient
   */
  static async getAppointmentHistory(patientId, limit = 20) {
    const appointments = await Appointment.find({
      patient: patientId,
      status: { $in: ["completed", "cancelled", "no-show"] },
    })
      .populate({
        path: "doctor",
        populate: {
          path: "user",
          select: "fullName specialization",
        },
      })
      .populate("prescription")
      .sort({ appointmentDate: -1, startTime: -1 })
      .limit(limit);

    return appointments;
  }

  // ==================== Prescription Management ====================

  /**
   * Add prescription to appointment
   */
  static async addPrescription(doctorId, appointmentId, prescriptionData) {
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      doctor: doctorId,
    }).populate("patient");

    if (!appointment) {
      throw new ApiError(404, "Appointment not found");
    }

    if (appointment.status !== "confirmed" && appointment.status !== "completed") {
      throw new ApiError(400, "Can only add prescription to confirmed or completed appointments");
    }

    // Create prescription
    const prescription = await Prescription.create({
      appointment: appointmentId,
      patient: appointment.patient._id,
      doctor: doctorId,
      ...prescriptionData,
    });

    // Update appointment
    appointment.prescription = prescription._id;
    if (appointment.status === "confirmed") {
      appointment.status = "completed";
    }
    await appointment.save();

    // Send notification to patient
    const patientUser = await User.findById(appointment.patient.user);

    await sendSMS({
      to: patientUser.phone,
      message: `Your prescription for appointment on ${new Date(
        appointment.appointmentDate
      ).toLocaleDateString("bn-BD")} is ready. Please check your email or app.`,
    });

    await sendEmail({
      to: patientUser.email,
      subject: "Your Prescription is Ready",
      template: "prescription-ready",
      data: {
        patientName: patientUser.fullName,
        doctorName: (await User.findById(appointment.doctor.user)).fullName,
        date: new Date(appointment.appointmentDate).toLocaleDateString("bn-BD"),
        prescriptionId: prescription._id,
      },
    });

    return prescription;
  }

  /**
   * Get prescription for appointment
   */
  static async getPrescription(userId, role, appointmentId) {
    let query = { appointment: appointmentId };

    if (role === "patient") {
      const patient = await Patient.findOne({ user: userId });
      if (!patient) throw new ApiError(404, "Patient not found");
      query.patient = patient._id;
    } else if (role === "doctor") {
      const doctor = await Doctor.findOne({ user: userId });
      if (!doctor) throw new ApiError(404, "Doctor not found");
      query.doctor = doctor._id;
    }

    const prescription = await Prescription.findOne(query)
      .populate({
        path: "doctor",
        populate: {
          path: "user",
          select: "fullName specialization",
        },
      })
      .populate({
        path: "patient",
        populate: {
          path: "user",
          select: "fullName",
        },
      });

    if (!prescription) {
      throw new ApiError(404, "Prescription not found");
    }

    return prescription;
  }

  // ==================== Statistics ====================

  /**
   * Get appointment statistics for dashboard
   */
  static async getStatistics(role, id) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    let match = {};
    if (role === "doctor") {
      match.doctor = id;
    } else if (role === "patient") {
      match.patient = id;
    }

    const [
      total,
      todayCount,
      thisWeek,
      thisMonth,
      thisYear,
      byStatus,
      byType,
    ] = await Promise.all([
      Appointment.countDocuments(match),
      Appointment.countDocuments({ ...match, appointmentDate: { $gte: today } }),
      Appointment.countDocuments({ ...match, appointmentDate: { $gte: startOfWeek } }),
      Appointment.countDocuments({ ...match, appointmentDate: { $gte: startOfMonth } }),
      Appointment.countDocuments({ ...match, appointmentDate: { $gte: startOfYear } }),
      Appointment.aggregate([
        { $match: match },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Appointment.aggregate([
        { $match: match },
        { $group: { _id: "$type", count: { $sum: 1 } } },
      ]),
    ]);

    return {
      total,
      today: todayCount,
      thisWeek,
      thisMonth,
      thisYear,
      byStatus: byStatus.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}),
      byType: byType.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}),
    };
  }
}