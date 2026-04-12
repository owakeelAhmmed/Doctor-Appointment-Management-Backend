import { Doctor } from "./doctor.model.js";

export const requireDoctorVerified = async (req, res, next) => {
  try {
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
        message: `Your account is ${doctor.verificationStatus}. Please complete verification to access this feature.`,
        verificationStatus: doctor.verificationStatus,
        redirectTo: getRedirectPath(doctor.verificationStatus),
      });
    }

    req.doctor = doctor;
    next();
  } catch (error) {
    next(error);
  }
};


/**
 * Sync doctor verification status to user model
 */
export const syncDoctorVerificationToUser = async (req, res, next) => {
  try {
    const doctor = await Doctor.findOne({ user: req.user._id });
    
    if (doctor && doctor.verificationStatus !== req.user.verificationStatus) {
      await User.findByIdAndUpdate(req.user._id, {
        verificationStatus: doctor.verificationStatus,
        verifiedBy: doctor.verifiedBy,
        verifiedAt: doctor.verifiedAt,
        verificationNotes: doctor.verificationNotes,
      });
    }
    
    next();
  } catch (error) {
    console.error("Sync error:", error);
    next();
  }
};

function getRedirectPath(status) {
  const paths = {
    pending: "/doctor/complete-profile",
    profile_submitted: "/doctor/documents",
    document_verification: "/doctor/dashboard",
    under_review: "/doctor/dashboard",
    rejected: "/doctor/rejected",
    suspended: "/doctor/suspended",
  };
  return paths[status] || "/doctor/dashboard";
}