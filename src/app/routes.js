import { Router } from "express";
import mediaRoutes from "../modules/upload/media.routes.js";
import authRoutes from "../modules/auth/auth.routes.js";
import patientRoutes from "../modules/patient/patient.routes.js";

const router = Router();

// base route
router.get("/", (req, res) => {
  res.json({ message: "API v1 running ✅" });
});

// ✅ mount sub-routes here
router.use("/media", mediaRoutes); // => /api/v1/media

// later:
router.use("/auth", authRoutes);
router.use("/patient", patientRoutes);
// router.use("/doctors", doctorRoutes);
// router.use("/appointments", appointmentRoutes);

export default router;