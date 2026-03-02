import { body, param, query } from "express-validator";

export const updateProfileValidation = [
  body("specialization")
    .optional()
    .isString()
    .withMessage("Specialization must be string"),

  body("qualifications")
    .optional()
    .isArray()
    .withMessage("Qualifications must be an array"),

  body("qualifications.*.degree")
    .optional()
    .isString()
    .withMessage("Degree must be string"),

  body("qualifications.*.institute")
    .optional()
    .isString()
    .withMessage("Institute must be string"),

  body("qualifications.*.year")
    .optional()
    .isInt({ min: 1950, max: new Date().getFullYear() })
    .withMessage("Valid year required"),

  body("experienceYears")
    .optional()
    .isInt({ min: 0, max: 70 })
    .withMessage("Experience years must be between 0 and 70"),

  body("currentWorkplace.name")
    .optional()
    .isString()
    .withMessage("Workplace name must be string"),

  body("currentWorkplace.address")
    .optional()
    .isString(),

  body("consultationFee")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Consultation fee must be positive number"),

  body("availableDays")
    .optional()
    .isArray()
    .withMessage("Available days must be an array"),

  body("availableDays.*.day")
    .optional()
    .isIn(["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"])
    .withMessage("Invalid day"),

  body("availableDays.*.slots")
    .optional()
    .isArray()
    .withMessage("Slots must be an array"),

  body("availableDays.*.slots.*.startTime")
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Invalid start time format (HH:MM)"),

  body("availableDays.*.slots.*.endTime")
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Invalid end time format (HH:MM)"),

  body("availableDays.*.slots.*.type")
    .optional()
    .isIn(["in-person", "video", "phone"])
    .withMessage("Invalid slot type"),

  body("consultationTypes")
    .optional()
    .isArray()
    .withMessage("Consultation types must be an array"),

  body("consultationTypes.*")
    .isIn(["in-person", "video", "phone"])
    .withMessage("Invalid consultation type"),

  body("bankInfo.bankName")
    .optional()
    .isString(),

  body("bankInfo.accountNumber")
    .optional()
    .isString(),

  body("bankInfo.accountHolderName")
    .optional()
    .isString(),

  body("mobileBanking.bKash")
    .optional()
    .isMobilePhone("bn-BD")
    .withMessage("Valid bKash number required"),

  body("mobileBanking.nagad")
    .optional()
    .isMobilePhone("bn-BD")
    .withMessage("Valid Nagad number required"),
];

export const scheduleValidation = [
  body("availableDays")
    .isArray()
    .withMessage("Available days must be an array")
    .notEmpty()
    .withMessage("At least one day required"),

  body("availableDays.*.day")
    .isIn(["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"])
    .withMessage("Invalid day"),

  body("availableDays.*.slots")
    .isArray()
    .withMessage("Slots must be an array")
    .notEmpty()
    .withMessage("At least one slot required"),

  body("availableDays.*.slots.*.startTime")
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Invalid start time format"),

  body("availableDays.*.slots.*.endTime")
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Invalid end time format")
    .custom((value, { req, location, path }) => {
      const slotIndex = path.split('[')[1]?.split(']')[0];
      const dayIndex = path.split('[')[2]?.split(']')[0];
      
      if (slotIndex && dayIndex) {
        const startTime = req.body.availableDays[dayIndex].slots[slotIndex].startTime;
        if (value <= startTime) {
          throw new Error("End time must be after start time");
        }
      }
      return true;
    }),

  body("availableDays.*.slots.*.type")
    .isIn(["in-person", "video", "phone"])
    .withMessage("Invalid slot type"),

  body("availableDays.*.slots.*.maxPatients")
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage("Max patients must be between 1 and 10"),
];

export const updateFeeValidation = [
  body("consultationFee")
    .notEmpty()
    .withMessage("Consultation fee is required")
    .isInt({ min: 0 })
    .withMessage("Consultation fee must be positive number"),
];

export const updateBankInfoValidation = [
  body("bankInfo.bankName")
    .notEmpty()
    .withMessage("Bank name is required"),

  body("bankInfo.accountNumber")
    .notEmpty()
    .withMessage("Account number is required"),

  body("bankInfo.accountHolderName")
    .notEmpty()
    .withMessage("Account holder name is required"),

  body("bankInfo.routingNumber")
    .optional()
    .isString(),

  body("bankInfo.branchName")
    .optional()
    .isString(),
];

export const updateMobileBankingValidation = [
  body("mobileBanking.bKash")
    .optional()
    .isMobilePhone("bn-BD")
    .withMessage("Valid bKash number required"),

  body("mobileBanking.nagad")
    .optional()
    .isMobilePhone("bn-BD")
    .withMessage("Valid Nagad number required"),

  body("mobileBanking.rocket")
    .optional()
    .isMobilePhone("bn-BD")
    .withMessage("Valid Rocket number required"),
];

export const appointmentFilterValidation = [
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

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be between 1 and 50"),
];

export const withdrawalRequestValidation = [
  body("amount")
    .notEmpty()
    .withMessage("Amount is required")
    .isInt({ min: 100 })
    .withMessage("Minimum withdrawal amount is 100 BDT"),

  body("paymentMethod")
    .notEmpty()
    .withMessage("Payment method is required")
    .isIn(["bank", "bKash", "nagad"])
    .withMessage("Invalid payment method"),
];