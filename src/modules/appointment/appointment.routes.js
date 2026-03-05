import { Router } from "express";
import { AppointmentController } from "./appointment.controller.js";
import { protect, authorize } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate.middleware.js";
import * as validation from "./appointment.validation.js";

const router = Router();

// All appointment routes require authentication
router.use(protect);

// ==================== Public Appointment Routes (All authenticated users) ====================

router.get(
  "/",
  validation.getAppointmentsValidation,
  validateRequest,
  AppointmentController.getMyAppointments
);

router.get("/statistics", AppointmentController.getStatistics);

router.get("/:appointmentId", AppointmentController.getAppointmentDetails);

router.get("/:appointmentId/prescription", AppointmentController.getPrescription);

// ==================== Patient Routes ====================

router.post(
  "/",
  authorize("patient"),
  validation.bookAppointmentValidation,
  validateRequest,
  AppointmentController.bookAppointment
);

router.put(
  "/:appointmentId/cancel",
  authorize("patient"),
  validation.cancelAppointmentValidation,
  validateRequest,
  AppointmentController.cancelAppointment
);

router.put(
  "/:appointmentId/reschedule",
  authorize("patient"),
  validation.rescheduleAppointmentValidation,
  validateRequest,
  AppointmentController.rescheduleAppointment
);

router.get(
  "/upcoming/me",
  authorize("patient"),
  AppointmentController.getUpcomingAppointments
);

router.get(
  "/history/me",
  authorize("patient"),
  AppointmentController.getAppointmentHistory
);

// ==================== Doctor Routes ====================

router.put(
  "/:appointmentId/status",
  authorize("doctor"),
  validation.updateAppointmentStatusValidation,
  validateRequest,
  AppointmentController.updateStatus
);

router.post(
  "/:appointmentId/prescription",
  authorize("doctor"),
  validation.addPrescriptionValidation,
  validateRequest,
  AppointmentController.addPrescription
);

router.post(
  "/:appointmentId/video-link",
  authorize("doctor"),
  validation.generateVideoLinkValidation,
  validateRequest,
  AppointmentController.generateVideoLink
);

router.post(
  "/:appointmentId/notes",
  authorize("doctor"),
  validation.addMedicalNotesValidation,
  validateRequest,
  AppointmentController.addMedicalNotes
);

router.get(
  "/today/me",
  authorize("doctor"),
  AppointmentController.getTodayAppointments
);

// ==================== Payment Confirmation ====================

router.post("/:appointmentId/confirm", AppointmentController.confirmAppointment);

export default router;