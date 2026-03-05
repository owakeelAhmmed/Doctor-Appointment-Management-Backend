import { body, param, query } from "express-validator";

export const initiatePaymentValidation = [
  body("appointmentId")
    .notEmpty()
    .withMessage("Appointment ID is required")
    .isMongoId()
    .withMessage("Invalid appointment ID"),

  body("paymentMethod")
    .notEmpty()
    .withMessage("Payment method is required")
    .isIn(["bKash", "Nagad", "card", "cash"])
    .withMessage("Invalid payment method"),
];

export const bKashPaymentValidation = [
  body("appointmentId")
    .isMongoId()
    .withMessage("Invalid appointment ID"),

  body("bkashNumber")
    .notEmpty()
    .withMessage("bKash number is required")
    .isMobilePhone("bn-BD")
    .withMessage("Valid bKash number required"),

  body("transactionId")
    .notEmpty()
    .withMessage("Transaction ID is required")
    .isString()
    .isLength({ min: 10, max: 50 })
    .withMessage("Invalid transaction ID"),
];

export const nagadPaymentValidation = [
  body("appointmentId")
    .isMongoId()
    .withMessage("Invalid appointment ID"),

  body("nagadNumber")
    .notEmpty()
    .withMessage("Nagad number is required")
    .isMobilePhone("bn-BD")
    .withMessage("Valid Nagad number required"),

  body("transactionId")
    .notEmpty()
    .withMessage("Transaction ID is required")
    .isString()
    .isLength({ min: 10, max: 50 })
    .withMessage("Invalid transaction ID"),
];

export const cardPaymentValidation = [
  body("appointmentId")
    .isMongoId()
    .withMessage("Invalid appointment ID"),

  body("cardNumber")
    .notEmpty()
    .withMessage("Card number is required")
    .isCreditCard()
    .withMessage("Invalid card number"),

  body("cardHolderName")
    .notEmpty()
    .withMessage("Card holder name is required")
    .isString()
    .isLength({ min: 3, max: 100 }),

  body("expiryMonth")
    .notEmpty()
    .withMessage("Expiry month is required")
    .isInt({ min: 1, max: 12 }),

  body("expiryYear")
    .notEmpty()
    .withMessage("Expiry year is required")
    .isInt({ min: new Date().getFullYear() }),

  body("cvv")
    .notEmpty()
    .withMessage("CVV is required")
    .isString()
    .isLength({ min: 3, max: 4 }),
];

export const cashPaymentValidation = [
  body("appointmentId")
    .isMongoId()
    .withMessage("Invalid appointment ID"),
];

export const verifyPaymentValidation = [
  param("paymentId")
    .isMongoId()
    .withMessage("Invalid payment ID"),

  body("transactionId")
    .optional()
    .isString()
    .isLength({ min: 5, max: 50 }),

  body("status")
    .optional()
    .isIn(["completed", "failed"])
    .withMessage("Invalid status"),
];

export const refundPaymentValidation = [
  param("paymentId")
    .isMongoId()
    .withMessage("Invalid payment ID"),

  body("amount")
    .optional()
    .isFloat({ min: 1 })
    .withMessage("Refund amount must be positive"),

  body("reason")
    .notEmpty()
    .withMessage("Refund reason is required")
    .isString()
    .isLength({ min: 5, max: 200 })
    .withMessage("Reason must be between 5 and 200 characters"),
];

export const getPaymentsValidation = [
  query("status")
    .optional()
    .isIn(["pending", "completed", "failed", "refunded", "all"])
    .withMessage("Invalid status"),

  query("fromDate")
    .optional()
    .isDate()
    .withMessage("Valid from date required"),

  query("toDate")
    .optional()
    .isDate()
    .withMessage("Valid to date required"),

  query("paymentMethod")
    .optional()
    .isIn(["bKash", "Nagad", "card", "cash", "all"])
    .withMessage("Invalid payment method"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
];

export const withdrawalRequestValidation = [
  body("doctorId")
    .isMongoId()
    .withMessage("Invalid doctor ID"),

  body("amount")
    .notEmpty()
    .withMessage("Amount is required")
    .isFloat({ min: 100 })
    .withMessage("Minimum withdrawal amount is 100 BDT"),

  body("paymentMethod")
    .notEmpty()
    .withMessage("Payment method is required")
    .isIn(["bank", "bKash", "nagad"])
    .withMessage("Invalid payment method"),

  body("accountDetails")
    .notEmpty()
    .withMessage("Account details are required")
    .isObject(),
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

  body("transactionId")
    .optional()
    .isString()
    .isLength({ min: 5, max: 50 }),

  body("notes")
    .optional()
    .isString()
    .isLength({ max: 200 }),
];

export const generateReportValidation = [
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
    .isIn(["day", "week", "month", "doctor", "method"])
    .withMessage("Invalid group by option"),

  query("format")
    .optional()
    .isIn(["json", "csv", "pdf"])
    .withMessage("Invalid format"),
];