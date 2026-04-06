import { AdminService } from "./admin.service.js";
import { ApiError } from "../../utils/apiError.js";

export class AdminController {

  // ==================== Dashboard ====================

  /**
   * Get admin dashboard
   */
  static async getDashboard(req, res, next) {
    try {
      const result = await AdminService.getDashboard();

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get revenue analytics
   */
  static async getRevenueAnalytics(req, res, next) {
    try {
      const result = await AdminService.getRevenueAnalytics(req.query);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== User Management ====================

  /**
   * Get all users
   */
  static async getUsers(req, res, next) {
    try {
      const { page, limit, ...filters } = req.query;

      const result = await AdminService.getUsers(filters, { page, limit });

      res.json({
        success: true,
        data: result.users,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user details
   */
  static async getUserDetails(req, res, next) {
    try {
      const { userId } = req.params;

      const result = await AdminService.getUserDetails(userId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user status
   */
  static async updateUserStatus(req, res, next) {
    try {
      const { userId } = req.params;

      const result = await AdminService.updateUserStatus(userId, req.body);

      res.json({
        success: true,
        message: `User ${result.isActive ? "activated" : "deactivated"} successfully`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user role
   */
  static async updateUserRole(req, res, next) {
    try {
      const { userId } = req.params;

      const result = await AdminService.updateUserRole(userId, req.body);

      res.json({
        success: true,
        message: `User role updated from ${result.oldRole} to ${result.newRole}`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete user
   */
  static async deleteUser(req, res, next) {
    try {
      const { userId } = req.params;

      const result = await AdminService.deleteUser(userId);

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Doctor Verification ====================

  /**
   * Get doctors for verification
   */
  static async getDoctorsForVerification(req, res, next) {
    try {
      const { page, limit, ...filters } = req.query;

      const result = await AdminService.getDoctorsForVerification(filters, { page, limit });

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
   * Verify doctor
   */
  static async verifyDoctor(req, res, next) {
    try {
      const { doctorId } = req.params;

      // Add admin ID to verification data
      const verificationData = {
        ...req.body,
        adminId: req.user._id,
      };

      const result = await AdminService.verifyDoctor(doctorId, verificationData);

      res.json({
        success: true,
        message: `Doctor ${result.verificationStatus} successfully`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify doctor document
   */
  static async verifyDocument(req, res, next) {
    try {
      const { doctorId, documentType } = req.params;

      const result = await AdminService.verifyDocument(doctorId, documentType, req.body);

      res.json({
        success: true,
        message: `Document ${result.verified ? "verified" : "rejected"} successfully`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get verification details
   */
  static async getVerificationDetails(req, res, next) {
    try {
      const { doctorId } = req.params;

      const result = await AdminService.getVerificationDetails(doctorId);

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
   * Get all appointments
   */
  static async getAllAppointments(req, res, next) {
    try {
      const { page, limit, ...filters } = req.query;

      const result = await AdminService.getAllAppointments(filters, { page, limit });

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
   * Update appointment
   */
  static async updateAppointment(req, res, next) {
    try {
      const { appointmentId } = req.params;

      const result = await AdminService.updateAppointment(appointmentId, req.body);

      res.json({
        success: true,
        message: "Appointment updated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Payment Management ====================

  /**
   * Get all payments
   */
  static async getAllPayments(req, res, next) {
    try {
      const { page, limit, ...filters } = req.query;

      const result = await AdminService.getAllPayments(filters, { page, limit });

      res.json({
        success: true,
        data: result.payments,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update payment
   */
  static async updatePayment(req, res, next) {
    try {
      const { paymentId } = req.params;

      const result = await AdminService.updatePayment(paymentId, req.body);

      res.json({
        success: true,
        message: "Payment updated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Process withdrawal
   */
  static async processWithdrawal(req, res, next) {
    try {
      const { withdrawalId } = req.params;

      const result = await AdminService.processWithdrawal(withdrawalId, req.body);

      res.json({
        success: true,
        message: `Withdrawal ${result.status} successfully`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Commission Management ====================

  /**
   * Update doctor commission
   */
  static async updateDoctorCommission(req, res, next) {
    try {
      const { doctorId } = req.params;

      const result = await AdminService.updateDoctorCommission(doctorId, req.body);

      res.json({
        success: true,
        message: "Commission rate updated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk update commission
   */
  static async bulkUpdateCommission(req, res, next) {
    try {
      const result = await AdminService.bulkUpdateCommission(req.body);

      res.json({
        success: true,
        message: `Updated commission for ${result.modifiedCount} doctors`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get commission report
   */
  static async getCommissionReport(req, res, next) {
    try {
      const result = await AdminService.getCommissionReport(req.query);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== System Settings ====================

  /**
   * Get system settings
   */
  static async getSettings(req, res, next) {
    try {
      const result = await AdminService.getSettings();

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update system settings
   */
  static async updateSettings(req, res, next) {
    try {
      const result = await AdminService.updateSettings(req.body);

      res.json({
        success: true,
        message: "Settings updated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Reports ====================

  /**
   * Get doctor performance report
   */
  static async getDoctorPerformanceReport(req, res, next) {
    try {
      const { doctorId } = req.params;

      const result = await AdminService.getDoctorPerformanceReport(doctorId, req.query);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get patient report
   */
  static async getPatientReport(req, res, next) {
    try {
      const { patientId } = req.params;

      const result = await AdminService.getPatientReport(patientId, req.query);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get doctors by verification status
  static async getDoctorsByStatus(req, res, next) {
    try {
      const { status, page, limit } = req.query;
      const result = await AdminService.getDoctorsByStatus(status, page, limit);

      res.json({
        success: true,
        data: result.doctors,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get single doctor for review
  static async getDoctorForReview(req, res, next) {
    try {
      const { doctorId } = req.params;
      const result = await AdminService.getDoctorForReview(doctorId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // Verify doctor (final approval)
  static async verifyDoctor(req, res, next) {
    try {
      const { doctorId } = req.params;
      const { status, notes } = req.body;

      const result = await AdminService.verifyDoctor(
        req.user._id,
        doctorId,
        status,
        notes
      );

      res.json({
        success: true,
        message: `Doctor ${status === "verified" ? "verified" : "rejected"} successfully`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get verification statistics
  static async getVerificationStats(req, res, next) {
    try {
      const stats = await AdminService.getVerificationStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

}

