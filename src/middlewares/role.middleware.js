import { Doctor } from "../modules/doctor/doctor.model.js";

export const doctorVerified = async (req, res, next) => {
  try {
    if (req.user.role !== "doctor") {
      return next();
    }

    const doctor = await Doctor.findOne({ user: req.user._id });
    
    if (!doctor) {
      return res.status(403).json({
        success: false,
        message: "Doctor profile not found",
      });
    }

    if (doctor.verificationStatus !== "verified") {
      return res.status(403).json({
        success: false,
        message: `Doctor account is ${doctor.verificationStatus}. Please complete verification`,
        data: {
          verificationStatus: doctor.verificationStatus,
        },
      });
    }

    req.doctor = doctor;
    next();
  } catch (error) {
    next(error);
  }
};

export const checkRoleAccess = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${allowedRoles.join(", ")}`,
      });
    }

    next();
  };
};