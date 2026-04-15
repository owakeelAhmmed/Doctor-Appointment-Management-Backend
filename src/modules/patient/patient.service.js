import { Patient } from "./patient.model.js";
import { User } from "../auth/auth.model.js";
import { Doctor } from "../doctor/doctor.model.js";
import { Appointment } from "../appointment/appointment.model.js";
import { Review } from "../review/review.model.js";
import { Payment } from "../payment/payment.model.js";
import { sendEmail } from "../../services/email.service.js";
import { sendSMS } from "../../services/sms.service.js";
import { ApiError } from "../../utils/apiError.js";

export class PatientService {

  // ==================== Profile Management ====================

  /**
   * Get patient profile
   */
  static async getProfile(userId) {
    const user = await User.findById(userId).select("-password -emailOTP -phoneOTP -resetPasswordToken -resetPasswordExpire");

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    let patient = await Patient.findOne({ user: userId });

    // Create patient profile if doesn't exist
    if (!patient) {
      patient = await Patient.create({ user: userId });
    }

    return {
      user,
      patient,
    };
  }

  /**
   * Update patient profile
   */
  static async updateProfile(userId, updateData) {
    // Separate user and patient updates
    const userUpdateData = {};
    const patientUpdateData = {};

    // User fields
    if (updateData.fullName) userUpdateData.fullName = updateData.fullName;
    if (updateData.address) userUpdateData.address = updateData.address;
    if (updateData.profileImage) userUpdateData.profileImage = updateData.profileImage;

    // Patient fields
    if (updateData.bloodGroup !== undefined) patientUpdateData.bloodGroup = updateData.bloodGroup;
    if (updateData.allergies !== undefined) patientUpdateData.allergies = updateData.allergies;
    if (updateData.chronicDiseases !== undefined) patientUpdateData.chronicDiseases = updateData.chronicDiseases;
    if (updateData.emergencyContact !== undefined) patientUpdateData.emergencyContact = updateData.emergencyContact;
    if (updateData.preferences !== undefined) patientUpdateData.preferences = updateData.preferences;

    // Update user
    const user = await User.findByIdAndUpdate(
      userId,
      userUpdateData,
      { new: true, runValidators: true }
    ).select("-password -emailOTP -phoneOTP -resetPasswordToken -resetPasswordExpire");

    // Update patient
    const patient = await Patient.findOneAndUpdate(
      { user: userId },
      patientUpdateData,
      { new: true, upsert: true, runValidators: true }
    );

    return { user, patient };
  }

  // patient.service.js - Add this method

  static async updateProfileImage(userId, file) {
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const uploaded = await uploadMedia({
      buffer: file.buffer,
      originalFilename: file.originalname,
      ownerType: "users",
      ownerId: userId,
      folder: "profile-images",
    });

    user.profileImage = {
      url: uploaded.url,
      public_id: uploaded.public_id,
    };

    await user.save();

    return user.profileImage;
  }

  /**
   * Add medical history
   */
  static async addMedicalHistory(userId, historyData) {
    const patient = await Patient.findOne({ user: userId });

    if (!patient) {
      throw new ApiError(404, "Patient profile not found");
    }

    patient.medicalHistory.push(historyData);
    await patient.save();

    return patient.medicalHistory;
  }

  /**
   * Add medication
   */
  static async addMedication(userId, medicationData) {
    const patient = await Patient.findOne({ user: userId });

    if (!patient) {
      throw new ApiError(404, "Patient profile not found");
    }

    patient.medications.push(medicationData);
    await patient.save();

    return patient.medications;
  }

  /**
   * Get medical records
   */
  static async getMedicalRecords(userId) {
    const patient = await Patient.findOne({ user: userId })
      .populate("medications.prescribedBy", "user specialization")
      .populate("favoriteDoctors", "user specialization consultationFee rating");

    if (!patient) {
      throw new ApiError(404, "Patient profile not found");
    }

    return {
      medicalHistory: patient.medicalHistory,
      surgeries: patient.surgeries,
      medications: patient.medications,
      allergies: patient.allergies,
      chronicDiseases: patient.chronicDiseases,
      familyHistory: patient.familyHistory,
      bloodGroup: patient.bloodGroup,
    };
  }

  // ==================== Doctor Search ====================

