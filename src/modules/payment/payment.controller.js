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

  // ==================== SSLCommerz Payment Methods ====================

  /**
   * Initiate SSLCommerz payment
   */
  static async initiateSSLCommerzPayment(req, res, next) {
    try {
      const patient = await Patient.findOne({ user: req.user._id });
      if (!patient) {
        throw new ApiError(404, "Patient profile not found");
      }

      const result = await PaymentService.initiateSSLCommerzPayment(
        patient._id,
        req.body
      );

      res.json({
        success: true,
        message: "Payment initiated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * SSLCommerz success callback
   */
  static async sslCommerzSuccess(req, res, next) {
    try {
      const { tran_id, amount, bank_tran_id, status, val_id } = req.body;

      console.log("=== SSLCommerz Success Callback ===");
      console.log("Full body:", JSON.stringify(req.body, null, 2));
      console.log("tran_id:", tran_id);
      console.log("val_id:", val_id);
      console.log("amount:", amount);
      console.log("bank_tran_id:", bank_tran_id);
      console.log("status:", status);

      if (status === "VALID") {
        // ✅ Try with val_id first, then tran_id
        const searchId = val_id || tran_id;
        console.log("Searching with ID:", searchId);

        await PaymentService.handleSSLCommerzSuccess(
          searchId,
          parseFloat(amount),
          bank_tran_id
        );

        console.log("Payment processed successfully, redirecting to success page");
        return res.redirect(`${process.env.CLIENT_URL}/payment/success?transactionId=${tran_id}`);
      } else {
        console.log("Payment status not VALID, redirecting to failed page");
        return res.redirect(`${process.env.CLIENT_URL}/payment/failed?transactionId=${tran_id}`);
      }
    } catch (error) {
      console.error("SSLCommerz success error:", error);
      res.redirect(`${process.env.CLIENT_URL}/payment/failed`);
    }
  }

  /**
   * SSLCommerz fail callback
   */
  static async sslCommerzFail(req, res, next) {
    try {
      const { tran_id, error_reason } = req.body;

      console.log("SSLCommerz Fail Callback:", { tran_id, error_reason });

      await PaymentService.handleSSLCommerzFail(tran_id, error_reason);

      res.redirect(`${process.env.CLIENT_URL}/payment/failed?transactionId=${tran_id}&reason=${error_reason}`);
    } catch (error) {
      console.error("SSLCommerz fail error:", error);
      res.redirect(`${process.env.CLIENT_URL}/payment/failed`);
    }
  }

  /**
   * SSLCommerz cancel callback
   */
  static async sslCommerzCancel(req, res, next) {
    try {
      const { tran_id } = req.body;

      console.log("SSLCommerz Cancel Callback:", { tran_id });

      await PaymentService.handleSSLCommerzCancel(tran_id);

      res.redirect(`${process.env.CLIENT_URL}/payment/cancel?transactionId=${tran_id}`);
    } catch (error) {
      console.error("SSLCommerz cancel error:", error);
      res.redirect(`${process.env.CLIENT_URL}/payment/cancel`);
    }
  }

  /**
   * SSLCommerz IPN (Instant Payment Notification)
   */
  static async sslCommerzIPN(req, res, next) {
    try {
      const { tran_id, amount, bank_tran_id, status } = req.body;

      console.log("SSLCommerz IPN:", { tran_id, amount, bank_tran_id, status });

      if (status === "VALID") {
        await PaymentService.handleSSLCommerzSuccess(tran_id, parseFloat(amount), bank_tran_id);
      } else if (status === "FAILED") {
        await PaymentService.handleSSLCommerzFail(tran_id, "IPN reported failure");
      }

      res.status(200).send("OK");
    } catch (error) {
      console.error("SSLCommerz IPN error:", error);
      res.status(500).send("Error");
    }
  }
}