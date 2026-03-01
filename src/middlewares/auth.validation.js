import { body } from "express-validator";

export const registerValidation = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
  
  body("phone")
    .isMobilePhone("bn-BD")
    .withMessage("Please provide a valid Bangladeshi phone number")
    .custom((value) => {
      // Check if starts with 01 and has 11 digits
      if (!/^01[3-9]\d{8}$/.test(value)) {
        throw new Error("Invalid Bangladeshi phone number format");
      }
      return true;
    }),
  
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
    .withMessage("Password must contain at least one letter and one number"),
  
  body("fullName")
    .notEmpty()
    .withMessage("Full name is required")
    .isLength({ min: 3, max: 50 })
    .withMessage("Full name must be between 3 and 50 characters"),
  
  body("dateOfBirth")
    .isDate()
    .withMessage("Valid date of birth is required")
    .custom((value) => {
      const age = new Date().getFullYear() - new Date(value).getFullYear();
      if (age < 18) {
        throw new Error("You must be at least 18 years old");
      }
      return true;
    }),
  
  body("gender")
    .isIn(["M", "F", "O"])
    .withMessage("Gender must be M, F, or O"),
  
  body("role")
    .optional()
    .isIn(["patient", "doctor", "admin"])
    .withMessage("Role must be patient, doctor, or admin"),
];

export const loginValidation = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
  
  body("password")
    .notEmpty()
    .withMessage("Password is required"),
];

export const verifyOTPValidation = [
  body("otp")
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be 6 digits")
    .isNumeric()
    .withMessage("OTP must contain only numbers"),
];

export const emailValidation = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
];

export const phoneValidation = [
  body("phone")
    .isMobilePhone("bn-BD")
    .withMessage("Please provide a valid Bangladeshi phone number"),
];

export const forgotPasswordValidation = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
];

export const resetPasswordValidation = [
  body("token")
    .notEmpty()
    .withMessage("Reset token is required"),
  
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
    .withMessage("Password must contain at least one letter and one number"),
];

export const changePasswordValidation = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
    .withMessage("Password must contain at least one letter and one number"),
];

export const createAdminValidation = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
  
  body("phone")
    .isMobilePhone("bn-BD")
    .withMessage("Please provide a valid Bangladeshi phone number"),
  
  body("fullName")
    .notEmpty()
    .withMessage("Full name is required")
    .isLength({ min: 3, max: 50 })
    .withMessage("Full name must be between 3 and 50 characters"),
  
  body("department")
    .notEmpty()
    .withMessage("Department is required"),
  
  body("designation")
    .notEmpty()
    .withMessage("Designation is required"),
  
  body("permissions")
    .isArray()
    .withMessage("Permissions must be an array")
    .custom((value) => {
      const validPermissions = [
        'manage_users', 'manage_doctors', 'manage_appointments',
        'manage_payments', 'view_reports', 'manage_settings',
        'manage_roles', 'view_logs'
      ];
      
      for (const perm of value) {
        if (!validPermissions.includes(perm)) {
          throw new Error(`Invalid permission: ${perm}`);
        }
      }
      return true;
    }),
];