import { body, param, query } from "express-validator";

export const updateProfileValidation = [
  body("fullName")
    .optional()
    .isLength({ min: 3, max: 50 })
    .withMessage("Full name must be between 3 and 50 characters"),

  body("bloodGroup")
    .optional()
    .isIn(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"])
    .withMessage("Invalid blood group"),

  body("allergies")
    .optional()
    .isArray()
    .withMessage("Allergies must be an array"),

  body("chronicDiseases")
    .optional()
    .isArray()
    .withMessage("Chronic diseases must be an array"),

  body("emergencyContact.name")
    .optional()
    .isLength({ min: 3 })
    .withMessage("Emergency contact name must be at least 3 characters"),

  body("emergencyContact.phone")
    .optional()
    .isMobilePhone("bn-BD")
    .withMessage("Valid Bangladeshi phone number required"),

  body("preferences.language")
    .optional()
    .isIn(["bangla", "english"])
    .withMessage("Language must be bangla or english"),

  body("preferences.notification")
    .optional()
    .isObject()
    .withMessage("Notification preferences must be an object"),
];

export const addMedicalHistoryValidation = [
  body("condition")
    .notEmpty()
    .withMessage("Medical condition is required")
    .isLength({ min: 3 })
    .withMessage("Condition must be at least 3 characters"),

  body("diagnosedDate")
    .notEmpty()
    .withMessage("Diagnosed date is required")
    .isDate()
    .withMessage("Valid date required"),

  body("notes")
    .optional()
    .isString(),
];

export const addMedicationValidation = [
  body("name")
    .notEmpty()
    .withMessage("Medication name is required"),

  body("dosage")
    .notEmpty()
    .withMessage("Dosage is required"),

  body("frequency")
    .notEmpty()
    .withMessage("Frequency is required"),

  body("startDate")
    .notEmpty()
    .withMessage("Start date is required")
    .isDate()
    .withMessage("Valid date required"),
];

export const doctorSearchValidation = [
  query("specialization")
    .optional()
    .isString(),

  query("city")
    .optional()
    .isString(),

  query("name")
    .optional()
    .isString(),

  query("minFee")
    .optional()
    .isNumeric()
    .withMessage("Min fee must be a number"),

  query("maxFee")
    .optional()
    .isNumeric()
    .withMessage("Max fee must be a number"),

  query("rating")
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage("Rating must be between 0 and 5"),

  query("availableToday")
    .optional()
    .isBoolean()
    .withMessage("availableToday must be true or false"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be between 1 and 50"),
];

export const appointmentBookingValidation = [
  body("doctorId")
    .notEmpty()
    .withMessage("Doctor ID is required")
    .isMongoId()
    .withMessage("Invalid doctor ID"),

  body("appointmentDate")
    .notEmpty()
    .withMessage("Appointment date is required")
    .isDate()
    .withMessage("Valid date required"),

  body("startTime")
    .notEmpty()
    .withMessage("Start time is required")
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Invalid time format (HH:MM)"),

  body("symptoms")
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage("Symptoms cannot exceed 500 characters"),

  body("type")
    .notEmpty()
    .withMessage("Consultation type is required")
    .isIn(["in-person", "video", "phone"])
    .withMessage("Type must be in-person, video, or phone"),
];

export const rescheduleValidation = [
  param("appointmentId")
    .isMongoId()
    .withMessage("Invalid appointment ID"),

  body("newDate")
    .notEmpty()
    .withMessage("New date is required")
    .isDate()
    .withMessage("Valid date required"),

  body("newTime")
    .notEmpty()
    .withMessage("New time is required")
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Invalid time format (HH:MM)"),
];

export const reviewValidation = [
  param("appointmentId")
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
    .withMessage("Comment cannot exceed 500 characters"),
];