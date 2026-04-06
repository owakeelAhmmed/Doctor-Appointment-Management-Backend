import { ReviewService } from "./review.service.js";
import { Patient } from "../patient/patient.model.js";
import { Doctor } from "../doctor/doctor.model.js";
import { ApiError } from "../../utils/apiError.js";

export class ReviewController {
  
  // ==================== Create & Manage ====================

  /**
   * Create new review (Patient only)
   */
  static async createReview(req, res, next) {
    try {
      const patient = await Patient.findOne({ user: req.user._id });
      if (!patient) {
        throw new ApiError(404, "Patient profile not found");
      }

      const result = await ReviewService.createReview(patient._id, req.body);
      
      res.status(201).json({
        success: true,
        message: "Review submitted successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update review (Patient only)
   */
  static async updateReview(req, res, next) {
    try {
      const { reviewId } = req.params;
      const patient = await Patient.findOne({ user: req.user._id });
      
      if (!patient) {
        throw new ApiError(404, "Patient profile not found");
      }

      const result = await ReviewService.updateReview(patient._id, reviewId, req.body);
      
      res.json({
        success: true,
        message: "Review updated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete review (Patient only)
   */
  static async deleteReview(req, res, next) {
    try {
      const { reviewId } = req.params;
      const patient = await Patient.findOne({ user: req.user._id });
      
      if (!patient) {
        throw new ApiError(404, "Patient profile not found");
      }

      const result = await ReviewService.deleteReview(patient._id, reviewId);
      
      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Respond to review (Doctor only)
   */
  static async respondToReview(req, res, next) {
    try {
      const { reviewId } = req.params;
      const doctor = await Doctor.findOne({ user: req.user._id });
      
      if (!doctor) {
        throw new ApiError(404, "Doctor profile not found");
      }

      const result = await ReviewService.respondToReview(doctor._id, reviewId, req.body);
      
      res.json({
        success: true,
        message: "Response added successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Query Methods ====================

  /**
   * Get reviews for a doctor
   */
  static async getDoctorReviews(req, res, next) {
    try {
      const { doctorId } = req.params;
      
      const result = await ReviewService.getDoctorReviews(doctorId, req.query);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get my reviews (Patient)
   */
  static async getMyReviews(req, res, next) {
    try {
      const patient = await Patient.findOne({ user: req.user._id });
      if (!patient) {
        throw new ApiError(404, "Patient profile not found");
      }

      const result = await ReviewService.getPatientReviews(patient._id, req.query);
      
      res.json({
        success: true,
        data: result.reviews,
        stats: result.stats,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get reviews I received (Doctor)
   */
  static async getMyReceivedReviews(req, res, next) {
    try {
      const doctor = await Doctor.findOne({ user: req.user._id });
      if (!doctor) {
        throw new ApiError(404, "Doctor profile not found");
      }

      const result = await ReviewService.getDoctorReviews(doctor._id, req.query);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single review
   */
  static async getReviewById(req, res, next) {
    try {
      const { reviewId } = req.params;
      
      const result = await ReviewService.getReviewById(reviewId);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check if can review
   */
  static async canReview(req, res, next) {
    try {
      const { doctorId } = req.params;
      const patient = await Patient.findOne({ user: req.user._id });
      
      if (!patient) {
        throw new ApiError(404, "Patient profile not found");
      }

      const result = await ReviewService.canReview(patient._id, doctorId);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get recent reviews (public)
   */
  static async getRecentReviews(req, res, next) {
    try {
      const limit = req.query.limit || 10;
      
      const result = await ReviewService.getRecentReviews(limit);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get top rated doctors (public)
   */
  static async getTopRatedDoctors(req, res, next) {
    try {
      const limit = req.query.limit || 10;
      
      const result = await ReviewService.getTopRatedDoctors(limit);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Statistics ====================

  /**
   * Get my review stats (Doctor)
   */
  static async getMyStats(req, res, next) {
    try {
      const doctor = await Doctor.findOne({ user: req.user._id });
      if (!doctor) {
        throw new ApiError(404, "Doctor profile not found");
      }

      const result = await ReviewService.getDoctorStats(doctor._id);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get doctor review stats (public)
   */
  static async getDoctorStats(req, res, next) {
    try {
      const { doctorId } = req.params;
      
      const result = await ReviewService.getDoctorStats(doctorId);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get platform stats (public)
   */
  static async getPlatformStats(req, res, next) {
    try {
      const result = await ReviewService.getPlatformStats();
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Admin Routes ====================

  /**
   * Get flagged reviews (Admin only)
   */
  static async getFlaggedReviews(req, res, next) {
    try {
      const result = await ReviewService.getFlaggedReviews(req.query);
      
      res.json({
        success: true,
        data: result.reviews,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Moderate review (Admin only)
   */
  static async moderateReview(req, res, next) {
    try {
      const { reviewId } = req.params;
      const { action, reason } = req.body;
      
      const result = await ReviewService.moderateReview(reviewId, action, reason);
      
      res.json({
        success: true,
        message: `Review ${action}d successfully`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}