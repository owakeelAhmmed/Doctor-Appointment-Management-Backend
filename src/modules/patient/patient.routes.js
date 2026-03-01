import { Router } from "express";
import { PatientController } from "./patient.controller.js";
import { protect, authorize } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate.middleware.js";
import * as validation from "./patient.validation.js";

const router = Router();

// All patient routes require authentication and patient role
router.use(protect);
router.use(authorize("patient"));

// ==================== Profile Management ====================

/**
 * @route   GET /api/v1/patient/profile
 * @desc    Get patient profile
 */
router.get("/profile", PatientController.getProfile);

/**
 * @route   PUT /api/v1/patient/profile
 * @desc    Update patient profile
 */
router.put(
  "/profile",
  validation.updateProfileValidation,
  validateRequest,
  PatientController.updateProfile
);

/**
 * @route   GET /api/v1/patient/medical-records
 * @desc    Get medical records
 */
router.get("/medical-records", PatientController.getMedicalRecords);

/**
 * @route   POST /api/v1/patient/medical-history
 * @desc    Add medical history
 */
router.post(
  "/medical-history",
  validation.addMedicalHistoryValidation,
  validateRequest,
  PatientController.addMedicalHistory
);

/**
 * @route   POST /api/v1/patient/medications
 * @desc    Add medication
 */
router.post(
  "/medications",
  validation.addMedicationValidation,
  validateRequest,
  PatientController.addMedication
);

// ==================== Doctor Search ====================

/**
 * @route   GET /api/v1/patient/doctors/search
 * @desc    Search doctors
 */
router.get(
  "/doctors/search",
  validation.doctorSearchValidation,
  validateRequest,
  PatientController.searchDoctors
);

/**
 * @route   GET /api/v1/patient/doctors/:doctorId
 * @desc    Get doctor details
 */
router.get("/doctors/:doctorId", PatientController.getDoctorDetails);

/**
 * @route   GET /api/v1/patient/doctors/:doctorId/slots
 * @desc    Get doctor available slots
 */
router.get("/doctors/:doctorId/slots", PatientController.getDoctorSlots);

// ==================== Appointment Management ====================

/**
 * @route   POST /api/v1/patient/appointments
 * @desc    Book appointment
 */
router.post(
  "/appointments",
  validation.appointmentBookingValidation,
  validateRequest,
  PatientController.bookAppointment
);

/**
 * @route   GET /api/v1/patient/appointments
 * @desc    Get my appointments
 */
router.get("/appointments", PatientController.getMyAppointments);

/**
 * @route   GET /api/v1/patient/appointments/:appointmentId
 * @desc    Get appointment details
 */
router.get("/appointments/:appointmentId", PatientController.getAppointmentDetails);

/**
 * @route   PUT /api/v1/patient/appointments/:appointmentId/cancel
 * @desc    Cancel appointment
 */
router.put("/appointments/:appointmentId/cancel", PatientController.cancelAppointment);

/**
 * @route   PUT /api/v1/patient/appointments/:appointmentId/reschedule
 * @desc    Reschedule appointment
 */
router.put(
  "/appointments/:appointmentId/reschedule",
  validation.rescheduleValidation,
  validateRequest,
  PatientController.rescheduleAppointment
);

// ==================== Reviews ====================

/**
 * @route   POST /api/v1/patient/appointments/:appointmentId/review
 * @desc    Add review for appointment
 */
router.post(
  "/appointments/:appointmentId/review",
  validation.reviewValidation,
  validateRequest,
  PatientController.addReview
);

/**
 * @route   GET /api/v1/patient/reviews
 * @desc    Get my reviews
 */
router.get("/reviews", PatientController.getMyReviews);

// ==================== Favorites ====================

/**
 * @route   POST /api/v1/patient/favorites/:doctorId
 * @desc    Add doctor to favorites
 */
router.post("/favorites/:doctorId", PatientController.addFavoriteDoctor);

/**
 * @route   DELETE /api/v1/patient/favorites/:doctorId
 * @desc    Remove doctor from favorites
 */
router.delete("/favorites/:doctorId", PatientController.removeFavoriteDoctor);

/**
 * @route   GET /api/v1/patient/favorites
 * @desc    Get favorite doctors
 */
router.get("/favorites", PatientController.getFavoriteDoctors);

// ==================== Dashboard ====================


router.get("/dashboard", PatientController.getDashboard);

export default router;