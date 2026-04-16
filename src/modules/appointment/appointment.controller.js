import { AppointmentService } from "./appointment.service.js";
import { ApiError } from "../../utils/apiError.js";
import { Patient } from "../patient/patient.model.js";
import { Doctor } from "../doctor/doctor.model.js";
import { Appointment } from "./appointment.model.js";

export class AppointmentController {

  // ==================== Booking ====================

  /**
   * Book new appointment
   */
  static async bookAppointment(req, res, next) {
    try {
      const result = await AppointmentService.bookAppointment(req.user._id, req.body);

      res.status(201).json({
        success: true,
        message: result.message,
        data: {
          appointment: result.appointment,
          payment: result.payment,
          meetingLink: result.meetingLink,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Confirm appointment after payment
   */
  static async confirmAppointment(req, res, next) {
    try {
      const { appointmentId } = req.params;
      const { paymentId } = req.body;

      const result = await AppointmentService.confirmAppointment(appointmentId, paymentId);

      res.json({
        success: true,
        message: "Appointment confirmed successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Status Management ====================

  /**
   * Update appointment status (doctor only)
   */
  static async updateStatus(req, res, next) {
    try {
      const { appointmentId } = req.params;

      const result = await AppointmentService.updateStatus(
        req.user._id,
        appointmentId,
        req.body
      );

      res.json({
        success: true,
        message: "Appointment status updated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel appointment (patient only)
   */
  static async cancelAppointment(req, res, next) {
    try {
      const { appointmentId } = req.params;

      const result = await AppointmentService.cancelAppointment(
        req.user._id,
        appointmentId,
        req.body
      );

      res.json({
        success: true,
        message: result.message,
        data: {
          refundAmount: result.refundAmount,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reschedule appointment (patient only)
   */
  static async rescheduleAppointment(req, res, next) {
    try {
      const { appointmentId } = req.params;

      const result = await AppointmentService.rescheduleAppointment(
        req.user._id,
        appointmentId,
        req.body
      );

      res.json({
        success: true,
        message: "Appointment rescheduled successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Query Methods ====================

  /**
   * Get my appointments (based on role)
   */
  static async getMyAppointments(req, res, next) {
    try {
      console.log('=== Controller Debug ===');
      console.log('User ID:', req.user?._id);
      console.log('User Role:', req.user?.role);
      console.log('Query params:', req.query);

      if (!req.user || !req.user._id) {
        console.error('No user found in request');
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const result = await AppointmentService.getAppointments(
        req.user._id,
        req.user.role,
        req.query
      );

      console.log('Service result:', {
        appointmentsCount: result.appointments.length,
        pagination: result.pagination
      });

      res.json({
        success: true,
        data: result.appointments,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Error in getMyAppointments:', error);
      next(error);
    }
  }

  /**
   * Get single appointment details
   */
  static async getAppointmentDetails(req, res, next) {
    try {
      const { appointmentId } = req.params;

      const result = await AppointmentService.getAppointmentDetails(
        req.user._id,
        req.user.role,
        appointmentId
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get today's appointments (doctor only)
   */
  static async getTodayAppointments(req, res, next) {
    try {
      const doctor = await Doctor.findOne({ user: req.user._id });
      if (!doctor) {
        throw new ApiError(404, "Doctor profile not found");
      }

      const result = await AppointmentService.getTodayAppointments(doctor._id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get upcoming appointments (patient only)
   */
  static async getUpcomingAppointments(req, res, next) {
    try {
      const patient = await Patient.findOne({ user: req.user._id });
      if (!patient) {
        throw new ApiError(404, "Patient profile not found");
      }

      const result = await AppointmentService.getUpcomingAppointments(patient._id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get appointment history (patient only)
   */
  static async getAppointmentHistory(req, res, next) {
    try {
      const patient = await Patient.findOne({ user: req.user._id });
      if (!patient) {
        throw new ApiError(404, "Patient profile not found");
      }

      const result = await AppointmentService.getAppointmentHistory(
        patient._id,
        req.query.limit
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Prescription Management ====================

  /**
   * Add prescription (doctor only)
   */
  static async addPrescription(req, res, next) {
    try {
      const { appointmentId } = req.params;

      const doctor = await Doctor.findOne({ user: req.user._id });
      if (!doctor) {
        throw new ApiError(404, "Doctor profile not found");
      }

      const result = await AppointmentService.addPrescription(
        doctor._id,
        appointmentId,
        req.body
      );

      res.status(201).json({
        success: true,
        message: "Prescription added successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get prescription
   */
  static async getPrescription(req, res, next) {
    try {
      const { appointmentId } = req.params;

      const result = await AppointmentService.getPrescription(
        req.user._id,
        req.user.role,
        appointmentId
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Video Consultation ====================

  /**
   * Generate video meeting link
   */
  static async generateVideoLink(req, res, next) {
    try {
      const { appointmentId } = req.params;

      const meetingLink = await AppointmentService.generateMeetingLink(appointmentId);

      res.json({
        success: true,
        data: { meetingLink },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add medical notes (doctor only)
   */
  static async addMedicalNotes(req, res, next) {
    try {
      const { appointmentId } = req.params;

      const doctor = await Doctor.findOne({ user: req.user._id });
      if (!doctor) {
        throw new ApiError(404, "Doctor profile not found");
      }

      const appointment = await Appointment.findOneAndUpdate(
        { _id: appointmentId, doctor: doctor._id },
        { $set: { notes: req.body.notes } },
        { new: true }
      );

      if (!appointment) {
        throw new ApiError(404, "Appointment not found");
      }

      res.json({
        success: true,
        message: "Medical notes added successfully",
        data: appointment,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Statistics ====================

  /**
   * Get appointment statistics
   */
  static async getStatistics(req, res, next) {
    try {
      let id;

      if (req.user.role === "doctor") {
        const doctor = await Doctor.findOne({ user: req.user._id });
        id = doctor?._id;
      } else if (req.user.role === "patient") {
        const patient = await Patient.findOne({ user: req.user._id });
        id = patient?._id;
      }

      if (!id) {
        throw new ApiError(404, "Profile not found");
      }

      const result = await AppointmentService.getStatistics(req.user.role, id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}