  /**
   * Search doctors with filters
   */
  static async searchDoctors(filters, pagination) {
    const { specialization, city, name, minFee, maxFee, rating, availableToday } = filters;
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    // Build query
    const query = { verificationStatus: "verified" };

    if (specialization) {
      query.specialization = { $regex: specialization, $options: "i" };
    }

    if (city) {
      query["currentWorkplace.address"] = { $regex: city, $options: "i" };
    }

    if (minFee || maxFee) {
      query.consultationFee = {};
      if (minFee) query.consultationFee.$gte = Number(minFee);
      if (maxFee) query.consultationFee.$lte = Number(maxFee);
    }

    if (rating) {
      query.rating = { $gte: Number(rating) };
    }

    if (availableToday) {
      const today = new Date().toLocaleDateString("en-US", { weekday: "lowercase" });
      query["availableDays.day"] = today;
      query["availableDays.isAvailable"] = true;
    }

    // If searching by doctor name
    if (name) {
      const users = await User.find({
        fullName: { $regex: name, $options: "i" },
        role: "doctor",
      }).select("_id");

      query.user = { $in: users.map(u => u._id) };
    }

    // Execute query
    const doctors = await Doctor.find(query)
      .populate("user", "fullName email phone profileImage")
      .skip(skip)
      .limit(limit)
      .sort({ rating: -1, totalReviews: -1 });

    const total = await Doctor.countDocuments(query);

    return {
      doctors,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get doctor details by ID
   */
  static async getDoctorDetails(doctorId) {
    const doctor = await Doctor.findOne({
      _id: doctorId,
      verificationStatus: "verified"
    }).populate("user", "fullName email phone profileImage address");

    if (!doctor) {
      throw new ApiError(404, "Doctor not found");
    }

    // Get doctor's reviews
    const reviews = await Review.find({ doctor: doctorId })
      .populate("patient", "user")
      .populate({
        path: "patient",
        populate: {
          path: "user",
          select: "fullName profileImage",
        },
      })
      .sort({ createdAt: -1 })
      .limit(20);

    // Get available slots
    const availableSlots = await this.getDoctorAvailableSlots(doctorId);

    return {
      doctor,
      reviews,
      availableSlots,
      stats: {
        rating: doctor.rating,
        totalReviews: doctor.totalReviews,
        totalPatients: doctor.totalPatients,
        experience: doctor.experienceYears,
      },
    };
  }

  /**
   * Get doctor's available slots
   */
  static async getDoctorAvailableSlots(doctorId) {
    const doctor = await Doctor.findById(doctorId);

    if (!doctor) {
      throw new ApiError(404, "Doctor not found");
    }

    const today = new Date();
    const next7Days = [];

    // Generate next 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      const dayName = date.toLocaleDateString("en-US", { weekday: "lowercase" });

      const daySchedule = doctor.availableDays.find(d => d.day === dayName);

      if (daySchedule && daySchedule.isAvailable) {
        // Get booked appointments for this date
        const bookedAppointments = await Appointment.find({
          doctor: doctorId,
          appointmentDate: {
            $gte: new Date(date.setHours(0, 0, 0)),
            $lt: new Date(date.setHours(23, 59, 59)),
          },
          status: { $in: ["confirmed", "pending"] },
        }).select("startTime");

        const bookedTimes = bookedAppointments.map(a => a.startTime);

        // Filter available slots
        const availableSlots = daySchedule.slots.filter(slot =>
          !bookedTimes.includes(slot.startTime)
        );

        if (availableSlots.length > 0) {
          next7Days.push({
            date: date.toISOString().split("T")[0],
            day: dayName,
            slots: availableSlots,
          });
        }
      }
    }

    return next7Days;
  }

  // ==================== Appointment Management ====================

  /**
   * Book appointment
   */
  static async bookAppointment(userId, bookingData) {
    const { doctorId, appointmentDate, startTime, symptoms, type } = bookingData;

    // Check if doctor exists and is verified
    const doctor = await Doctor.findOne({
      _id: doctorId,
      verificationStatus: "verified"
    });

    if (!doctor) {
      throw new ApiError(404, "Doctor not found or not verified");
    }

    // Check if patient has profile
    let patient = await Patient.findOne({ user: userId });
    if (!patient) {
      patient = await Patient.create({ user: userId });
    }

    // Check if slot is available
    const dayName = new Date(appointmentDate).toLocaleDateString("en-US", { weekday: "lowercase" });
    const daySchedule = doctor.availableDays.find(d => d.day === dayName);

    if (!daySchedule || !daySchedule.isAvailable) {
      throw new ApiError(400, "Doctor not available on this day");
    }

    const slot = daySchedule.slots.find(s => s.startTime === startTime);
    if (!slot) {
      throw new ApiError(400, "Selected time slot not available");
    }

    // Check if slot is already booked
    const existingAppointment = await Appointment.findOne({
      doctor: doctorId,
      appointmentDate,
      startTime,
      status: { $in: ["confirmed", "pending"] },
    });

    if (existingAppointment) {
      throw new ApiError(400, "This time slot is already booked");
    }

    // Calculate end time (assuming 30 min slots)
    const [hours, minutes] = startTime.split(":");
    const endTime = new Date();
    endTime.setHours(parseInt(hours), parseInt(minutes) + 30, 0);
    const endTimeStr = `${endTime.getHours().toString().padStart(2, "0")}:${endTime.getMinutes().toString().padStart(2, "0")}`;

    // Create appointment
    const appointment = await Appointment.create({
      patient: patient._id,
      doctor: doctorId,
      appointmentDate,
      startTime,
      endTime: endTimeStr,
      symptoms,
      type,
      status: "pending",
      fee: doctor.consultationFee,
    });

    // Create payment record
    const payment = await Payment.create({
      appointment: appointment._id,
      patient: patient._id,
      doctor: doctorId,
      amount: doctor.consultationFee,
      paymentMethod: bookingData.paymentMethod || "bKash",
      status: "pending",
    });

    // Send confirmation notifications
    await this.sendAppointmentNotifications(appointment, doctor, patient);

    return {
      appointment,
      payment,
      message: "Appointment booked successfully. Please complete payment.",
    };
  }

  /**
   * Send appointment notifications
   */
  static async sendAppointmentNotifications(appointment, doctor, patient) {
    const doctorUser = await User.findById(doctor.user);
    const patientUser = await User.findById(patient.user);

    // Email to patient
    await sendEmail({
      to: patientUser.email,
      subject: "Appointment Confirmation - Pending Payment",
      template: "appointment-booked",
      data: {
        patientName: patientUser.fullName,
        doctorName: doctorUser.fullName,
        date: appointment.appointmentDate,
        time: appointment.startTime,
        fee: appointment.fee,
      },
    });

    // SMS to patient
    await sendSMS({
      to: patientUser.phone,
      message: `Your appointment with Dr. ${doctorUser.fullName} on ${appointment.appointmentDate} at ${appointment.startTime} is pending payment. Please complete payment to confirm.`,
    });

    // Notification to doctor
    // (WebSocket or Push notification)
  }

  /**
   * Get patient's appointments
   */
  static async getMyAppointments(userId, filters) {
    const patient = await Patient.findOne({ user: userId });

    if (!patient) {
      throw new ApiError(404, "Patient profile not found");
    }

    const { status, type, fromDate, toDate, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const query = { patient: patient._id };

    if (status) {
      query.status = status;
    }

    if (type) {
      query.type = type;
    }

    if (fromDate || toDate) {
      query.appointmentDate = {};
      if (fromDate) query.appointmentDate.$gte = new Date(fromDate);
      if (toDate) query.appointmentDate.$lte = new Date(toDate);
    }

    const appointments = await Appointment.find(query)
      .populate({
        path: "doctor",
        populate: {
          path: "user",
          select: "fullName profileImage specialization",
        },
      })
      .populate("payment")
      .skip(skip)
      .limit(limit)
      .sort({ appointmentDate: -1, startTime: -1 });

    const total = await Appointment.countDocuments(query);

    return {
      appointments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single appointment details
   */
  static async getAppointmentDetails(userId, appointmentId) {
    const patient = await Patient.findOne({ user: userId });

    if (!patient) {
      throw new ApiError(404, "Patient profile not found");
    }

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      patient: patient._id,
    })
      .populate({
        path: "doctor",
        populate: {
          path: "user",
          select: "fullName profileImage email phone",
        },
      })
      .populate("payment")
      .populate("prescription");

    if (!appointment) {
      throw new ApiError(404, "Appointment not found");
    }

    return appointment;
  }

  /**
   * Cancel appointment
   */
  static async cancelAppointment(userId, appointmentId) {
    const patient = await Patient.findOne({ user: userId });

    if (!patient) {
      throw new ApiError(404, "Patient profile not found");
    }

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      patient: patient._id,
    });

    if (!appointment) {
      throw new ApiError(404, "Appointment not found");
    }

    if (appointment.status === "completed") {
      throw new ApiError(400, "Cannot cancel completed appointment");
    }

    if (appointment.status === "cancelled") {
      throw new ApiError(400, "Appointment already cancelled");
    }

    // Check cancellation policy
    const appointmentTime = new Date(appointment.appointmentDate);
    appointmentTime.setHours(parseInt(appointment.startTime.split(":")[0]));
    appointmentTime.setMinutes(parseInt(appointment.startTime.split(":")[1]));

    const now = new Date();
    const hoursDiff = (appointmentTime - now) / (1000 * 60 * 60);

    let refundAmount = 0;
    if (hoursDiff >= 24) {
      refundAmount = appointment.fee; // 100% refund
    } else if (hoursDiff >= 12) {
      refundAmount = appointment.fee * 0.5; // 50% refund
    } else if (hoursDiff >= 6) {
      refundAmount = appointment.fee * 0.25; // 25% refund
    }

    // Update appointment status
    appointment.status = "cancelled";
    appointment.cancelledAt = now;
    appointment.cancellationReason = "Cancelled by patient";
    await appointment.save();

    // Update payment status
    if (appointment.payment) {
      await Payment.findByIdAndUpdate(appointment.payment, {
        status: refundAmount > 0 ? "refunded" : "cancelled",
        refundAmount,
        refundedAt: now,
      });
    }

    // Notify doctor
    const doctorUser = await User.findById(appointment.doctor);
    await sendSMS({
      to: doctorUser.phone,
      message: `Appointment on ${appointment.appointmentDate} at ${appointment.startTime} has been cancelled by patient.`,
    });

    return {
      message: "Appointment cancelled successfully",
      refundAmount,
    };
  }

