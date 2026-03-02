import { DoctorService } from "./doctor.service.js";
import { ApiError } from "../../utils/apiError.js";

export class DoctorController {
  
  // ==================== Profile Management ====================

  /**
   * Get doctor profile
   */
  static async getProfile(req, res, next) {
    try {
      const result = await DoctorService.getProfile(req.user._id);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update doctor profile
   */
  static async updateProfile(req, res, next) {
    try {
      const result = await DoctorService.updateProfile(req.user._id, req.body);
      
      res.json({
        success: true,
        message: "Profile updated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update doctor schedule
   */
  static async updateSchedule(req, res, next) {
    try {
      const result = await DoctorService.updateSchedule(req.user._id, req.body);
      
      res.json({
        success: true,
        message: "Schedule updated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update consultation fee
   */
  static async updateFee(req, res, next) {
    try {
      const result = await DoctorService.updateFee(req.user._id, req.body);
      
      res.json({
        success: true,
        message: "Consultation fee updated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update bank information
   */
  static async updateBankInfo(req, res, next) {
    try {
      const result = await DoctorService.updateBankInfo(req.user._id, req.body);
      
      res.json({
        success: true,
        message: "Bank information updated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update mobile banking information
   */
  static async updateMobileBanking(req, res, next) {
    try {
      const result = await DoctorService.updateMobileBanking(req.user._id, req.body);
      
      res.json({
        success: true,
        message: "Mobile banking information updated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload documents
   */
  static async uploadDocuments(req, res, next) {
  try {
    const result = await DoctorService.uploadDocuments(req.user._id, req.files);
    
    res.json({
      success: true,
      message: "Documents uploaded successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

  // ==================== Appointment Management ====================

  /**
   * Get doctor's appointments
   */
  static async getAppointments(req, res, next) {
    try {
      const result = await DoctorService.getAppointments(req.user._id, req.query);
      
      res.json({
        success: true,
        data: {
          todayAppointments: result.todayAppointments,
          appointments: result.appointments,
        },
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single appointment details
   */
  static async getAppointmentDetails(req, res, next) {
    try {
      const { appointmentId } = req.params;
      
      const result = await DoctorService.getAppointmentDetails(req.user._id, appointmentId);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update appointment status
   */
  static async updateAppointmentStatus(req, res, next) {
    try {
      const { appointmentId } = req.params;
      
      const result = await DoctorService.updateAppointmentStatus(
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
   * Get today's schedule
   */
  static async getTodaySchedule(req, res, next) {
    try {
      const result = await DoctorService.getTodaySchedule(req.user._id);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Patients Management ====================

  /**
   * Get doctor's patients
   */
  static async getPatients(req, res, next) {
    try {
      const result = await DoctorService.getPatients(req.user._id, req.query);
      
      res.json({
        success: true,
        data: result.patients,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single patient details
   */
  static async getPatientDetails(req, res, next) {
    try {
      const { patientId } = req.params;
      
      const result = await DoctorService.getPatientDetails(req.user._id, patientId);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Reviews Management ====================

  /**
   * Get doctor's reviews
   */
  static async getReviews(req, res, next) {
    try {
      const result = await DoctorService.getReviews(req.user._id, req.query);
      
      res.json({
        success: true,
        data: result.reviews,
        ratingDistribution: result.ratingDistribution,
        stats: result.stats,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Respond to review
   */
  static async respondToReview(req, res, next) {
    try {
      const { reviewId } = req.params;
      
      const result = await DoctorService.respondToReview(req.user._id, reviewId, req.body);
      
      res.json({
        success: true,
        message: "Response added successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Earnings & Withdrawals ====================

  /**
   * Get earnings summary
   */
  static async getEarnings(req, res, next) {
    try {
      const result = await DoctorService.getEarnings(req.user._id, req.query);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Request withdrawal
   */
  static async requestWithdrawal(req, res, next) {
    try {
      const result = await DoctorService.requestWithdrawal(req.user._id, req.body);
      
      res.json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get withdrawal history
   */
  static async getWithdrawalHistory(req, res, next) {
    try {
      const result = await DoctorService.getWithdrawalHistory(req.user._id);
      
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
   * Get doctor dashboard
   */
  static async getDashboard(req, res, next) {
    try {
      const result = await DoctorService.getDashboard(req.user._id);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}