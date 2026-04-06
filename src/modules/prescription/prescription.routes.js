import { Router } from "express";
import { PrescriptionController } from "./prescription.controller.js";
import { protect, authorize } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate.middleware.js";
import * as validation from "./prescription.validation.js";

const router = Router();

// All prescription routes require authentication
router.use(protect);

// ==================== Public Prescription Routes (View only) ====================

/**
 * @route   GET /api/v1/prescriptions/:prescriptionId
 * @desc    Get prescription by ID
 * @access  Private (Patient/Doctor)
 */
router.get(
  "/:prescriptionId",
  PrescriptionController.getPrescriptionById
);

/**
 * @route   GET /api/v1/prescriptions/appointment/:appointmentId
 * @desc    Get prescription by appointment
 * @access  Private (Patient/Doctor)
 */
router.get(
  "/appointment/:appointmentId",
  PrescriptionController.getPrescriptionByAppointment
);

/**
 * @route   GET /api/v1/prescriptions/:prescriptionId/pdf
 * @desc    Generate and get PDF
 * @access  Private (Patient/Doctor)
 */
router.get(
  "/:prescriptionId/pdf",
  PrescriptionController.generatePDF
);

/**
 * @route   GET /api/v1/prescriptions/:prescriptionId/download
 * @desc    Download PDF
 * @access  Private (Patient/Doctor)
 */
router.get(
  "/:prescriptionId/download",
  PrescriptionController.downloadPDF
);

// ==================== Patient Routes ====================

/**
 * @route   GET /api/v1/prescriptions/patient/my
 * @desc    Get my prescriptions (Patient)
 * @access  Private (Patient only)
 */
router.get(
  "/patient/my",
  authorize("patient"),
  validation.getPrescriptionsValidation,
  validateRequest,
  PrescriptionController.getMyPrescriptions
);

/**
 * @route   PUT /api/v1/prescriptions/:prescriptionId/tests/:testId/complete
 * @desc    Mark test as completed (Patient)
 * @access  Private (Patient only)
 */
router.put(
  "/:prescriptionId/tests/:testId/complete",
  authorize("patient"),
  PrescriptionController.markTestCompleted
);

// ==================== Doctor Routes ====================

/**
 * @route   POST /api/v1/prescriptions
 * @desc    Create new prescription (Doctor)
 * @access  Private (Doctor only)
 */
router.post(
  "/",
  authorize("doctor"),
  validation.createPrescriptionValidation,
  validateRequest,
  PrescriptionController.createPrescription
);

/**
 * @route   PUT /api/v1/prescriptions/:prescriptionId
 * @desc    Update prescription (Doctor)
 * @access  Private (Doctor only)
 */
router.put(
  "/:prescriptionId",
  authorize("doctor"),
  validation.updatePrescriptionValidation,
  validateRequest,
  PrescriptionController.updatePrescription
);

/**
 * @route   GET /api/v1/prescriptions/doctor/my
 * @desc    Get doctor's prescriptions (Doctor)
 * @access  Private (Doctor only)
 */
router.get(
  "/doctor/my",
  authorize("doctor"),
  validation.getPrescriptionsValidation,
  validateRequest,
  PrescriptionController.getDoctorPrescriptions
);

/**
 * @route   GET /api/v1/prescriptions/doctor/search
 * @desc    Search prescriptions (Doctor)
 * @access  Private (Doctor only)
 */
router.get(
  "/doctor/search",
  authorize("doctor"),
  PrescriptionController.searchPrescriptions
);

/**
 * @route   GET /api/v1/prescriptions/doctor/statistics
 * @desc    Get prescription statistics (Doctor)
 * @access  Private (Doctor only)
 */
router.get(
  "/doctor/statistics",
  authorize("doctor"),
  PrescriptionController.getStatistics
);

/**
 * @route   POST /api/v1/prescriptions/:prescriptionId/medicines
 * @desc    Add medicine to prescription (Doctor)
 * @access  Private (Doctor only)
 */
router.post(
  "/:prescriptionId/medicines",
  authorize("doctor"),
  validation.addMedicineValidation,
  validateRequest,
  PrescriptionController.addMedicine
);

/**
 * @route   PUT /api/v1/prescriptions/:prescriptionId/medicines/:medicineId
 * @desc    Update medicine (Doctor)
 * @access  Private (Doctor only)
 */
router.put(
  "/:prescriptionId/medicines/:medicineId",
  authorize("doctor"),
  validation.updateMedicineValidation,
  validateRequest,
  PrescriptionController.updateMedicine
);

/**
 * @route   DELETE /api/v1/prescriptions/:prescriptionId/medicines/:medicineId
 * @desc    Remove medicine (Doctor)
 * @access  Private (Doctor only)
 */
router.delete(
  "/:prescriptionId/medicines/:medicineId",
  authorize("doctor"),
  PrescriptionController.removeMedicine
);

/**
 * @route   POST /api/v1/prescriptions/:prescriptionId/tests
 * @desc    Add test to prescription (Doctor)
 * @access  Private (Doctor only)
 */
router.post(
  "/:prescriptionId/tests",
  authorize("doctor"),
  validation.addTestValidation,
  validateRequest,
  PrescriptionController.addTest
);

/**
 * @route   PUT /api/v1/prescriptions/:prescriptionId/tests/:testId
 * @desc    Update test (Doctor)
 * @access  Private (Doctor only)
 */
router.put(
  "/:prescriptionId/tests/:testId",
  authorize("doctor"),
  validation.updateTestValidation,
  validateRequest,
  PrescriptionController.updateTest
);

/**
 * @route   DELETE /api/v1/prescriptions/:prescriptionId/tests/:testId
 * @desc    Remove test (Doctor)
 * @access  Private (Doctor only)
 */
router.delete(
  "/:prescriptionId/tests/:testId",
  authorize("doctor"),
  PrescriptionController.removeTest
);

/**
 * @route   POST /api/v1/prescriptions/:prescriptionId/signature
 * @desc    Add digital signature (Doctor)
 * @access  Private (Doctor only)
 */
router.post(
  "/:prescriptionId/signature",
  authorize("doctor"),
  validation.addDigitalSignatureValidation,
  validateRequest,
  PrescriptionController.addDigitalSignature
);

/**
 * @route   POST /api/v1/prescriptions/:prescriptionId/send
 * @desc    Send prescription via email/SMS (Doctor)
 * @access  Private (Doctor only)
 */
router.post(
  "/:prescriptionId/send",
  authorize("doctor"),
  PrescriptionController.sendPrescription
);

export default router;