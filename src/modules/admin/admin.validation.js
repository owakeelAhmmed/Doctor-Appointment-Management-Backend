import { body, param, query } from "express-validator";

// ==================== User Management ====================

export const updateUserStatusValidation = [
  param("userId")
    .isMongoId()
    .withMessage("Invalid user ID"),

  body("isActive")
    .notEmpty()
    .withMessage("Status is required")
    .isBoolean()
    .withMessage("Status must be boolean"),

  body("reason")
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage("Reason cannot exceed 200 characters"),
];

export const updateUserRoleValidation = [
  param("userId")
    .isMongoId()
    .withMessage("Invalid user ID"),

  body("role")
    .notEmpty()
    .withMessage("Role is required")
    .isIn(["patient", "doctor", "admin"])
    .withMessage("Invalid role"),

  body("reason")
    .optional()
    .isString(),
];

// ==================== Doctor Verification ====================

export const verifyDoctorValidation = [
  param("doctorId")
    .isMongoId()
    .withMessage("Invalid doctor ID"),

  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["verified", "rejected", "suspended"])
    .withMessage("Invalid status"),

  body("notes")
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage("Notes cannot exceed 500 characters"),

  body("commissionRate")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Commission rate must be between 0 and 100"),
];

export const verifyDocumentValidation = [
  param("doctorId")
    .isMongoId()
    .withMessage("Invalid doctor ID"),

  param("documentType")
    .isIn(["bmdcCertificate", "nid", "mbbsCertificate", "specializationCertificate", "profilePhoto"])
    .withMessage("Invalid document type"),

  body("verified")
    .notEmpty()
    .withMessage("Verification status is required")
    .isBoolean()
    .withMessage("Verified must be boolean"),

  body("notes")
    .optional()
    .isString(),
];

// ==================== Appointment Management ====================

export const updateAppointmentValidation = [
  param("appointmentId")
    .isMongoId()
    .withMessage("Invalid appointment ID"),

  body("status")
    .optional()
    .isIn(["pending", "confirmed", "completed", "cancelled", "no-show"])
    .withMessage("Invalid status"),

  body("notes")
    .optional()
    .isString(),
];

// ==================== Payment Management ====================

export const updatePaymentValidation = [
  param("paymentId")
    .isMongoId()
    .withMessage("Invalid payment ID"),

  body("status")
    .optional()
    .isIn(["pending", "completed", "failed", "refunded"])
    .withMessage("Invalid status"),

  body("transactionId")
    .optional()
    .isString(),
];

export const processWithdrawalValidation = [
  param("withdrawalId")
    .isMongoId()
    .withMessage("Invalid withdrawal ID"),

  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["approved", "rejected", "processed"])
    .withMessage("Invalid status"),

  body("notes")
    .optional()
    .isString(),

  body("transactionId")
    .optional()
    .isString(),
];

// ==================== Commission Management ====================

export const updateCommissionValidation = [
  param("doctorId")
    .isMongoId()
    .withMessage("Invalid doctor ID"),

  body("commissionRate")
    .notEmpty()
    .withMessage("Commission rate is required")
    .isFloat({ min: 0, max: 100 })
    .withMessage("Commission rate must be between 0 and 100"),

  body("effectiveFrom")
    .optional()
    .isDate()
    .withMessage("Valid date required"),
];

export const bulkCommissionUpdateValidation = [
  body("specialization")
    .optional()
    .isString(),

  body("commissionRate")
    .notEmpty()
    .withMessage("Commission rate is required")
    .isFloat({ min: 0, max: 100 })
    .withMessage("Commission rate must be between 0 and 100"),

  body("applyToAll")
    .optional()
    .isBoolean(),
];

// ==================== Reports & Analytics ====================

export const reportDateValidation = [
  query("fromDate")
    .optional()
    .isDate()
    .withMessage("Valid from date required"),

  query("toDate")
    .optional()
    .isDate()
    .withMessage("Valid to date required"),

  query("groupBy")
    .optional()
    .isIn(["day", "week", "month", "year"])
    .withMessage("Invalid group by option"),
];

export const doctorReportValidation = [
  param("doctorId")
    .isMongoId()
    .withMessage("Invalid doctor ID"),

  query("fromDate")
    .optional()
    .isDate(),

  query("toDate")
    .optional()
    .isDate(),
];

// ==================== Settings Management ====================

export const updateSettingsValidation = [
  body("commission.default")
    .optional()
    .isFloat({ min: 0, max: 100 }),

  body("commission.specializations")
    .optional()
    .isObject(),

  body("appointment.cancellationPolicy.hours")
    .optional()
    .isInt({ min: 1 }),

  body("appointment.cancellationPolicy.refundPercentage")
    .optional()
    .isInt({ min: 0, max: 100 }),

  body("payment.methods")
    .optional()
    .isArray(),

  body("payment.methods.*")
    .isIn(["bKash", "Nagad", "card", "cash"]),

  body("notification.email")
    .optional()
    .isBoolean(),

  body("notification.sms")
    .optional()
    .isBoolean(),

  body("notification.push")
    .optional()
    .isBoolean(),
];

// ==================== Filter Validations ====================

export const userFilterValidation = [
  query("role")
    .optional()
    .isIn(["patient", "doctor", "admin", "all"])
    .withMessage("Invalid role"),

  query("status")
    .optional()
    .isIn(["active", "inactive", "pending", "all"])
    .withMessage("Invalid status"),

  query("search")
    .optional()
    .isString(),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
];

export const doctorFilterValidation = [
  query("verificationStatus")
    .optional()
    .isIn(["pending", "under_review", "verified", "rejected", "all"])
    .withMessage("Invalid verification status"),

  query("specialization")
    .optional()
    .isString(),

  query("search")
    .optional()
    .isString(),

  query("sortBy")
    .optional()
    .isIn(["name", "rating", "patients", "earnings", "date"])
    .withMessage("Invalid sort field"),

  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Sort order must be asc or desc"),
];