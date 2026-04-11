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