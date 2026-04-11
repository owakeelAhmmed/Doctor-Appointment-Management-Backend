import { body, param, query } from "express-validator";

// ==================== User Management ====================

export const updateUserStatusValidation = [
  body("isActive")
    .notEmpty()
    .withMessage("isActive is required")
    .isBoolean()
    .withMessage("isActive must be true or false"),
];

export const updateUserRoleValidation = [
  body("role")
    .notEmpty()
    .withMessage("Role is required")
    .isIn(["patient", "doctor", "admin"])
    .withMessage("Invalid role. Cannot set superadmin via API"),
];

// ==================== Doctor Verification ====================

export const verifyDoctorValidation = [
  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["verified", "rejected", "suspended", "under_review", "document_verification"])
    .withMessage("Invalid status. Must be: verified, rejected, suspended, under_review, or document_verification"),

  body("notes")
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage("Notes must be under 500 characters"),

  // Rejection এ notes mandatory
  body("notes").custom((value, { req }) => {
    if (req.body.status === "rejected" && (!value || !value.trim())) {
      throw new Error("Rejection reason (notes) is required when rejecting");
    }
    return true;
  }),
];

export const verifyDocumentValidation = [
  param("documentType")
    .isIn([
      "bmdcCertificate", "nid", "basicDegree",
      "specializationCertificate", "tradeLicense", "profilePhoto", "chamberPhoto",
    ])
    .withMessage("Invalid document type"),

  body("verified")
    .notEmpty()
    .withMessage("verified field is required")
    .isBoolean()
    .withMessage("verified must be true or false"),

  body("rejectionReason")
    .optional()
    .isString()
    .isLength({ max: 300 })
    .withMessage("Rejection reason must be under 300 characters"),
];

// ==================== Appointment Management ====================

export const updateAppointmentValidation = [
  body("status")
    .optional()
    .isIn(["pending", "confirmed", "completed", "cancelled", "no-show"])
    .withMessage("Invalid appointment status"),
];

// ==================== Payment Management ====================

export const updatePaymentValidation = [
  body("status")
    .optional()
    .isIn(["pending", "completed", "failed", "refunded"])
    .withMessage("Invalid payment status"),
];

export const processWithdrawalValidation = [
  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["approved", "rejected", "processed"])
    .withMessage("Invalid withdrawal status"),

  body("notes")
    .optional()
    .isString()
    .isLength({ max: 300 }),
];

// ==================== Commission Management ====================
export const updateCommissionValidation = [
  body("commissionRate")
    .notEmpty()
    .withMessage("Commission rate is required")
    .isFloat({ min: 0, max: 100 })
    .withMessage("Commission rate must be between 0 and 100"),
];

export const bulkCommissionUpdateValidation = [
  body("commissionRate")
    .notEmpty()
    .withMessage("Commission rate is required")
    .isFloat({ min: 0, max: 100 })
    .withMessage("Commission rate must be between 0 and 100"),

  body("applyTo")
    .optional()
    .isIn(["all", "specialization"])
    .withMessage("applyTo must be 'all' or 'specialization'"),

  body("specialization")
    .optional()
    .isString(),
];

// ==================== Reports & Analytics ====================

export const reportDateValidation = [
  query("fromDate")
    .optional()
    .isDate()
    .withMessage("Valid from date required (YYYY-MM-DD)"),

  query("toDate")
    .optional()
    .isDate()
    .withMessage("Valid to date required (YYYY-MM-DD)"),

  query("groupBy")
    .optional()
    .isIn(["day", "week", "month", "year"])
    .withMessage("groupBy must be: day, week, month, or year"),
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
  body("defaultCommissionRate")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Commission rate must be between 0 and 100"),

  body("minWithdrawalAmount")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Minimum withdrawal must be positive"),

  body("maxWithdrawalAmount")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Maximum withdrawal must be positive"),
];

// ==================== Filter Validations ====================

export const userFilterValidation = [
  query("role")
    .optional()
    .isIn(["all", "patient", "doctor", "admin", "superadmin"])
    .withMessage("Invalid role filter"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
];

export const doctorFilterValidation = [
  query("status")
    .optional()
    .isIn([
      "all", "pending", "profile_submitted", "document_verification",
      "under_review", "verified", "rejected", "suspended",
    ])
    .withMessage("Invalid status filter"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("search")
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage("Search term too long"),
];