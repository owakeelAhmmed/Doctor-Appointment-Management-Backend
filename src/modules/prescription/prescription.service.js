import { Prescription } from "./prescription.model.js";
import { Appointment } from "../appointment/appointment.model.js";
import { Patient } from "../patient/patient.model.js";
import { Doctor } from "../doctor/doctor.model.js";
import { User } from "../auth/auth.model.js";
import { sendEmail } from "../../services/email.service.js";
import { sendSMS } from "../../services/sms.service.js";
import { generatePrescriptionPDF } from "./prescription.utils.js";
import { ApiError } from "../../utils/apiError.js";
import mongoose from "mongoose";
import { uploadMedia } from "../upload/media.service.js";

export class PrescriptionService {
  
  // ==================== Create & Manage ====================

  /**
   * Create new prescription
   */
  static async createPrescription(doctorId, prescriptionData) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { appointmentId, ...restData } = prescriptionData;

      // Check if appointment exists and belongs to this doctor
      const appointment = await Appointment.findOne({
        _id: appointmentId,
        doctor: doctorId,
      }).populate("patient").populate("doctor");

      if (!appointment) {
        throw new ApiError(404, "Appointment not found");
      }

      // Check if prescription already exists for this appointment
      const existingPrescription = await Prescription.findOne({ appointment: appointmentId });
      if (existingPrescription) {
        throw new ApiError(400, "Prescription already exists for this appointment");
      }

      // Create prescription
      const prescription = await Prescription.create([{
        appointment: appointmentId,
        patient: appointment.patient._id,
        doctor: doctorId,
        ...restData,
      }], { session });

      // Update appointment with prescription reference
      appointment.prescription = prescription[0]._id;
      if (appointment.status === "confirmed") {
        appointment.status = "completed";
      }
      await appointment.save({ session });

      await session.commitTransaction();

      // Send notifications
      await this.sendPrescriptionNotifications(prescription[0], appointment);

      return prescription[0];
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Update prescription
   */
  static async updatePrescription(doctorId, prescriptionId, updateData) {
    const prescription = await Prescription.findOne({
      _id: prescriptionId,
      doctor: doctorId,
    });

    if (!prescription) {
      throw new ApiError(404, "Prescription not found");
    }

    // Update fields
    if (updateData.diagnosis) prescription.diagnosis = updateData.diagnosis;
    if (updateData.advice) prescription.advice = updateData.advice;
    if (updateData.followUpDate) prescription.followUpDate = updateData.followUpDate;
    if (updateData.notes) prescription.notes = updateData.notes;
    if (updateData.isActive !== undefined) prescription.isActive = updateData.isActive;

    await prescription.save();

    return prescription;
  }

  /**
   * Add medicine to prescription
   */
  static async addMedicine(doctorId, prescriptionId, medicineData) {
    const prescription = await Prescription.findOne({
      _id: prescriptionId,
      doctor: doctorId,
    });

    if (!prescription) {
      throw new ApiError(404, "Prescription not found");
    }

    prescription.medicines.push(medicineData);
    await prescription.save();

    return prescription.medicines[prescription.medicines.length - 1];
  }

  /**
   * Update medicine
   */
  static async updateMedicine(doctorId, prescriptionId, medicineId, updateData) {
    const prescription = await Prescription.findOne({
      _id: prescriptionId,
      doctor: doctorId,
    });

    if (!prescription) {
      throw new ApiError(404, "Prescription not found");
    }

    const medicine = prescription.medicines.id(medicineId);
    if (!medicine) {
      throw new ApiError(404, "Medicine not found");
    }

    // Update medicine fields
    Object.assign(medicine, updateData);
    await prescription.save();

    return medicine;
  }

  /**
   * Remove medicine
   */
  static async removeMedicine(doctorId, prescriptionId, medicineId) {
    const prescription = await Prescription.findOne({
      _id: prescriptionId,
      doctor: doctorId,
    });

    if (!prescription) {
      throw new ApiError(404, "Prescription not found");
    }

    prescription.medicines = prescription.medicines.filter(
      m => m._id.toString() !== medicineId
    );
    await prescription.save();

    return { message: "Medicine removed successfully" };
  }

  /**
   * Add test to prescription
   */
  static async addTest(doctorId, prescriptionId, testData) {
    const prescription = await Prescription.findOne({
      _id: prescriptionId,
      doctor: doctorId,
    });

    if (!prescription) {
      throw new ApiError(404, "Prescription not found");
    }

    prescription.tests.push(testData);
    await prescription.save();

    return prescription.tests[prescription.tests.length - 1];
  }

  /**
   * Update test
   */
  static async updateTest(doctorId, prescriptionId, testId, updateData) {
    const prescription = await Prescription.findOne({
      _id: prescriptionId,
      doctor: doctorId,
    });

    if (!prescription) {
      throw new ApiError(404, "Prescription not found");
    }

    const test = prescription.tests.id(testId);
    if (!test) {
      throw new ApiError(404, "Test not found");
    }

    Object.assign(test, updateData);
    await prescription.save();

    return test;
  }

