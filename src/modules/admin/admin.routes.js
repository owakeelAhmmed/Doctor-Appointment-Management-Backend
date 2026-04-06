import { Router } from "express";
import { AdminController } from "./admin.controller.js";
import { protect, authorize, hasPermission } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate.middleware.js";
import * as validation from "./admin.validation.js";

const router = Router();

// All admin routes require authentication and admin/superadmin role
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

router.get(
  "/doctors/verification",
  validation.doctorFilterValidation,
  validateRequest,
  AdminController.getDoctorsForVerification
);

router.get(
  "/doctors/:doctorId/verification",
  AdminController.getVerificationDetails
);

router.put(
  "/doctors/:doctorId/verify",
  validation.verifyDoctorValidation,
  validateRequest,
  AdminController.verifyDoctor
);

router.put(
  "/doctors/:doctorId/documents/:documentType/verify",
  validation.verifyDocumentValidation,
  validateRequest,
  AdminController.verifyDocument
);

// ==================== Appointment Management ====================
router.get(
  "/appointments",
  AdminController.getAllAppointments
);

router.put(
  "/appointments/:appointmentId",
  validation.updateAppointmentValidation,
  validateRequest,
  AdminController.updateAppointment
);

// ==================== Payment Management ====================

router.get(
  "/payments",
  AdminController.getAllPayments
);

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

router.get(
  "/commissions/report",
  AdminController.getCommissionReport
);

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

// ==================== System Settings ====================

router.get("/settings", AdminController.getSettings);

router.put(
  "/settings",
  authorize("superadmin"),
  validation.updateSettingsValidation,
  validateRequest,
  AdminController.updateSettings
);

// ==================== Reports ====================

router.get(
  "/reports/doctors/:doctorId",
  AdminController.getDoctorPerformanceReport
);

router.get(
  "/reports/patients/:patientId",
  AdminController.getPatientReport
);

// admin.routes.js - Add these routes

// Doctor Verification Routes
router.get(
  "/doctors/verification/:status?",
  authorize("admin", "superadmin"),
  AdminController.getDoctorsByStatus
);

router.get(
  "/doctors/:doctorId/review",
  authorize("admin", "superadmin"),
  AdminController.getDoctorForReview
);

router.put(
  "/doctors/:doctorId/verify",
  authorize("admin", "superadmin"),
  validation.verifyDoctorValidation,
  validateRequest,
  AdminController.verifyDoctor
);

router.get(
  "/verification/stats",
  authorize("admin", "superadmin"),
  AdminController.getVerificationStats
);

export default router;