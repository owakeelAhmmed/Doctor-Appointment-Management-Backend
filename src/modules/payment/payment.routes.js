import { Router } from "express";
import { PaymentController } from "./payment.controller.js";
import { protect, authorize } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate.middleware.js";
import * as validation from "./payment.validation.js";

const router = Router();

// All payment routes require authentication
router.use(protect);

// ==================== Public Payment Routes (All authenticated users) ====================

router.get(
  "/my",
  validation.getPaymentsValidation,
  validateRequest,
  PaymentController.getMyPayments
);

router.get("/:paymentId", PaymentController.getPaymentById);

router.get("/appointment/:appointmentId", PaymentController.getPaymentByAppointment);

// ==================== Patient Routes ====================

router.post(
  "/initiate",
  authorize("patient"),
  validation.initiatePaymentValidation,
  validateRequest,
  PaymentController.initiatePayment
);

router.post(
  "/bkash",
  authorize("patient"),
  validation.bKashPaymentValidation,
  validateRequest,
  PaymentController.processBKashPayment
);

router.post(
  "/nagad",
  authorize("patient"),
  validation.nagadPaymentValidation,
  validateRequest,
  PaymentController.processNagadPayment
);

router.post(
  "/card/process/:paymentId",
  authorize("patient"),
  validation.cardPaymentValidation,
  validateRequest,
  PaymentController.processCardPayment
);

// ==================== Doctor Routes ====================

router.post(
  "/withdrawals/request",
  authorize("doctor"),
  validation.withdrawalRequestValidation,
  validateRequest,
  PaymentController.requestWithdrawal
);

// ==================== Admin Routes ====================

router.get(
  "/admin/all",
  authorize("admin", "superadmin"),
  validation.getPaymentsValidation,
  validateRequest,
  PaymentController.getAllPayments
);

router.get(
  "/admin/statistics",
  authorize("admin", "superadmin"),
  PaymentController.getStatistics
);

router.get(
  "/admin/report",
  authorize("admin", "superadmin"),
  validation.generateReportValidation,
  validateRequest,
  PaymentController.generateReport
);

router.post(
  "/admin/refund/:paymentId",
  authorize("admin", "superadmin"),
  validation.refundPaymentValidation,
  validateRequest,
  PaymentController.processRefund
);

router.post(
  "/admin/withdrawals/:withdrawalId/process",
  authorize("admin", "superadmin"),
  validation.processWithdrawalValidation,
  validateRequest,
  PaymentController.processWithdrawal
);

router.post(
  "/admin/cash/:appointmentId",
  authorize("admin", "superadmin"),
  validation.cashPaymentValidation,
  validateRequest,
  PaymentController.processCashPayment
);


router.post(
  "/admin/:paymentId/failed",
  authorize("admin", "superadmin"),
  PaymentController.markAsFailed
);

// ==================== SSLCommerz Routes ====================

// Patient initiates payment
router.post(
  "/sslcommerz/initiate",
  authorize("patient"),
  validation.initiatePaymentValidation,
  validateRequest,
  PaymentController.initiateSSLCommerzPayment
);

// SSLCommerz callbacks (public routes, no auth needed)
router.post("/sslcommerz/success", PaymentController.sslCommerzSuccess);
router.post("/sslcommerz/fail", PaymentController.sslCommerzFail);
router.post("/sslcommerz/cancel", PaymentController.sslCommerzCancel);
router.post("/sslcommerz/ipn", PaymentController.sslCommerzIPN);

export default router;