import { body, param, query } from "express-validator";

export const createReviewValidation = [
  body("appointmentId")
    .notEmpty()
    .withMessage("Appointment ID is required")
    .isMongoId()
    .withMessage("Invalid appointment ID"),

  body("rating")
    .notEmpty()
    .withMessage("Rating is required")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5"),

  body("comment")
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage("Comment cannot exceed 500 characters")
    .trim()
    .escape(),
];

export const updateReviewValidation = [
  param("reviewId")
    .isMongoId()
    .withMessage("Invalid review ID"),

  body("rating")
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5"),

  body("comment")
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage("Comment cannot exceed 500 characters")
    .trim()
    .escape(),
];

export const respondToReviewValidation = [
  param("reviewId")
    .isMongoId()
    .withMessage("Invalid review ID"),

  body("comment")
    .notEmpty()
    .withMessage("Response comment is required")
    .isString()
    .isLength({ min: 2, max: 500 })
    .withMessage("Response must be between 2 and 500 characters")
    .trim()
    .escape(),
];

export const getReviewsValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be between 1 and 50"),

  query("sortBy")
    .optional()
    .isIn(["recent", "rating", "oldest"])
    .withMessage("Invalid sort option"),

  query("rating")
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5"),
];

export const getDoctorReviewsValidation = [
  param("doctorId")
    .isMongoId()
    .withMessage("Invalid doctor ID"),

  query("page")
    .optional()
    .isInt({ min: 1 }),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 }),

  query("sortBy")
    .optional()
    .isIn(["recent", "rating", "oldest"]),

  query("rating")
    .optional()
    .isInt({ min: 1, max: 5 }),
];

export const getPatientReviewsValidation = [
  param("patientId")
    .isMongoId()
    .withMessage("Invalid patient ID"),

  query("page")
    .optional()
    .isInt({ min: 1 }),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 }),
];

export const reportReviewValidation = [
  param("reviewId")
    .isMongoId()
    .withMessage("Invalid review ID"),

  body("reason")
    .notEmpty()
    .withMessage("Report reason is required")
    .isString()
    .isLength({ min: 5, max: 200 })
    .withMessage("Reason must be between 5 and 200 characters"),

  body("details")
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage("Details cannot exceed 500 characters"),
];

export const moderateReviewValidation = [
  param("reviewId")
    .isMongoId()
    .withMessage("Invalid review ID"),

  body("action")
    .notEmpty()
    .withMessage("Action is required")
    .isIn(["approve", "reject", "hide", "feature"])
    .withMessage("Invalid action"),

  body("reason")
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage("Reason cannot exceed 200 characters"),
];