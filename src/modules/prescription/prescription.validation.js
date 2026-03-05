import { body, param, query } from "express-validator";

export const createPrescriptionValidation = [
  body("appointmentId")
    .notEmpty()
    .withMessage("Appointment ID is required")
    .isMongoId()
    .withMessage("Invalid appointment ID"),

  body("diagnosis")
    .notEmpty()
    .withMessage("Diagnosis is required")
    .isString()
    .isLength({ min: 3, max: 500 })
    .withMessage("Diagnosis must be between 3 and 500 characters"),

  body("medicines")
    .isArray()
    .withMessage("Medicines must be an array")
    .notEmpty()
    .withMessage("At least one medicine is required"),

  body("medicines.*.name")
    .notEmpty()
    .withMessage("Medicine name is required")
    .isString()
    .isLength({ min: 2, max: 100 })
    .withMessage("Medicine name must be between 2 and 100 characters"),

  body("medicines.*.dosage")
    .notEmpty()
    .withMessage("Dosage is required")
    .isString()
    .isLength({ max: 50 })
    .withMessage("Dosage cannot exceed 50 characters"),

  body("medicines.*.frequency")
    .notEmpty()
    .withMessage("Frequency is required")
    .isString()
    .isIn(["1+0+0", "0+1+0", "0+0+1", "1+1+0", "1+0+1", "0+1+1", "1+1+1", "1+1+1+1", "as-needed"])
    .withMessage("Invalid frequency format"),

  body("medicines.*.duration")
    .optional()
    .isString()
    .isLength({ max: 50 })
    .withMessage("Duration cannot exceed 50 characters"),

  body("medicines.*.instructions")
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage("Instructions cannot exceed 200 characters"),

  body("medicines.*.beforeMeal")
    .optional()
    .isBoolean()
    .withMessage("beforeMeal must be boolean"),

  body("tests")
    .optional()
    .isArray()
    .withMessage("Tests must be an array"),

  body("tests.*.name")
    .notEmpty()
    .withMessage("Test name is required")
    .isString()
    .isLength({ max: 100 })
    .withMessage("Test name cannot exceed 100 characters"),

  body("tests.*.instructions")
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage("Test instructions cannot exceed 200 characters"),

  body("advice")
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage("Advice cannot exceed 500 characters"),

  body("followUpDate")
    .optional()
    .isDate()
    .withMessage("Valid follow-up date required")
    .custom((value) => {
      const date = new Date(value);
      const today = new Date();
      if (date < today) {
        throw new Error("Follow-up date cannot be in the past");
      }
      return true;
    }),

  body("notes")
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage("Notes cannot exceed 500 characters"),
];

export const updatePrescriptionValidation = [
  param("prescriptionId")
    .isMongoId()
    .withMessage("Invalid prescription ID"),

  body("diagnosis")
    .optional()
    .isString()
    .isLength({ min: 3, max: 500 })
    .withMessage("Diagnosis must be between 3 and 500 characters"),

  body("medicines")
    .optional()
    .isArray()
    .withMessage("Medicines must be an array"),

  body("tests")
    .optional()
    .isArray()
    .withMessage("Tests must be an array"),

  body("advice")
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage("Advice cannot exceed 500 characters"),

  body("followUpDate")
    .optional()
    .isDate()
    .withMessage("Valid follow-up date required"),

  body("notes")
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage("Notes cannot exceed 500 characters"),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be boolean"),
];

export const addMedicineValidation = [
  param("prescriptionId")
    .isMongoId()
    .withMessage("Invalid prescription ID"),

  body("name")
    .notEmpty()
    .withMessage("Medicine name is required")
    .isString()
    .isLength({ min: 2, max: 100 })
    .withMessage("Medicine name must be between 2 and 100 characters"),

  body("dosage")
    .notEmpty()
    .withMessage("Dosage is required")
    .isString()
    .isLength({ max: 50 })
    .withMessage("Dosage cannot exceed 50 characters"),

  body("frequency")
    .notEmpty()
    .withMessage("Frequency is required")
    .isString()
    .isIn(["1+0+0", "0+1+0", "0+0+1", "1+1+0", "1+0+1", "0+1+1", "1+1+1", "1+1+1+1", "as-needed"])
    .withMessage("Invalid frequency format"),

  body("duration")
    .optional()
    .isString()
    .isLength({ max: 50 })
    .withMessage("Duration cannot exceed 50 characters"),

  body("instructions")
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage("Instructions cannot exceed 200 characters"),
];

export const updateMedicineValidation = [
  param("prescriptionId")
    .isMongoId()
    .withMessage("Invalid prescription ID"),

  param("medicineId")
    .isMongoId()
    .withMessage("Invalid medicine ID"),

  body("name")
    .optional()
    .isString()
    .isLength({ min: 2, max: 100 }),

  body("dosage")
    .optional()
    .isString()
    .isLength({ max: 50 }),

  body("frequency")
    .optional()
    .isString()
    .isIn(["1+0+0", "0+1+0", "0+0+1", "1+1+0", "1+0+1", "0+1+1", "1+1+1", "1+1+1+1", "as-needed"]),

  body("duration")
    .optional()
    .isString()
    .isLength({ max: 50 }),

  body("instructions")
    .optional()
    .isString()
    .isLength({ max: 200 }),
];

export const addTestValidation = [
  param("prescriptionId")
    .isMongoId()
    .withMessage("Invalid prescription ID"),

  body("name")
    .notEmpty()
    .withMessage("Test name is required")
    .isString()
    .isLength({ max: 100 })
    .withMessage("Test name cannot exceed 100 characters"),

  body("instructions")
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage("Instructions cannot exceed 200 characters"),
];

export const updateTestValidation = [
  param("prescriptionId")
    .isMongoId()
    .withMessage("Invalid prescription ID"),

  param("testId")
    .isMongoId()
    .withMessage("Invalid test ID"),

  body("name")
    .optional()
    .isString()
    .isLength({ max: 100 }),

  body("instructions")
    .optional()
    .isString()
    .isLength({ max: 200 }),

  body("isCompleted")
    .optional()
    .isBoolean()
    .withMessage("isCompleted must be boolean"),
];

export const getPrescriptionsValidation = [
  query("status")
    .optional()
    .isIn(["active", "all"])
    .withMessage("Invalid status"),

  query("fromDate")
    .optional()
    .isDate()
    .withMessage("Valid from date required"),

  query("toDate")
    .optional()
    .isDate()
    .withMessage("Valid to date required"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be between 1 and 50"),
];

export const generatePDFValidation = [
  param("prescriptionId")
    .isMongoId()
    .withMessage("Invalid prescription ID"),
];

export const addDigitalSignatureValidation = [
  param("prescriptionId")
    .isMongoId()
    .withMessage("Invalid prescription ID"),

  body("signature")
    .notEmpty()
    .withMessage("Signature is required")
    .isString(),
];