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

/**
 * @route   GET /api/v1/admin/dashboard
 * @desc    Get admin dashboard
 * @access  Private (Admin/SuperAdmin)
 */
router.get("/dashboard", AdminController.getDashboard);

/**
 * @route   GET /api/v1/admin/analytics/revenue
 * @desc    Get revenue analytics
 * @access  Private (Admin/SuperAdmin)
 */
router.get(
  "/analytics/revenue",
  validation.reportDateValidation,
  validateRequest,
  AdminController.getRevenueAnalytics
);

// ==================== User Management ====================

/**
 * @route   GET /api/v1/admin/users
 * @desc    Get all users
 * @access  Private (Admin/SuperAdmin)
 */
router.get(
  "/users",
  validation.userFilterValidation,
  validateRequest,
  AdminController.getUsers
);

/**
 * @route   GET /api/v1/admin/users/:userId
 * @desc    Get user details
 * @access  Private (Admin/SuperAdmin)
 */
router.get("/users/:userId", AdminController.getUserDetails);

/**
 * @route   PUT /api/v1/admin/users/:userId/status
 * @desc    Update user status (activate/deactivate)
 * @access  Private (Admin/SuperAdmin)
 */
router.put(
  "/users/:userId/status",
  validation.updateUserStatusValidation,
  validateRequest,
  AdminController.updateUserStatus
);

/**
 * @route   PUT /api/v1/admin/users/:userId/role
 * @desc    Update user role
 * @access  Private (SuperAdmin only)
 */
router.put(
  "/users/:userId/role",
  authorize("superadmin"),
  validation.updateUserRoleValidation,
  validateRequest,
  AdminController.updateUserRole
);

/**
 * @route   DELETE /api/v1/admin/users/:userId
 * @desc    Delete user (soft delete)
 * @access  Private (SuperAdmin only)
 */
router.delete(
  "/users/:userId",
  authorize("superadmin"),
  AdminController.deleteUser
);

// ==================== Doctor Verification ====================

/**
 * @route   GET /api/v1/admin/doctors/verification
 * @desc    Get doctors pending verification
 * @access  Private (Admin/SuperAdmin)
 */
router.get(
  "/doctors/verification",
  validation.doctorFilterValidation,
  validateRequest,
  AdminController.getDoctorsForVerification
);

/**
 * @route   GET /api/v1/admin/doctors/:doctorId/verification
 * @desc    Get doctor verification details
 * @access  Private (Admin/SuperAdmin)
 */
router.get(
  "/doctors/:doctorId/verification",
  AdminController.getVerificationDetails
);

/**
 * @route   PUT /api/v1/admin/doctors/:doctorId/verify
 * @desc    Verify doctor
 * @access  Private (Admin/SuperAdmin)
 */
router.put(
  "/doctors/:doctorId/verify",
  validation.verifyDoctorValidation,
  validateRequest,
  AdminController.verifyDoctor
);

/**
 * @route   PUT /api/v1/admin/doctors/:doctorId/documents/:documentType/verify
 * @desc    Verify doctor document
 * @access  Private (Admin/SuperAdmin)
 */
router.put(
  "/doctors/:doctorId/documents/:documentType/verify",
  validation.verifyDocumentValidation,
  validateRequest,
  AdminController.verifyDocument
);

// ==================== Appointment Management ====================

/**
 * @route   GET /api/v1/admin/appointments
 * @desc    Get all appointments
 * @access  Private (Admin/SuperAdmin)
 */
router.get(
  "/appointments",
  AdminController.getAllAppointments
);

/**
 * @route   PUT /api/v1/admin/appointments/:appointmentId
 * @desc    Update appointment (admin override)
 * @access  Private (Admin/SuperAdmin)
 */
router.put(
  "/appointments/:appointmentId",
  validation.updateAppointmentValidation,
  validateRequest,
  AdminController.updateAppointment
);

// ==================== Payment Management ====================

/**
 * @route   GET /api/v1/admin/payments
 * @desc    Get all payments
 * @access  Private (Admin/SuperAdmin)
 */
router.get(
  "/payments",
  AdminController.getAllPayments
);

/**
 * @route   PUT /api/v1/admin/payments/:paymentId
 * @desc    Update payment
 * @access  Private (Admin/SuperAdmin)
 */
router.put(
  "/payments/:paymentId",
  validation.updatePaymentValidation,
  validateRequest,
  AdminController.updatePayment
);

/**
 * @route   POST /api/v1/admin/withdrawals/:withdrawalId/process
 * @desc    Process withdrawal
 * @access  Private (Admin/SuperAdmin)
 */
router.post(
  "/withdrawals/:withdrawalId/process",
  validation.processWithdrawalValidation,
  validateRequest,
  AdminController.processWithdrawal
);

// ==================== Commission Management ====================

/**
 * @route   GET /api/v1/admin/commissions/report
 * @desc    Get commission report
 * @access  Private (Admin/SuperAdmin)
 */
router.get(
  "/commissions/report",
  AdminController.getCommissionReport
);

/**
 * @route   PUT /api/v1/admin/commissions/doctors/:doctorId
 * @desc    Update doctor commission
 * @access  Private (Admin/SuperAdmin)
 */
router.put(
  "/commissions/doctors/:doctorId",
  validation.updateCommissionValidation,
  validateRequest,
  AdminController.updateDoctorCommission
);

/**
 * @route   POST /api/v1/admin/commissions/bulk-update
 * @desc    Bulk update commission
 * @access  Private (SuperAdmin only)
 */
router.post(
  "/commissions/bulk-update",
  authorize("superadmin"),
  validation.bulkCommissionUpdateValidation,
  validateRequest,
  AdminController.bulkUpdateCommission
);

// ==================== System Settings ====================

/**
 * @route   GET /api/v1/admin/settings
 * @desc    Get system settings
 * @access  Private (Admin/SuperAdmin)
 */
router.get("/settings", AdminController.getSettings);

/**
 * @route   PUT /api/v1/admin/settings
 * @desc    Update system settings
 * @access  Private (SuperAdmin only)
 */
router.put(
  "/settings",
  authorize("superadmin"),
  validation.updateSettingsValidation,
  validateRequest,
  AdminController.updateSettings
);

// ==================== Reports ====================

/**
 * @route   GET /api/v1/admin/reports/doctors/:doctorId
 * @desc    Get doctor performance report
 * @access  Private (Admin/SuperAdmin)
 */
router.get(
  "/reports/doctors/:doctorId",
  AdminController.getDoctorPerformanceReport
);

/**
 * @route   GET /api/v1/admin/reports/patients/:patientId
 * @desc    Get patient report
 * @access  Private (Admin/SuperAdmin)
 */
router.get(
  "/reports/patients/:patientId",
  AdminController.getPatientReport
);

export default router;