  /**
   * Remove test
   */
  static async removeTest(doctorId, prescriptionId, testId) {
    const prescription = await Prescription.findOne({
      _id: prescriptionId,
      doctor: doctorId,
    });

    if (!prescription) {
      throw new ApiError(404, "Prescription not found");
    }

    prescription.tests = prescription.tests.filter(
      t => t._id.toString() !== testId
    );
    await prescription.save();

    return { message: "Test removed successfully" };
  }

  /**
   * Mark test as completed
   */
  static async markTestCompleted(patientId, prescriptionId, testId) {
    const prescription = await Prescription.findOne({
      _id: prescriptionId,
      patient: patientId,
    });

    if (!prescription) {
      throw new ApiError(404, "Prescription not found");
    }

    const test = prescription.tests.id(testId);
    if (!test) {
      throw new ApiError(404, "Test not found");
    }

    test.isCompleted = true;
    await prescription.save();

    return test;
  }

  // ==================== Query Methods ====================

  /**
   * Get prescription by ID
   */
  static async getPrescriptionById(userId, role, prescriptionId) {
    let query = { _id: prescriptionId };

    // Add role-based filtering
    if (role === "patient") {
      const patient = await Patient.findOne({ user: userId });
      if (!patient) throw new ApiError(404, "Patient not found");
      query.patient = patient._id;
    } else if (role === "doctor") {
      const doctor = await Doctor.findOne({ user: userId });
      if (!doctor) throw new ApiError(404, "Doctor not found");
      query.doctor = doctor._id;
    }

    const prescription = await Prescription.findOne(query)
      .populate({
        path: "patient",
        populate: {
          path: "user",
          select: "fullName email phone dateOfBirth bloodGroup",
        },
      })
      .populate({
        path: "doctor",
        populate: {
          path: "user",
          select: "fullName specialization",
        },
      })
      .populate({
        path: "appointment",
        select: "appointmentDate startTime type symptoms",
      });

    if (!prescription) {
      throw new ApiError(404, "Prescription not found");
    }

    return prescription;
  }

  /**
   * Get prescriptions for a patient
   */
  static async getPatientPrescriptions(patientId, filters) {
    const { status, fromDate, toDate, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const query = { patient: patientId };

    if (status === "active") {
      query.isActive = true;
    }

    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) query.createdAt.$lte = new Date(toDate);
    }

    const prescriptions = await Prescription.find(query)
      .populate({
        path: "doctor",
        populate: {
          path: "user",
          select: "fullName specialization",
        },
      })
      .populate("appointment", "appointmentDate type")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Prescription.countDocuments(query);

