import { Router } from "express";
import mediaRoutes from "../modules/upload/media.routes.js";
import authRoutes from "../modules/auth/auth.routes.js";
import patientRoutes from "../modules/patient/patient.routes.js";
import doctorRoutes from "../modules/doctor/doctor.routes.js";
import adminRoutes from "../modules/admin/admin.routes.js";
import appointmentRoutes from "../modules/appointment/appointment.routes.js";
import prescriptionRoutes from "../modules/prescription/prescription.routes.js";
import reviewRoutes from "../modules/review/review.routes.js";
import paymentRoutes from "../modules/payment/payment.routes.js";
import { handleBKashWebhook, handleNagadWebhook, handleCardWebhook } from "../modules/payment/payment.webhook.js";

const router = Router();

// base route
router.get("/", (req, res) => {
  res.json({ message: "API v1 running ✅" });
});

router.use("/media", mediaRoutes);

// later:
router.use("/auth", authRoutes);
router.use("/patient", patientRoutes);
router.use("/doctor", doctorRoutes);
router.use("/admin", adminRoutes);
router.use("/appointments", appointmentRoutes);
router.use("/prescriptions", prescriptionRoutes);
router.use("/reviews", reviewRoutes);
router.use("/payments", paymentRoutes);

// Payment webhooks (public)
router.post("/webhooks/bkash", handleBKashWebhook);
router.post("/webhooks/nagad", handleNagadWebhook);
router.post("/webhooks/card", handleCardWebhook);

export default router;