import { Router } from "express";
import { protect, authorize } from "../../middlewares/auth.middleware.js";
import * as validation from "../../middlewares/auth.validation.js";
import { AuthController } from "./auth.controller.js";
import { validateRequest } from "../../middlewares/validate.middleware.js";
import uploadMemory from "../../middlewares/uploadMemory.js";

const router = Router();

// Public Routes
router.post(
  "/register",
  validation.registerValidation,
  validateRequest,
  AuthController.register
);

router.post(
  "/login",
  validation.loginValidation,
  validateRequest,
  AuthController.login
);

router.post(
  "/verify-email",
  [...validation.emailValidation, ...validation.verifyOTPValidation],
  validateRequest,
  AuthController.verifyEmail
);

router.post(
  "/verify-phone",
  [...validation.phoneValidation, ...validation.verifyOTPValidation],
  validateRequest,
  AuthController.verifyPhone
);

router.post(
  "/resend-otp",
  validateRequest,
  AuthController.resendOTP
);

router.post(
  "/forgot-password",
  validation.forgotPasswordValidation,
  validateRequest,
  AuthController.forgotPassword
);

router.post(
  "/reset-password",
  validation.resetPasswordValidation,
  validateRequest,
  AuthController.resetPassword
);

router.post("/logout", AuthController.logout);

// Protected Routes (Any authenticated user)
router.use(protect);

router.get("/me", AuthController.getMe);

router.put(
  "/change-password",
  validation.changePasswordValidation,
  validateRequest,
  AuthController.changePassword
);

router.put(
  "/profile",
  AuthController.updateProfile
);

// Doctor Routes
router.post(
  "/doctor/complete-profile",
  authorize("doctor"),
  uploadMemory.fields([
    { name: "bmdcCertificate", maxCount: 1 },
    { name: "nid", maxCount: 1 },
    { name: "mbbsCertificate", maxCount: 1 },
    { name: "specializationCertificate", maxCount: 1 },
    { name: "profilePhoto", maxCount: 1 },
  ]),
  AuthController.completeDoctorProfile
);

// Admin Routes (SuperAdmin only)
router.post(
  "/admin/create",
  authorize("superadmin"),
  validation.createAdminValidation,
  validateRequest,
  AuthController.createAdmin
);

router.get(
  "/admin/list",
  authorize("superadmin"),
  AuthController.getAllAdmins
);

router.put(
  "/admin/:adminId/permissions",
  authorize("superadmin"),
  AuthController.updateAdminPermissions
);

// Admin Routes (Admin with permissions)
router.get(
  "/admin/dashboard",
  authorize("admin", "superadmin"),
  (req, res) => {
    res.json({
      success: true,
      message: "Welcome to Admin Dashboard",
      data: {
        user: req.user,
      },
    });
  }
);

export default router;