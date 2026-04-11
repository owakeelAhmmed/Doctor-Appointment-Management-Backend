import { Router } from "express";
import { AdminController } from "./admin.controller.js";
import { protect, authorize, hasPermission } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate.middleware.js";
import * as validation from "./admin.validation.js";

const router = Router();

router.use(protect);
router.use(authorize("admin", "superadmin"));

// ==================== Dashboard ====================

router.get("/dashboard", AdminController.getDashboard);

router.get(
  "/analytics/revenue",
  validation.reportDateValidation,
  validateRequest,
  AdminController.getRevenueAnalytics
);

// ==================== User Management ====================

router.get(
  "/users",
  validation.userFilterValidation,
  validateRequest,
  AdminController.getUsers
);

router.get("/users/:userId", AdminController.getUserDetails);

router.put(
  "/users/:userId/status",
  validation.updateUserStatusValidation,
  validateRequest,
  AdminController.updateUserStatus
);

router.put(
  "/users/:userId/role",
  authorize("superadmin"),
  validation.updateUserRoleValidation,
  validateRequest,
  AdminController.updateUserRole
);

router.delete(
  "/users/:userId",
  authorize("superadmin"),
  AdminController.deleteUser
);

// ==================== Doctor Verification ====================
// IMPORTANT: Specific/static routes MUST come before parameterized (:id) routes

// GET /admin/doctors/verification?status=pending&page=1&limit=20
router.get(
  "/doctors/verification",
  hasPermission("manage_doctors"),
  validation.doctorFilterValidation,
  validateRequest,
  AdminController.getDoctorsForVerification
);

// GET /admin/verification/stats - count summary per status
router.get(
  "/verification/stats",
  hasPermission("manage_doctors"),
  AdminController.getVerificationStats
);

// GET /admin/doctors/:doctorId/review - full doctor details for admin review panel
router.get(
  "/doctors/:doctorId/review",
  hasPermission("manage_doctors"),
  AdminController.getDoctorForReview
);

// GET /admin/doctors/:doctorId/verification - verification details only
router.get(
  "/doctors/:doctorId/verification",
  hasPermission("manage_doctors"),
  AdminController.getVerificationDetails
);

// PUT /admin/doctors/:doctorId/verify
// body: { status: "verified"|"rejected"|"suspended"|"under_review"|"document_verification", notes: "..." }
router.put(
  "/doctors/:doctorId/verify",
  hasPermission("manage_doctors"),
  validation.verifyDoctorValidation,
  validateRequest,
  AdminController.verifyDoctor
);

// PUT /admin/doctors/:doctorId/documents/:documentType/verify
// body: { verified: true|false, rejectionReason: "..." }
router.put(
  "/doctors/:doctorId/documents/:documentType/verify",
  hasPermission("manage_doctors"),
  validation.verifyDocumentValidation,
  validateRequest,
  AdminController.verifyDocument
);

// ==================== Appointment Management ====================

router.get("/appointments", AdminController.getAllAppointments);

router.put(
  "/appointments/:appointmentId",
  validation.updateAppointmentValidation,
  validateRequest,
  AdminController.updateAppointment
);

// ==================== Payment Management ====================

router.get("/payments", AdminController.getAllPayments);

router.put(
  "/payments/:paymentId",
  validation.updatePaymentValidation,
  validateRequest,
  AdminController.updatePayment
);

router.post(
  "/withdrawals/:withdrawalId/process",
  validation.processWithdrawalValidation,
  validateRequest,
  AdminController.processWithdrawal
);

// ==================== Commission Management ====================

router.get("/commissions/report", AdminController.getCommissionReport);

router.put(
  "/commissions/doctors/:doctorId",
  validation.updateCommissionValidation,
  validateRequest,
  AdminController.updateDoctorCommission
);

router.post(
  "/commissions/bulk-update",
  authorize("superadmin"),
  validation.bulkCommissionUpdateValidation,
  validateRequest,
  AdminController.bulkUpdateCommission
);

// ==================== Reports ====================

router.get("/reports/doctors/:doctorId", AdminController.getDoctorPerformanceReport);
router.get("/reports/patients/:patientId", AdminController.getPatientReport);

// ==================== System Settings ====================

router.get("/settings", AdminController.getSettings);

router.put(
  "/settings",
  authorize("superadmin"),
  validation.updateSettingsValidation,
  validateRequest,
  AdminController.updateSettings
);

export default router;