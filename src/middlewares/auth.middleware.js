import jwt from "jsonwebtoken";
import { User } from "../modules/auth/auth.model.js";
import { JWT_SECRET } from "../config/env.js";
import { Doctor } from "../modules/doctor/doctor.model.js";

export const protect = async (req, res, next) => {
  try {
    let token;

    // Check authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to access this route",
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);

      // Get user from token
      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User not found",
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: "Account is deactivated",
        });
      }

      // Add user to request
      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to access this route",
      });
    }
  } catch (error) {
    next(error);
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role ${req.user.role} is not authorized to access this route`,
      });
    }
    next();
  };
};

export const hasPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized",
      });
    }

    // Superadmin has all permissions
    if (req.user.role === "superadmin") {
      return next();
    }

    // Check if user has the required permission
    if (!req.user.adminPermissions?.includes(permission)) {
      return res.status(403).json({
        success: false,
        message: `You don't have permission: ${permission}`,
      });
    }

    next();
  };
};

export const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id).select("-password");
        req.user = user;
      } catch (error) {
        // Token invalid, but we don't throw error for optional auth
      }
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const requireDoctorVerified = async (req, res, next) => {
  try {
    const doctor = await Doctor.findOne({ user: req.user._id });

    if (!doctor) {
      return res.status(403).json({
        success: false,
        message: "Doctor profile not found"
      });
    }

    if (doctor.verificationStatus !== 'verified') {
      const allowedPaths = [
        '/doctor/profile',
        '/doctor/complete-profile',
        '/doctor/documents',
        '/doctor/verification-status'
      ];

      const isAllowedPath = allowedPaths.some(path => req.path.startsWith(path));

      if (!isAllowedPath) {
        return res.status(403).json({
          success: false,
          message: "Your account is pending verification. Please complete your profile and wait for admin approval.",
          verificationStatus: doctor.verificationStatus
        });
      }
    }

    req.doctor = doctor;
    next();
  } catch (error) {
    next(error);
  }
};