  /**
   * Reschedule appointment
   */
  static async rescheduleAppointment(userId, appointmentId, newDate, newTime) {
    const patient = await Patient.findOne({ user: userId });

    if (!patient) {
      throw new ApiError(404, "Patient profile not found");
    }

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      patient: patient._id,
    });

    if (!appointment) {
      throw new ApiError(404, "Appointment not found");
    }

    if (appointment.status !== "confirmed") {
      throw new ApiError(400, "Only confirmed appointments can be rescheduled");
    }

    // Check if new slot is available
    const dayName = new Date(newDate).toLocaleDateString("en-US", { weekday: "lowercase" });
    const doctor = await Doctor.findById(appointment.doctor);

    const daySchedule = doctor.availableDays.find(d => d.day === dayName);
    if (!daySchedule || !daySchedule.isAvailable) {
      throw new ApiError(400, "Doctor not available on this day");
    }

    const slot = daySchedule.slots.find(s => s.startTime === newTime);
    if (!slot) {
      throw new ApiError(400, "Selected time slot not available");
    }

    // Check if slot is already booked
    const existingAppointment = await Appointment.findOne({
      doctor: appointment.doctor,
      appointmentDate: newDate,
      startTime: newTime,
      status: { $in: ["confirmed", "pending"] },
      _id: { $ne: appointmentId },
    });

    if (existingAppointment) {
      throw new ApiError(400, "This time slot is already booked");
    }

    // Update appointment
    const oldDate = appointment.appointmentDate;
    const oldTime = appointment.startTime;

    appointment.appointmentDate = newDate;
    appointment.startTime = newTime;
    appointment.status = "rescheduled";
    await appointment.save();

    // Notifications
    const doctorUser = await User.findById(appointment.doctor);
    const patientUser = await User.findById(userId);

    await sendSMS({
      to: doctorUser.phone,
      message: `Appointment rescheduled from ${oldDate} ${oldTime} to ${newDate} ${newTime}`,
    });

    await sendSMS({
      to: patientUser.phone,
      message: `Your appointment has been rescheduled to ${newDate} at ${newTime}`,
    });

    return {
      message: "Appointment rescheduled successfully",
      appointment,
    };
  }

  // ==================== Reviews ====================

  /**
   * Add review for completed appointment
   */
  static async addReview(userId, appointmentId, reviewData) {
    const patient = await Patient.findOne({ user: userId });

    if (!patient) {
      throw new ApiError(404, "Patient profile not found");
    }

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      patient: patient._id,
    });

    if (!appointment) {
      throw new ApiError(404, "Appointment not found");
    }

    if (appointment.status !== "completed") {
      throw new ApiError(400, "Can only review completed appointments");
    }

    // Check if already reviewed
    const existingReview = await Review.findOne({ appointment: appointmentId });
    if (existingReview) {
      throw new ApiError(400, "Already reviewed this appointment");
    }

    // Create review
    const review = await Review.create({
      appointment: appointmentId,
      patient: patient._id,
      doctor: appointment.doctor,
      rating: reviewData.rating,
      comment: reviewData.comment,
    });

    // Update doctor's rating
    const doctor = await Doctor.findById(appointment.doctor);
    const newTotal = doctor.totalReviews + 1;
    const newRating = ((doctor.rating * doctor.totalReviews) + reviewData.rating) / newTotal;

    doctor.rating = newRating;
    doctor.totalReviews = newTotal;
    await doctor.save();

    return review;
  }

  /**
   * Get my reviews
   */
  static async getMyReviews(userId) {
    const patient = await Patient.findOne({ user: userId });

    if (!patient) {
      throw new ApiError(404, "Patient profile not found");
    }

    const reviews = await Review.find({ patient: patient._id })
      .populate({
        path: "doctor",
        populate: {
          path: "user",
          select: "fullName profileImage specialization",
        },
      })
      .sort({ createdAt: -1 });

    return reviews;
  }

  // ==================== Favorites ====================

  /**
   * Add doctor to favorites
   */
  static async addFavoriteDoctor(userId, doctorId) {
    const patient = await Patient.findOne({ user: userId });

    if (!patient) {
      throw new ApiError(404, "Patient profile not found");
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      throw new ApiError(404, "Doctor not found");
    }

    if (patient.favoriteDoctors.includes(doctorId)) {
      throw new ApiError(400, "Doctor already in favorites");
    }

    patient.favoriteDoctors.push(doctorId);
    await patient.save();

    return patient.favoriteDoctors;
  }

  /**
   * Remove doctor from favorites
   */
  static async removeFavoriteDoctor(userId, doctorId) {
    const patient = await Patient.findOne({ user: userId });

    if (!patient) {
      throw new ApiError(404, "Patient profile not found");
    }

    patient.favoriteDoctors = patient.favoriteDoctors.filter(
      id => id.toString() !== doctorId
    );
    await patient.save();

    return patient.favoriteDoctors;
  }

  static async getFavoriteDoctors(userId) {
    const patient = await Patient.findOne({ user: userId })
      .populate({
        path: "favoriteDoctors",
        populate: {
          path: "user",
          select: "fullName profileImage",
        },
      });

    if (!patient) {
      throw new ApiError(404, "Patient profile not found");
    }

    return patient.favoriteDoctors;
  }

  // ==================== Dashboard ====================

  static async getDashboard(userId) {
    const patient = await Patient.findOne({ user: userId });

    if (!patient) {
      throw new ApiError(404, "Patient profile not found");
    }

    const now = new Date();

    // Upcoming appointments
    const upcomingAppointments = await Appointment.find({
      patient: patient._id,
      appointmentDate: { $gte: now },
      status: { $in: ["confirmed", "pending"] },
    })
      .populate({
        path: "doctor",
        populate: {
          path: "user",
          select: "fullName profileImage specialization",
        },
      })
      .sort({ appointmentDate: 1, startTime: 1 })
      .limit(5);

    // Past appointments
    const pastAppointments = await Appointment.find({
      patient: patient._id,
      $or: [
        { appointmentDate: { $lt: now } },
        { status: "completed" },
      ],
    })
      .populate({
        path: "doctor",
        populate: {
          path: "user",
          select: "fullName profileImage specialization",
        },
      })
      .sort({ appointmentDate: -1, startTime: -1 })
      .limit(5);

    // Stats
    const totalAppointments = await Appointment.countDocuments({ patient: patient._id });
    const completedAppointments = await Appointment.countDocuments({
      patient: patient._id,
      status: "completed"
    });
    const cancelledAppointments = await Appointment.countDocuments({
      patient: patient._id,
      status: "cancelled"
    });

    // Recent prescriptions
    const recentPrescriptions = await Appointment.find({
      patient: patient._id,
      prescription: { $exists: true, $ne: null },
    })
      .populate("prescription")
      .populate({
        path: "doctor",
        populate: {
          path: "user",
          select: "fullName",
        },
      })
      .sort({ createdAt: -1 })
      .limit(5);

    return {
      upcomingAppointments,
      pastAppointments,
      recentPrescriptions,
      stats: {
        totalAppointments,
        completedAppointments,
        cancelledAppointments,
        totalSpent: patient.totalSpent,
        favoriteDoctors: patient.favoriteDoctors.length,
      },
    };
  }
}