    return {
      prescriptions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get prescriptions for a doctor
   */
  static async getDoctorPrescriptions(doctorId, filters) {
    const { fromDate, toDate, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const query = { doctor: doctorId };

    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) query.createdAt.$lte = new Date(toDate);
    }

    const prescriptions = await Prescription.find(query)
      .populate({
        path: "patient",
        populate: {
          path: "user",
          select: "fullName phone",
        },
      })
      .populate("appointment", "appointmentDate")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Prescription.countDocuments(query);

    return {
      prescriptions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get prescription by appointment
   */
  static async getPrescriptionByAppointment(userId, role, appointmentId) {
    let query = { appointment: appointmentId };

    // Add role-based filtering
    if (role === "patient") {
      const patient = await Patient.findOne({ user: userId });
      if (!patient) throw new ApiError(404, "Patient not found");
      query.patient = patient._id;
    } else if (role === "doctor") {
      const doctor = await Doctor.findOne({ user: userId });
      if (!doctor) throw new ApiError(404, "Doctor not found");
      query.doctor = doctor._id;
    }

    const prescription = await Prescription.findOne(query)
      .populate({
        path: "patient",
        populate: {
          path: "user",
          select: "fullName",
        },
      })
      .populate({
        path: "doctor",
        populate: {
          path: "user",
          select: "fullName specialization",
        },
      });

    if (!prescription) {
      throw new ApiError(404, "Prescription not found for this appointment");
    }

    return prescription;
  }

  /**
   * Search prescriptions
   */
  static async searchPrescriptions(doctorId, searchTerm) {
    const prescriptions = await Prescription.find({ doctor: doctorId })
      .populate({
        path: "patient",
        populate: {
          path: "user",
          select: "fullName",
        },
      })
      .populate("appointment")
      .limit(20);

    // Filter by search term
    const filtered = prescriptions.filter(p => 
      p.patient?.user?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.diagnosis?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.medicines?.some(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return filtered;
  }

  // ==================== Digital Features ====================

  /**
   * Generate PDF version of prescription
   */
  static async generatePDF(prescriptionId) {
    const prescription = await Prescription.findById(prescriptionId)
      .populate({
        path: "patient",
        populate: {
          path: "user",
          select: "fullName age bloodGroup",
        },
      })
      .populate({
        path: "doctor",
        populate: {
          path: "user",
          select: "fullName specialization",
        },
      })
      .populate("appointment", "appointmentDate");

    if (!prescription) {
      throw new ApiError(404, "Prescription not found");
    }

    // Generate PDF
    const pdfBuffer = await generatePrescriptionPDF(prescription);

    // Upload to cloud storage
    const uploaded = await uploadMedia({
      buffer: pdfBuffer,
      originalFilename: `prescription_${prescriptionId}.pdf`,
      ownerType: "prescriptions",
      ownerId: prescriptionId,
      folder: "prescriptions",
      tags: ["prescription", "pdf"],
    });

    // Update prescription with PDF URL
    prescription.pdfUrl = uploaded.url;
    await prescription.save();

    return {
      pdfUrl: uploaded.url,
      prescription,
    };
  }

  /**
   * Add digital signature
   */
  static async addDigitalSignature(doctorId, prescriptionId, signatureData) {
    const prescription = await Prescription.findOne({
      _id: prescriptionId,
      doctor: doctorId,
    });

    if (!prescription) {
      throw new ApiError(404, "Prescription not found");
    }

    // Upload signature image
    const uploaded = await uploadMedia({
      buffer: Buffer.from(signatureData.signature, "base64"),
      originalFilename: `signature_${prescriptionId}.png`,
      ownerType: "prescriptions",
      ownerId: prescriptionId,
      folder: "signatures",
      tags: ["signature"],
    });

    prescription.digitalSignature = {
      url: uploaded.url,
      public_id: uploaded.public_id,
    };
    await prescription.save();

    return prescription.digitalSignature;
  }

  /**
   * Send prescription via email/SMS
   */
  static async sendPrescription(prescriptionId, sendMethod) {
    const prescription = await Prescription.findById(prescriptionId)
      .populate({
        path: "patient",
        populate: {
          path: "user",
          select: "fullName email phone",
        },
      })
      .populate({
        path: "doctor",
        populate: {
          path: "user",
          select: "fullName",
        },
      });

    if (!prescription) {
      throw new ApiError(404, "Prescription not found");
    }

    const patientUser = prescription.patient.user;

    if (sendMethod.includes("email") && patientUser.email) {
      await sendEmail({
        to: patientUser.email,
        subject: "Your Prescription",
        template: "prescription-email",
        data: {
          patientName: patientUser.fullName,
          doctorName: prescription.doctor.user.fullName,
          date: new Date().toLocaleDateString("bn-BD"),
          prescriptionId: prescription._id,
          pdfUrl: prescription.pdfUrl,
        },
      });
    }

    if (sendMethod.includes("sms") && patientUser.phone) {
      await sendSMS({
        to: patientUser.phone,
        message: `Your prescription is ready. View online: ${process.env.CLIENT_URL}/prescriptions/${prescriptionId}`,
      });
    }

    return { message: "Prescription sent successfully" };
  }

  // ==================== Notifications ====================

  /**
   * Send prescription notifications
   */
  static async sendPrescriptionNotifications(prescription, appointment) {
    const patientUser = await User.findById(appointment.patient.user);
    const doctorUser = await User.findById(appointment.doctor.user);

    // Email to patient
    await sendEmail({
      to: patientUser.email,
      subject: "Your Prescription is Ready",
      template: "prescription-ready",
      data: {
        patientName: patientUser.fullName,
        doctorName: doctorUser.fullName,
        date: new Date(appointment.appointmentDate).toLocaleDateString("bn-BD"),
        prescriptionId: prescription._id,
      },
    });

    // SMS to patient
    await sendSMS({
      to: patientUser.phone,
      message: `Your prescription from Dr. ${doctorUser.fullName} is ready. View: ${process.env.CLIENT_URL}/prescriptions/${prescription._id}`,
    });
  }

  // ==================== Statistics ====================

  /**
   * Get prescription statistics
   */
  static async getStatistics(doctorId) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      total,
      thisMonth,
      thisYear,
      byMedicine,
      commonDiagnosis,
    ] = await Promise.all([
      Prescription.countDocuments({ doctor: doctorId }),
      Prescription.countDocuments({ 
        doctor: doctorId,
        createdAt: { $gte: startOfMonth },
      }),
      Prescription.countDocuments({ 
        doctor: doctorId,
        createdAt: { $gte: startOfYear },
      }),
      Prescription.aggregate([
        { $match: { doctor: doctorId } },
        { $unwind: "$medicines" },
        { $group: { _id: "$medicines.name", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Prescription.aggregate([
        { $match: { doctor: doctorId } },
        { $group: { _id: "$diagnosis", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    return {
      total,
      thisMonth,
      thisYear,
      topMedicines: byMedicine,
      commonDiagnosis,
    };
  }
}