import { Router } from "express";
import mediaRoutes from "../modules/upload/media.routes.js";
import authRoutes from "../modules/auth/auth.routes.js";
import patientRoutes from "../modules/patient/patient.routes.js";
import doctorRoutes from "../modules/doctor/doctor.routes.js";
import adminRoutes from "../modules/admin/admin.routes.js";

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

export default router;