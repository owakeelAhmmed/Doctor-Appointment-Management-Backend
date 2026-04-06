import { PaymentService } from "./payment.service.js";
import { Patient } from "../patient/patient.model.js";
import { Doctor } from "../doctor/doctor.model.js";
import { ApiError } from "../../utils/apiError.js";

export class PaymentController {
  
  // ==================== Payment Initiation ====================

  /**
   * Initiate payment for appointment
   */
  static async initiatePayment(req, res, next) {
    try {
      const patient = await Patient.findOne({ user: req.user._id });
      if (!patient) {
        throw new ApiError(404, "Patient profile not found");
      }

      const result = await PaymentService.initiatePayment(patient._id, req.body);
      
      res.status(201).json({
        success: true,
        message: "Payment initiated successfully",
        data: {
          payment: result.payment,
          instructions: result.instructions,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Process bKash payment
   */
  static async processBKashPayment(req, res, next) {
    try {
      const patient = await Patient.findOne({ user: req.user._id });
      if (!patient) {
        throw new ApiError(404, "Patient profile not found");
      }

      const result = await PaymentService.processBKashPayment(patient._id, req.body);
      
      res.json({
        success: true,
        message: "Payment completed successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Process Nagad payment
   */
  static async processNagadPayment(req, res, next) {
    try {
      const patient = await Patient.findOne({ user: req.user._id });
      if (!patient) {
        throw new ApiError(404, "Patient profile not found");
      }

      const result = await PaymentService.processNagadPayment(patient._id, req.body);
      
      res.json({
        success: true,
        message: "Payment completed successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Process card payment
   */
  static async processCardPayment(req, res, next) {
    try {
      const { paymentId } = req.params;
      
      const result = await PaymentService.processCardPayment({
        paymentId,
        ...req.body,
      });
      
      res.json({
        success: true,
        message: "Payment completed successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Process cash payment (admin/reception only)
   */
  static async processCashPayment(req, res, next) {
    try {
      const { appointmentId } = req.params;
      
      const result = await PaymentService.processCashPayment(
        appointmentId,
        req.user._id
      );
      
      res.json({
        success: true,
        message: "Cash payment verified successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark payment as failed
   */
  static async markAsFailed(req, res, next) {
    try {
      const { paymentId } = req.params;
      const { reason } = req.body;
      
      const result = await PaymentService.markAsFailed(paymentId, reason);
      
      res.json({
        success: true,
        message: "Payment marked as failed",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Refund Management ====================

  /**
   * Process refund (admin only)
   */
  static async processRefund(req, res, next) {
    try {
      const { paymentId } = req.params;
      
      const result = await PaymentService.processRefund(
        paymentId,
        req.body,
        req.user._id
      );
      
      res.json({
        success: true,
        message: "Refund processed successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Withdrawal Management ====================

  /**
   * Request withdrawal (doctor only)
   */
  static async requestWithdrawal(req, res, next) {
    try {
      const doctor = await Doctor.findOne({ user: req.user._id });
      if (!doctor) {
        throw new ApiError(404, "Doctor profile not found");
      }

      const result = await PaymentService.requestWithdrawal(doctor._id, req.body);
      
      res.status(201).json({
        success: true,
        message: "Withdrawal request submitted successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Process withdrawal (admin only)
   */
  static async processWithdrawal(req, res, next) {
    try {
      const { withdrawalId } = req.params;
      
      const result = await PaymentService.processWithdrawal(withdrawalId, req.body);
      
      res.json({
        success: true,
        message: `Withdrawal ${result.status} successfully`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Query Methods ====================

  /**
   * Get payment by ID
   */
  static async getPaymentById(req, res, next) {
    try {
      const { paymentId } = req.params;
      
      const result = await PaymentService.getPaymentById(
        paymentId,
        req.user._id,
        req.user.role
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
   * Get my payments
   */
  static async getMyPayments(req, res, next) {
    try {
      const result = await PaymentService.getUserPayments(
        req.user._id,
        req.user.role,
        req.query
      );
      
      res.json({
        success: true,
        data: result.payments,
        summary: result.summary,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get payment by appointment
   */
  static async getPaymentByAppointment(req, res, next) {
    try {
      const { appointmentId } = req.params;
      
      const result = await PaymentService.getPaymentByAppointment(
        appointmentId,
        req.user._id,
        req.user.role
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
   * Get all payments (admin only)
   */
  static async getAllPayments(req, res, next) {
    try {
      const result = await PaymentService.getAllPayments(req.query);
      
      res.json({
        success: true,
        data: result.payments,
        summary: result.summary,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Statistics & Reports ====================

  /**
   * Get payment statistics (admin only)
   */
  static async getStatistics(req, res, next) {
    try {
      const result = await PaymentService.getStatistics(req.query);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate payment report (admin only)
   */
  static async generateReport(req, res, next) {
    try {
      const result = await PaymentService.generateReport(req.query);
      
      // Handle different formats
      if (req.query.format === "csv") {
        // Convert to CSV and send
        const csv = this.convertToCSV(result);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=payment-report.csv");
        return res.send(csv);
      }
      
      if (req.query.format === "pdf") {
        // Generate PDF and send
        // This would use a PDF generation library
        res.json({ success: true, message: "PDF generation coming soon" });
      }
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Convert report to CSV
   */
  static convertToCSV(report) {
    const rows = [];
    
    // Headers
    rows.push([
      "Date",
      "Transaction ID",
      "Patient",
      "Doctor",
      "Amount",
      "Platform Fee",
      "Doctor Amount",
      "Method",
      "Status",
    ].join(","));
    
    // Data rows
    report.payments.forEach(p => {
      rows.push([
        new Date(p.createdAt).toLocaleDateString(),
        p.transactionId,
        p.patient?.user?.fullName || "N/A",
        p.doctor?.user?.fullName || "N/A",
        p.amount,
        p.platformFee,
        p.doctorAmount,
        p.paymentMethod,
        p.status,
      ].join(","));
    });
    
    return rows.join("\n");
  }
}