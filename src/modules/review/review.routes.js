import { Router } from "express";
import { ReviewController } from "./review.controller.js";
import { protect, authorize } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate.middleware.js";
import * as validation from "./review.validation.js";

const router = Router();

// ==================== Public Routes ====================

/**
 * @route   GET /api/v1/reviews/recent
 * @desc    Get recent reviews
 * @access  Public
 */
router.get("/recent", ReviewController.getRecentReviews);

/**
 * @route   GET /api/v1/reviews/top-doctors
 * @desc    Get top rated doctors
 * @access  Public
 */
router.get("/top-doctors", ReviewController.getTopRatedDoctors);

/**
 * @route   GET /api/v1/reviews/platform-stats
 * @desc    Get platform review statistics
 * @access  Public
 */
router.get("/platform-stats", ReviewController.getPlatformStats);

/**
 * @route   GET /api/v1/reviews/doctor/:doctorId
 * @desc    Get reviews for a doctor
 * @access  Public
 */
router.get(
  "/doctor/:doctorId",
  validation.getDoctorReviewsValidation,
  validateRequest,
  ReviewController.getDoctorReviews
);

/**
 * @route   GET /api/v1/reviews/doctor/:doctorId/stats
 * @desc    Get doctor review statistics
 * @access  Public
 */
router.get("/doctor/:doctorId/stats", ReviewController.getDoctorStats);

/**
 * @route   GET /api/v1/reviews/:reviewId
 * @desc    Get single review
 * @access  Public
 */
router.get("/:reviewId", ReviewController.getReviewById);

// ==================== Protected Routes ====================
router.use(protect);

// ==================== Patient Routes ====================

/**
 * @route   POST /api/v1/reviews
 * @desc    Create new review (Patient only)
 * @access  Private (Patient)
 */
router.post(
  "/",
  authorize("patient"),
  validation.createReviewValidation,
  validateRequest,
  ReviewController.createReview
);

/**
 * @route   GET /api/v1/reviews/patient/my
 * @desc    Get my reviews (Patient)
 * @access  Private (Patient)
 */
router.get(
  "/patient/my",
  authorize("patient"),
  validation.getPatientReviewsValidation,
  validateRequest,
  ReviewController.getMyReviews
);

/**
 * @route   PUT /api/v1/reviews/:reviewId
 * @desc    Update review (Patient only)
 * @access  Private (Patient)
 */
router.put(
  "/:reviewId",
  authorize("patient"),
  validation.updateReviewValidation,
  validateRequest,
  ReviewController.updateReview
);

/**
 * @route   DELETE /api/v1/reviews/:reviewId
 * @desc    Delete review (Patient only)
 * @access  Private (Patient)
 */
router.delete(
  "/:reviewId",
  authorize("patient"),
  ReviewController.deleteReview
);

/**
 * @route   GET /api/v1/reviews/can-review/:doctorId
 * @desc    Check if can review doctor
 * @access  Private (Patient)
 */
router.get(
  "/can-review/:doctorId",
  authorize("patient"),
  ReviewController.canReview
);

// ==================== Doctor Routes ====================

/**
 * @route   GET /api/v1/reviews/doctor/my/received
 * @desc    Get reviews I received (Doctor)
 * @access  Private (Doctor)
 */
router.get(
  "/doctor/my/received",
  authorize("doctor"),
  validation.getDoctorReviewsValidation,
  validateRequest,
  ReviewController.getMyReceivedReviews
);

/**
 * @route   GET /api/v1/reviews/doctor/my/stats
 * @desc    Get my review stats (Doctor)
 * @access  Private (Doctor)
 */
router.get(
  "/doctor/my/stats",
  authorize("doctor"),
  ReviewController.getMyStats
);

/**
 * @route   POST /api/v1/reviews/:reviewId/respond
 * @desc    Respond to review (Doctor only)
 * @access  Private (Doctor)
 */
router.post(
  "/:reviewId/respond",
  authorize("doctor"),
  validation.respondToReviewValidation,
  validateRequest,
  ReviewController.respondToReview
);

// ==================== Admin Routes ====================

/**
 * @route   GET /api/v1/reviews/admin/flagged
 * @desc    Get flagged reviews (Admin only)
 * @access  Private (Admin/SuperAdmin)
 */
router.get(
  "/admin/flagged",
  authorize("admin", "superadmin"),
  ReviewController.getFlaggedReviews
);

/**
 * @route   PUT /api/v1/reviews/admin/:reviewId/moderate
 * @desc    Moderate review (Admin only)
 * @access  Private (Admin/SuperAdmin)
 */
router.put(
  "/admin/:reviewId/moderate",
  authorize("admin", "superadmin"),
  validation.moderateReviewValidation,
  validateRequest,
  ReviewController.moderateReview
);

export default router;