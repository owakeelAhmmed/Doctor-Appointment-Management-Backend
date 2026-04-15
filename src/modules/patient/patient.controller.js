import { PatientService } from "./patient.service.js";
import { ApiError } from "../../utils/apiError.js";

export class PatientController {

  // ==================== Profile Management ====================

  /**
   * Get patient profile
   */
  static async getProfile(req, res, next) {
    try {
      const result = await PatientService.getProfile(req.user._id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update patient profile
   */
  static async updateProfile(req, res, next) {
    try {
      console.log('Update profile request body:', req.body);

      const result = await PatientService.updateProfile(req.user._id, req.body);

      res.json({
        success: true,
        message: "Profile updated successfully",
        data: result,
      });
    } catch (error) {
      console.error('Profile update error:', error);
      next(error);
    }
  }

  /**
   * Add medical history
   */
  static async addMedicalHistory(req, res, next) {
    try {
      const result = await PatientService.addMedicalHistory(req.user._id, req.body);

      res.status(201).json({
        success: true,
        message: "Medical history added successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add medication
   */
  static async addMedication(req, res, next) {
    try {
      const result = await PatientService.addMedication(req.user._id, req.body);

      res.status(201).json({
        success: true,
        message: "Medication added successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get medical records
   */
  static async getMedicalRecords(req, res, next) {
    try {
      const result = await PatientService.getMedicalRecords(req.user._id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Doctor Search ====================

  /**
   * Search doctors
   */
  static async searchDoctors(req, res, next) {
    try {
      const { page, limit, ...filters } = req.query;

      const result = await PatientService.searchDoctors(filters, { page, limit });

      res.json({
        success: true,
        data: result.doctors,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get doctor details
   */
  static async getDoctorDetails(req, res, next) {
    try {
      const { doctorId } = req.params;

      const result = await PatientService.getDoctorDetails(doctorId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get doctor available slots
   */
  static async getDoctorSlots(req, res, next) {
    try {
      const { doctorId } = req.params;

      const result = await PatientService.getDoctorAvailableSlots(doctorId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Appointment Management ====================

  /**
   * Book appointment
   */
  static async bookAppointment(req, res, next) {
    try {
      const result = await PatientService.bookAppointment(req.user._id, req.body);

      res.status(201).json({
        success: true,
        message: result.message,
        data: {
          appointment: result.appointment,
          payment: result.payment,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get my appointments
   */
  static async getMyAppointments(req, res, next) {
    try {
      const result = await PatientService.getMyAppointments(req.user._id, req.query);

      res.json({
        success: true,
        data: result.appointments,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get appointment details
   */
  static async getAppointmentDetails(req, res, next) {
    try {
      const { appointmentId } = req.params;

      const result = await PatientService.getAppointmentDetails(req.user._id, appointmentId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel appointment
   */
  static async cancelAppointment(req, res, next) {
    try {
      const { appointmentId } = req.params;

      const result = await PatientService.cancelAppointment(req.user._id, appointmentId);

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
   * Reschedule appointment
   */
  static async rescheduleAppointment(req, res, next) {
    try {
      const { appointmentId } = req.params;
      const { newDate, newTime } = req.body;

      const result = await PatientService.rescheduleAppointment(
        req.user._id,
        appointmentId,
        newDate,
        newTime
      );

      res.json({
        success: true,
        message: result.message,
        data: result.appointment,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Reviews ====================

  /**
   * Add review
   */
  static async addReview(req, res, next) {
    try {
      const { appointmentId } = req.params;

      const result = await PatientService.addReview(req.user._id, appointmentId, req.body);

      res.status(201).json({
        success: true,
        message: "Review added successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get my reviews
   */
  static async getMyReviews(req, res, next) {
    try {
      const result = await PatientService.getMyReviews(req.user._id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Favorites ====================

  /**
   * Add favorite doctor
   */
  static async addFavoriteDoctor(req, res, next) {
    try {
      const { doctorId } = req.params;

      const result = await PatientService.addFavoriteDoctor(req.user._id, doctorId);

      res.json({
        success: true,
        message: "Doctor added to favorites",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove favorite doctor
   */
  static async removeFavoriteDoctor(req, res, next) {
    try {
      const { doctorId } = req.params;

      const result = await PatientService.removeFavoriteDoctor(req.user._id, doctorId);

      res.json({
        success: true,
        message: "Doctor removed from favorites",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get favorite doctors
   */
  static async getFavoriteDoctors(req, res, next) {
    try {
      const result = await PatientService.getFavoriteDoctors(req.user._id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Dashboard ====================

  /**
   * Get patient dashboard
   */
  static async getDashboard(req, res, next) {
    try {
      const result = await PatientService.getDashboard(req.user._id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}