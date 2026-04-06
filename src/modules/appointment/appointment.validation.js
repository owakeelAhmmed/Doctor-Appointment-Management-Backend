import { body, param, query } from "express-validator";

export const bookAppointmentValidation = [
  body("doctorId")
    .notEmpty()
    .withMessage("Doctor ID is required")
    .isMongoId()
    .withMessage("Invalid doctor ID"),

  body("appointmentDate")
    .notEmpty()
    .withMessage("Appointment date is required")
    .isDate()
    .withMessage("Valid date required")
    .custom((value) => {
      const date = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (date < today) {
        throw new Error("Appointment date cannot be in the past");
      }
      return true;
    }),

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

  body("paymentMethod")
    .optional()
    .isIn(["bKash", "Nagad", "card", "cash"])
    .withMessage("Invalid payment method"),
];

export const updateAppointmentStatusValidation = [
  param("appointmentId")
    .isMongoId()
    .withMessage("Invalid appointment ID"),

  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["confirmed", "completed", "cancelled", "no-show"])
    .withMessage("Invalid status"),

  body("notes")
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage("Notes cannot exceed 200 characters"),
];

export const rescheduleAppointmentValidation = [
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

  body("reason")
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage("Reason cannot exceed 200 characters"),
];

export const cancelAppointmentValidation = [
  param("appointmentId")
    .isMongoId()
    .withMessage("Invalid appointment ID"),

  body("reason")
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage("Reason cannot exceed 200 characters"),

  body("cancelledBy")
    .optional()
    .isIn(["patient", "doctor", "admin"])
    .withMessage("Invalid cancellation source"),
];

export const getAppointmentsValidation = [
  query("status")
    .optional()
    .isIn(["pending", "confirmed", "completed", "cancelled", "all"])
    .withMessage("Invalid status"),

  query("fromDate")
    .optional()
    .isDate()
    .withMessage("Valid from date required"),

  query("toDate")
    .optional()
    .isDate()
    .withMessage("Valid to date required"),

  query("type")
    .optional()
    .isIn(["in-person", "video", "phone", "all"])
    .withMessage("Invalid consultation type"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be between 1 and 50"),
];

export const addPrescriptionValidation = [
  param("appointmentId")
    .isMongoId()
    .withMessage("Invalid appointment ID"),

  body("diagnosis")
    .notEmpty()
    .withMessage("Diagnosis is required")
    .isString()
    .isLength({ max: 500 })
    .withMessage("Diagnosis cannot exceed 500 characters"),

  body("medicines")
    .isArray()
    .withMessage("Medicines must be an array")
    .notEmpty()
    .withMessage("At least one medicine required"),

  body("medicines.*.name")
    .notEmpty()
    .withMessage("Medicine name is required"),

  body("medicines.*.dosage")
    .notEmpty()
    .withMessage("Dosage is required"),

  body("medicines.*.frequency")
    .notEmpty()
    .withMessage("Frequency is required"),

  body("medicines.*.duration")
    .optional()
    .isString(),

  body("medicines.*.instructions")
    .optional()
    .isString(),

  body("tests")
    .optional()
    .isArray(),

  body("tests.*.name")
    .notEmpty()
    .withMessage("Test name is required"),

  body("advice")
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage("Advice cannot exceed 500 characters"),

  body("followUpDate")
    .optional()
    .isDate()
    .withMessage("Valid follow-up date required"),
];

export const generateVideoLinkValidation = [
  param("appointmentId")
    .isMongoId()
    .withMessage("Invalid appointment ID"),
];

export const addMedicalNotesValidation = [
  param("appointmentId")
    .isMongoId()
    .withMessage("Invalid appointment ID"),

  body("notes")
    .notEmpty()
    .withMessage("Notes are required")
    .isString()
    .isLength({ max: 1000 })
    .withMessage("Notes cannot exceed 1000 characters"),
];