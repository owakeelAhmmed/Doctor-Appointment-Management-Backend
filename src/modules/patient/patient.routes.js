import { Router } from "express";
import { PatientController } from "./patient.controller.js";
import { protect, authorize } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate.middleware.js";
import * as validation from "./patient.validation.js";

const router = Router();

// All patient routes require authentication and patient role
router.use(protect);
router.use(authorize("patient"));

// ==================== Dashboard ====================

router.get("/dashboard", PatientController.getDashboard);

// ==================== Profile Management ====================
router.get("/profile", PatientController.getProfile);

router.put(
  "/profile",
  validation.updateProfileValidation,
  validateRequest,
  PatientController.updateProfile
);

router.get("/medical-records", PatientController.getMedicalRecords);

router.post(
  "/medical-history",
  validation.addMedicalHistoryValidation,
  validateRequest,
  PatientController.addMedicalHistory
);

router.post(
  "/medications",
  validation.addMedicationValidation,
  validateRequest,
  PatientController.addMedication
);

// ==================== Doctor Search ====================
router.get(
  "/doctors/search",
  validation.doctorSearchValidation,
  validateRequest,
  PatientController.searchDoctors
);

router.get("/doctors/:doctorId", PatientController.getDoctorDetails);

router.get("/doctors/:doctorId/slots", PatientController.getDoctorSlots);

// ==================== Appointment Management ====================
router.post(
  "/appointments",
  validation.appointmentBookingValidation,
  validateRequest,
  PatientController.bookAppointment
);

router.get("/appointments", PatientController.getMyAppointments);

router.get("/appointments/:appointmentId", PatientController.getAppointmentDetails);

router.put("/appointments/:appointmentId/cancel", PatientController.cancelAppointment);

router.put(
  "/appointments/:appointmentId/reschedule",
  validation.rescheduleValidation,
  validateRequest,
  PatientController.rescheduleAppointment
);

// ==================== Reviews ====================
router.post(
  "/appointments/:appointmentId/review",
  validation.reviewValidation,
  validateRequest,
  PatientController.addReview
);

router.get("/reviews", PatientController.getMyReviews);

// ==================== Favorites ====================
router.post("/favorites/:doctorId", PatientController.addFavoriteDoctor);

router.delete("/favorites/:doctorId", PatientController.removeFavoriteDoctor);

router.get("/favorites", PatientController.getFavoriteDoctors);

export default router;