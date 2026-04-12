import { Router } from "express";
import { DoctorController } from "./doctor.controller.js";
import { protect, authorize } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate.middleware.js";
import * as validation from "./doctor.validation.js";
import uploadMemory from "../../middlewares/uploadMemory.js";
import { requireDoctorVerified, syncDoctorVerificationToUser } from "./doctor.middleware .js";

const router = Router();

// ==================== PUBLIC ROUTES (No Auth Required) ====================

// Get all verified doctors
router.get("/public", DoctorController.getPublicDoctors);

// Get filters for verified doctors
router.get("/public/filters", DoctorController.getPublicFilters);

// Get single doctor details (only if verified)
router.get("/public/:id", DoctorController.getPublicDoctorById);

router.get("/public/:id/slots", DoctorController.getPublicDoctorSlots);

// ==================== PROTECTED ROUTES (Auth Required) ====================

router.use(protect);
router.use(authorize("doctor"));

router.use(syncDoctorVerificationToUser);

// Profile Routes
router.get("/profile", DoctorController.getProfile);
router.put("/profile", validation.updateProfileValidation, validateRequest, DoctorController.updateProfile);

router.post(
  "/documents",
  uploadMemory.fields([
    { name: "bmdcCertificate", maxCount: 1 },
    { name: "nid", maxCount: 1 },
    { name: "basicDegree", maxCount: 1 },
    { name: "mbbsCertificate", maxCount: 1 },
    { name: "specializationCertificate", maxCount: 1 },
    { name: "profilePhoto", maxCount: 1 },
    { name: "chamberPhoto", maxCount: 1 },
    { name: "tradeLicense", maxCount: 1 },
  ]),
  DoctorController.uploadDocuments
);

router.get("/verification-status", DoctorController.getVerificationStatus);
router.get("/dashboard", DoctorController.getDashboard);
router.get("/complete-profile", DoctorController.getCompleteProfile);
router.post("/complete-profile", DoctorController.submitCompleteProfile);

router.put("/schedule", validation.scheduleValidation, validateRequest, DoctorController.updateSchedule);
router.put("/fee", validation.updateFeeValidation, validateRequest, DoctorController.updateFee);
router.put("/bank-info", validation.updateBankInfoValidation, validateRequest, DoctorController.updateBankInfo);
router.put("/mobile-banking", validation.updateMobileBankingValidation, validateRequest, DoctorController.updateMobileBanking);

// ==================== VERIFIED DOCTOR ONLY ROUTES ====================
// Apply verification check middleware for all routes below
router.use(requireDoctorVerified);

// Appointment Management
router.get("/appointments", validation.appointmentFilterValidation, validateRequest, DoctorController.getAppointments);
router.get("/appointments/today", DoctorController.getTodaySchedule);
router.get("/appointments/:appointmentId", DoctorController.getAppointmentDetails);
router.put("/appointments/:appointmentId/status", DoctorController.updateAppointmentStatus);

// Patients Management
router.get("/patients", DoctorController.getPatients);
router.get("/patients/:patientId", DoctorController.getPatientDetails);

// Reviews Management
router.get("/reviews", DoctorController.getReviews);
router.post("/reviews/:reviewId/respond", DoctorController.respondToReview);

// Earnings & Withdrawals
router.get("/earnings", DoctorController.getEarnings);
router.post("/withdrawals", validation.withdrawalRequestValidation, validateRequest, DoctorController.requestWithdrawal);
router.get("/withdrawals", DoctorController.getWithdrawalHistory);

export default router;