import { validationResult } from "express-validator";

export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value,
    }));

    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: formattedErrors,
      error: formattedErrors[0]?.message || "Invalid input data",
    });
  }
  
  next();
};

export const createValidator = (validationRules) => {
  return [
    ...validationRules,
    validateRequest,
  ];
};
