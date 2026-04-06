import { PrescriptionService } from "./prescription.service.js";
import { Patient } from "../patient/patient.model.js";
import { Doctor } from "../doctor/doctor.model.js";
import { ApiError } from "../../utils/apiError.js";

export class PrescriptionController {
  
  // ==================== Create & Manage ====================

  /**
   * Create new prescription (Doctor only)
   */
  static async createPrescription(req, res, next) {
    try {
      const doctor = await Doctor.findOne({ user: req.user._id });
      if (!doctor) {
        throw new ApiError(404, "Doctor profile not found");
      }

      const result = await PrescriptionService.createPrescription(doctor._id, req.body);
      
      res.status(201).json({
        success: true,
        message: "Prescription created successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update prescription (Doctor only)
   */
  static async updatePrescription(req, res, next) {
    try {
      const { prescriptionId } = req.params;
      const doctor = await Doctor.findOne({ user: req.user._id });
      
      if (!doctor) {
        throw new ApiError(404, "Doctor profile not found");
      }

      const result = await PrescriptionService.updatePrescription(
        doctor._id,
        prescriptionId,
        req.body
      );
      
      res.json({
        success: true,
        message: "Prescription updated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add medicine to prescription (Doctor only)
   */
  static async addMedicine(req, res, next) {
    try {
      const { prescriptionId } = req.params;
      const doctor = await Doctor.findOne({ user: req.user._id });
      
      if (!doctor) {
        throw new ApiError(404, "Doctor profile not found");
      }

      const result = await PrescriptionService.addMedicine(
        doctor._id,
        prescriptionId,
        req.body
      );
      
      res.status(201).json({
        success: true,
        message: "Medicine added successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update medicine (Doctor only)
   */
  static async updateMedicine(req, res, next) {
    try {
      const { prescriptionId, medicineId } = req.params;
      const doctor = await Doctor.findOne({ user: req.user._id });
      
      if (!doctor) {
        throw new ApiError(404, "Doctor profile not found");
      }

      const result = await PrescriptionService.updateMedicine(
        doctor._id,
        prescriptionId,
        medicineId,
        req.body
      );
      
      res.json({
        success: true,
        message: "Medicine updated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove medicine (Doctor only)
   */
  static async removeMedicine(req, res, next) {
    try {
      const { prescriptionId, medicineId } = req.params;
      const doctor = await Doctor.findOne({ user: req.user._id });
      
      if (!doctor) {
        throw new ApiError(404, "Doctor profile not found");
      }

      const result = await PrescriptionService.removeMedicine(
        doctor._id,
        prescriptionId,
        medicineId
      );
      
      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add test to prescription (Doctor only)
   */
  static async addTest(req, res, next) {
    try {
      const { prescriptionId } = req.params;
      const doctor = await Doctor.findOne({ user: req.user._id });
      
      if (!doctor) {
        throw new ApiError(404, "Doctor profile not found");
      }

      const result = await PrescriptionService.addTest(
        doctor._id,
        prescriptionId,
        req.body
      );
      
      res.status(201).json({
        success: true,
        message: "Test added successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update test (Doctor only)
   */
  static async updateTest(req, res, next) {
    try {
      const { prescriptionId, testId } = req.params;
      const doctor = await Doctor.findOne({ user: req.user._id });
      
      if (!doctor) {
        throw new ApiError(404, "Doctor profile not found");
      }

      const result = await PrescriptionService.updateTest(
        doctor._id,
        prescriptionId,
        testId,
        req.body
      );
      
      res.json({
        success: true,
        message: "Test updated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove test (Doctor only)
   */
  static async removeTest(req, res, next) {
    try {
      const { prescriptionId, testId } = req.params;
      const doctor = await Doctor.findOne({ user: req.user._id });
      
      if (!doctor) {
        throw new ApiError(404, "Doctor profile not found");
      }

      const result = await PrescriptionService.removeTest(
        doctor._id,
        prescriptionId,
        testId
      );
      
      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark test as completed (Patient only)
   */
  static async markTestCompleted(req, res, next) {
    try {
      const { prescriptionId, testId } = req.params;
      const patient = await Patient.findOne({ user: req.user._id });
      
      if (!patient) {
        throw new ApiError(404, "Patient profile not found");
      }

      const result = await PrescriptionService.markTestCompleted(
        patient._id,
        prescriptionId,
        testId
      );
      
      res.json({
        success: true,
        message: "Test marked as completed",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Query Methods ====================

  /**
   * Get prescription by ID
   */
  static async getPrescriptionById(req, res, next) {
    try {
      const { prescriptionId } = req.params;
      
      const result = await PrescriptionService.getPrescriptionById(
        req.user._id,
        req.user.role,
        prescriptionId
      );
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get my prescriptions (Patient)
   */
  static async getMyPrescriptions(req, res, next) {
    try {
      const patient = await Patient.findOne({ user: req.user._id });
      if (!patient) {
        throw new ApiError(404, "Patient profile not found");
      }

      const result = await PrescriptionService.getPatientPrescriptions(
        patient._id,
        req.query
      );
      
      res.json({
        success: true,
        data: result.prescriptions,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get doctor's prescriptions (Doctor)
   */
  static async getDoctorPrescriptions(req, res, next) {
    try {
      const doctor = await Doctor.findOne({ user: req.user._id });
      if (!doctor) {
        throw new ApiError(404, "Doctor profile not found");
      }

      const result = await PrescriptionService.getDoctorPrescriptions(
        doctor._id,
        req.query
      );
      
      res.json({
        success: true,
        data: result.prescriptions,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get prescription by appointment
   */
  static async getPrescriptionByAppointment(req, res, next) {
    try {
      const { appointmentId } = req.params;
      
      const result = await PrescriptionService.getPrescriptionByAppointment(
        req.user._id,
        req.user.role,
        appointmentId
      );
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search prescriptions (Doctor)
   */
  static async searchPrescriptions(req, res, next) {
    try {
      const { q } = req.query;
      if (!q) {
        return res.json({ success: true, data: [] });
      }

      const doctor = await Doctor.findOne({ user: req.user._id });
      if (!doctor) {
        throw new ApiError(404, "Doctor profile not found");
      }

      const result = await PrescriptionService.searchPrescriptions(doctor._id, q);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Digital Features ====================

  /**
   * Generate PDF version
   */
  static async generatePDF(req, res, next) {
    try {
      const { prescriptionId } = req.params;
      
      const result = await PrescriptionService.generatePDF(prescriptionId);
      
      res.json({
        success: true,
        data: {
          pdfUrl: result.pdfUrl,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add digital signature (Doctor only)
   */
  static async addDigitalSignature(req, res, next) {
    try {
      const { prescriptionId } = req.params;
      const doctor = await Doctor.findOne({ user: req.user._id });
      
      if (!doctor) {
        throw new ApiError(404, "Doctor profile not found");
      }

      const result = await PrescriptionService.addDigitalSignature(
        doctor._id,
        prescriptionId,
        req.body
      );
      
      res.json({
        success: true,
        message: "Digital signature added successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send prescription via email/SMS
   */
  static async sendPrescription(req, res, next) {
    try {
      const { prescriptionId } = req.params;
      const { method } = req.body; // "email", "sms", or ["email","sms"]
      
      const result = await PrescriptionService.sendPrescription(prescriptionId, method);
      
      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Download PDF
   */
  static async downloadPDF(req, res, next) {
    try {
      const { prescriptionId } = req.params;
      
      const result = await PrescriptionService.generatePDF(prescriptionId);
      
      // Redirect to PDF URL
      res.redirect(result.pdfUrl);
    } catch (error) {
      next(error);
    }
  }

  // ==================== Statistics ====================

  /**
   * Get prescription statistics (Doctor)
   */
  static async getStatistics(req, res, next) {
    try {
      const doctor = await Doctor.findOne({ user: req.user._id });
      if (!doctor) {
        throw new ApiError(404, "Doctor profile not found");
      }

      const result = await PrescriptionService.getStatistics(doctor._id);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}