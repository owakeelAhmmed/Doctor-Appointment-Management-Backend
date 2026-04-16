import { Payment } from "./payment.model.js";
import { Appointment } from "../appointment/appointment.model.js";
import { Patient } from "../patient/patient.model.js";
import { Doctor } from "../doctor/doctor.model.js";
import { User } from "../auth/auth.model.js";
import { sendEmail } from "../../services/email.service.js";
import { sendSMS } from "../../services/sms.service.js";
import { ApiError } from "../../utils/apiError.js";
import {
  //   processBKashPayment,
  //   processNagadPayment,
  processCardPayment,
  verifyBKashTransaction,
  verifyNagadTransaction,
} from "./payment.utils.js";
import mongoose from "mongoose";
import crypto from "crypto";

export class PaymentService {

  // ==================== Payment Initiation ====================

  /**
   * Initiate payment for appointment
   */
  static async initiatePayment(patientId, paymentData) {
    const { appointmentId, paymentMethod } = paymentData;

    // Get appointment
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      patient: patientId,
    }).populate("doctor");

    if (!appointment) {
      throw new ApiError(404, "Appointment not found");
    }

    // Check if payment already exists
    const existingPayment = await Payment.findOne({ appointment: appointmentId });
    if (existingPayment) {
      throw new ApiError(400, "Payment already initiated for this appointment");
    }

    // Calculate fees
    const platformFee = Math.round(appointment.fee * (appointment.doctor.commissionRate / 100));
    const doctorAmount = appointment.fee - platformFee;

    // Create payment record
    const payment = await Payment.create({
      appointment: appointmentId,
      patient: patientId,
      doctor: appointment.doctor._id,
      amount: appointment.fee,
      platformFee,
      doctorAmount,
      paymentMethod,
      status: "pending",
      transactionId: this.generateTransactionId(),
    });

    // Generate payment instructions based on method
    const paymentInstructions = await this.getPaymentInstructions(paymentMethod, payment);

    return {
      payment,
      instructions: paymentInstructions,
    };
  }

  /**
   * Generate unique transaction ID
   */
  static generateTransactionId() {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString("hex").toUpperCase();
    return `TXN${timestamp}${random}`;
  }

  /**
   * Get payment instructions based on method
   */
  static async getPaymentInstructions(method, payment) {
    const instructions = {
      bKash: {
        merchantNumber: process.env.BKASH_MERCHANT_NUMBER,
        amount: payment.amount,
        reference: payment.transactionId,
        instructions: [
          "Go to your bKash app",
          "Select 'Send Money'",
          `Enter merchant number: ${process.env.BKASH_MERCHANT_NUMBER}`,
          `Enter amount: ${payment.amount} BDT`,
          `Reference: ${payment.transactionId}`,
          "Enter your PIN to confirm",
        ],
      },
      Nagad: {
        merchantNumber: process.env.NAGAD_MERCHANT_NUMBER,
        amount: payment.amount,
        reference: payment.transactionId,
        instructions: [
          "Dial *167#",
          "Select 'Send Money'",
          `Enter merchant number: ${process.env.NAGAD_MERCHANT_NUMBER}`,
          `Enter amount: ${payment.amount} BDT`,
          `Reference: ${payment.transactionId}`,
          "Enter your PIN to confirm",
        ],
      },
      card: {
        amount: payment.amount,
        redirectUrl: `${process.env.API_URL}/api/v1/payments/card/process/${payment._id}`,
        instructions: [
          "You will be redirected to secure payment gateway",
          "Enter your card details",
          "Complete 3D secure verification",
          "Payment will be processed instantly",
        ],
      },
      cash: {
        amount: payment.amount,
        instructions: [
          "Pay cash at the clinic/hospital",
          "Show this payment ID to the reception",
          "Payment will be marked as completed after verification",
        ],
      },
    };

    return instructions[method];
  }

  // ==================== Payment Processing ====================

  /**
   * Process bKash payment
   */
  static async processBKashPayment(patientId, paymentData) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { appointmentId, bkashNumber, transactionId } = paymentData;

      // Verify bKash transaction
      const verification = await verifyBKashTransaction(transactionId, appointmentId);

      if (!verification.valid) {
        throw new ApiError(400, verification.message);
      }

      // Get payment
      const payment = await Payment.findOne({ appointment: appointmentId }).session(session);
      if (!payment) {
        throw new ApiError(404, "Payment not found");
      }

      // Update payment
      payment.status = "completed";
      payment.paymentDate = new Date();
      payment.paymentDetails = {
        bkashNumber,
        transactionId,
        verifiedAt: new Date(),
      };
      await payment.save({ session });

      // Confirm appointment
      await this.confirmAppointmentAfterPayment(appointmentId, payment._id, session);

      await session.commitTransaction();

      // Send notifications
      await this.sendPaymentConfirmation(payment);

      return payment;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Process Nagad payment
   */
  static async processNagadPayment(patientId, paymentData) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { appointmentId, nagadNumber, transactionId } = paymentData;

      // Verify Nagad transaction
      const verification = await verifyNagadTransaction(transactionId, appointmentId);

      if (!verification.valid) {
        throw new ApiError(400, verification.message);
      }

      // Get payment
      const payment = await Payment.findOne({ appointment: appointmentId }).session(session);
      if (!payment) {
        throw new ApiError(404, "Payment not found");
      }

      // Update payment
      payment.status = "completed";
      payment.paymentDate = new Date();
      payment.paymentDetails = {
        nagadNumber,
        transactionId,
        verifiedAt: new Date(),
      };
      await payment.save({ session });

      // Confirm appointment
      await this.confirmAppointmentAfterPayment(appointmentId, payment._id, session);

      await session.commitTransaction();

      // Send notifications
      await this.sendPaymentConfirmation(payment);

      return payment;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Process card payment
   */
  static async processCardPayment(paymentData) {
    const { paymentId, cardDetails } = paymentData;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Process card payment through payment gateway
      const paymentResult = await processCardPayment({
        amount: paymentData.amount,
        cardDetails,
        transactionId: paymentData.transactionId,
      });

      if (!paymentResult.success) {
        throw new ApiError(400, paymentResult.message);
      }

      // Get payment
      const payment = await Payment.findById(paymentId).session(session);
      if (!payment) {
        throw new ApiError(404, "Payment not found");
      }

      // Update payment
      payment.status = "completed";
      payment.paymentDate = new Date();
      payment.paymentDetails = {
        cardLast4: cardDetails.cardNumber.slice(-4),
        transactionId: paymentResult.transactionId,
        authCode: paymentResult.authCode,
      };
      await payment.save({ session });

      // Confirm appointment
      await this.confirmAppointmentAfterPayment(payment.appointment, payment._id, session);

      await session.commitTransaction();

      // Send notifications
      await this.sendPaymentConfirmation(payment);

      return payment;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Process cash payment (marked by admin/reception)
   */
  static async processCashPayment(appointmentId, verifiedBy) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const payment = await Payment.findOne({ appointment: appointmentId }).session(session);

      if (!payment) {
        throw new ApiError(404, "Payment not found");
      }

      payment.status = "completed";
      payment.paymentDate = new Date();
      payment.paymentDetails = {
        verifiedBy,
        verifiedAt: new Date(),
        note: "Cash payment verified at clinic",
      };
      await payment.save({ session });

      // Confirm appointment
      await this.confirmAppointmentAfterPayment(appointmentId, payment._id, session);

      await session.commitTransaction();

      return payment;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

/**
 * Confirm appointment after successful payment
 */
  static async confirmAppointmentAfterPayment(appointmentId, paymentId, session) {
    try {
      console.log('Confirming appointment:', appointmentId);
      console.log('With payment:', paymentId);
      
      // 🔥 FIX: Find appointment by ID
      const appointment = await Appointment.findById(appointmentId).session(session);
      
      if (!appointment) {
        console.error('Appointment not found:', appointmentId);
        throw new ApiError(404, `Appointment not found with ID: ${appointmentId}`);
      }
      
      console.log('Appointment found, current status:', appointment.status);
      
      appointment.status = "confirmed";
      appointment.payment = paymentId;
      await appointment.save({ session });
      console.log('Appointment status updated to confirmed');
      
      // Update doctor's total earnings
      const payment = await Payment.findById(paymentId).session(session);
      if (payment && payment.doctor) {
        await Doctor.findByIdAndUpdate(
          payment.doctor,
          { $inc: { totalEarnings: payment.doctorAmount } },
          { session }
        );
        console.log('Doctor earnings updated');
      }
      
      return appointment;
    } catch (error) {
      console.error('Error in confirmAppointmentAfterPayment:', error);
      throw error;
    }
  }

    /**
     * Handle SSLCommerz success callback - ONLY ONE VERSION
     */
    static async handleSSLCommerzSuccess(transactionId, amount, bankTransactionId) {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        console.log("=== Looking for payment ===");
        console.log("Received transactionId:", transactionId);

        let payment = null;

        // 1. Try exact match by transactionId
        payment = await Payment.findOne({ transactionId }).session(session);
        console.log('Search by transactionId:', payment ? 'Found' : 'Not found');

        // 2. Try by appointment (find recent pending payment)
        if (!payment) {
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          const recentPayments = await Payment.find({
            status: "pending",
            createdAt: { $gte: fiveMinutesAgo }
          }).session(session);

          console.log("Recent pending payments found:", recentPayments.length);

          if (recentPayments.length === 1) {
            payment = recentPayments[0];
            console.log("Using single recent payment:", payment._id);
          } else if (recentPayments.length > 1) {
            payment = recentPayments.find(p => Math.abs(p.amount - parseFloat(amount)) < 1);
            console.log("Found by amount match:", payment?._id);
          }
        }

        if (!payment) {
          const allPending = await Payment.find({ status: "pending" }).session(session);
          console.log("All pending payments:", allPending.map(p => ({
            id: p._id,
            transactionId: p.transactionId,
            amount: p.amount,
            appointment: p.appointment
          })));

          throw new ApiError(404, `Payment not found for transactionId: ${transactionId}`);
        }

        console.log("Found payment:", {
          id: payment._id,
          transactionId: payment.transactionId,
          amount: payment.amount,
          status: payment.status,
          appointment: payment.appointment
        });

        if (payment.status === "completed") {
          await session.commitTransaction();
          return payment;
        }

        // Update payment
        payment.status = "completed";
        payment.paymentDate = new Date();
        payment.paymentDetails = {
          ...payment.paymentDetails,
          bankTransactionId: bankTransactionId,
          sslTransactionId: transactionId,
          validatedAt: new Date(),
        };
        await payment.save({ session });
        console.log('Payment updated to completed');

        // Confirm appointment
        await this.confirmAppointmentAfterPayment(payment.appointment, payment._id, session);
        console.log('Appointment confirmed');

        await session.commitTransaction();
        console.log('Transaction committed successfully');

        // Send notifications (don't await)
        this.sendPaymentConfirmation(payment).catch(err => 
          console.error('Failed to send payment confirmation:', err)
        );

        return payment;
        
      } catch (error) {
        // Only abort if transaction is still active
        if (session.inTransaction()) {
          await session.abortTransaction();
          console.error('Transaction aborted due to error');
        }
        console.error('SSLCommerz success error:', error);
        throw error;
      } finally {
        await session.endSession();
      }
    }

  /**
   * Mark payment as failed
   */
  static async markAsFailed(paymentId, reason) {
    const payment = await Payment.findById(paymentId);

    if (!payment) {
      throw new ApiError(404, "Payment not found");
    }

    payment.status = "failed";
    payment.paymentDetails = {
      ...payment.paymentDetails,
      failureReason: reason,
      failedAt: new Date(),
    };
    await payment.save();

    return payment;
  }

  // ==================== Refund Management ====================

  /**
   * Process refund
   */
  static async processRefund(paymentId, refundData, initiatedBy) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { amount, reason } = refundData;

      const payment = await Payment.findById(paymentId).session(session);

      if (!payment) {
        throw new ApiError(404, "Payment not found");
      }

      if (payment.status !== "completed") {
        throw new ApiError(400, "Only completed payments can be refunded");
      }

      if (payment.refundAmount > 0) {
        throw new ApiError(400, "Payment already refunded");
      }

      const refundAmount = amount || payment.amount;

      // Process refund based on payment method
      const refundResult = await this.processRefundByMethod(payment, refundAmount);

      // Update payment
      payment.status = "refunded";
      payment.refundAmount = refundAmount;
      payment.refundedAt = new Date();
      payment.paymentDetails = {
        ...payment.paymentDetails,
        refundReason: reason,
        refundTransactionId: refundResult.transactionId,
        refundedBy: initiatedBy,
      };
      await payment.save({ session });

      // Update appointment status
      const appointment = await Appointment.findById(payment.appointment).session(session);
      appointment.status = "cancelled";
      appointment.cancellationReason = `Payment refunded: ${reason}`;
      await appointment.save({ session });

      // Update doctor's earnings
      await Doctor.findByIdAndUpdate(
        payment.doctor,
        { $inc: { totalEarnings: -payment.doctorAmount } },
        { session }
      );

      await session.commitTransaction();

      // Send refund notification
      await this.sendRefundNotification(payment, refundAmount, reason);

      return payment;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Process refund by payment method
   */
  static async processRefundByMethod(payment, amount) {
    // This would integrate with payment gateways
    // For now, return mock response
    return {
      success: true,
      transactionId: `REF${Date.now()}`,
    };
  }

  // ==================== Withdrawal Management ====================

  /**
   * Request withdrawal for doctor
   */
  static async requestWithdrawal(doctorId, withdrawalData) {
    const doctor = await Doctor.findById(doctorId);

    if (!doctor) {
      throw new ApiError(404, "Doctor not found");
    }

    const { amount, paymentMethod, accountDetails } = withdrawalData;

    // Check if doctor has sufficient balance
    const availableBalance = doctor.totalEarnings - doctor.pendingWithdrawal;

    if (amount > availableBalance) {
      throw new ApiError(400, "Insufficient balance");
    }

    // Create withdrawal request
    const withdrawalRequest = {
      doctor: doctorId,
      amount,
      paymentMethod,
      accountDetails,
      status: "pending",
      requestedAt: new Date(),
      transactionId: this.generateTransactionId(),
    };

    // Update doctor's pending withdrawal
    doctor.pendingWithdrawal += amount;
    await doctor.save();

    // TODO: Save to Withdrawal model
    // await Withdrawal.create(withdrawalRequest);

    // Notify admin
    await this.sendWithdrawalRequestNotification(doctor, withdrawalRequest);

    return withdrawalRequest;
  }

  /**
   * Process withdrawal (admin)
   */
  static async processWithdrawal(withdrawalId, processData) {
    // This would update withdrawal status
    // For now, update doctor's pending withdrawal
    const { doctorId, amount, status, transactionId } = processData;

    const doctor = await Doctor.findById(doctorId);

    if (!doctor) {
      throw new ApiError(404, "Doctor not found");
    }

    if (status === "approved" || status === "processed") {
      doctor.pendingWithdrawal -= amount;
      await doctor.save();
    }

    // Send notification to doctor
    await this.sendWithdrawalUpdateNotification(doctor, processData);

    return {
      withdrawalId,
      status,
      amount,
      transactionId,
      processedAt: new Date(),
    };
  }

  // ==================== Query Methods ====================

  /**
   * Get payment by ID
   */
  static async getPaymentById(paymentId, userId, role) {
    let query = { _id: paymentId };

    if (role === "patient") {
      const patient = await Patient.findOne({ user: userId });
      if (!patient) throw new ApiError(404, "Patient not found");
      query.patient = patient._id;
    } else if (role === "doctor") {
      const doctor = await Doctor.findOne({ user: userId });
      if (!doctor) throw new ApiError(404, "Doctor not found");
      query.doctor = doctor._id;
    }

    const payment = await Payment.findOne(query)
      .populate({
        path: "patient",
        populate: { path: "user", select: "fullName email phone" },
      })
      .populate({
        path: "doctor",
        populate: { path: "user", select: "fullName specialization" },
      })
      .populate("appointment", "appointmentDate startTime type");

    if (!payment) {
      throw new ApiError(404, "Payment not found");
    }

    return payment;
  }

  /**
   * Get payments for user
   */
  static async getUserPayments(userId, role, filters) {
    const { status, fromDate, toDate, paymentMethod, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    let query = {};

    if (role === "patient") {
      const patient = await Patient.findOne({ user: userId });
      if (!patient) throw new ApiError(404, "Patient not found");
      query.patient = patient._id;
    } else if (role === "doctor") {
      const doctor = await Doctor.findOne({ user: userId });
      if (!doctor) throw new ApiError(404, "Doctor not found");
      query.doctor = doctor._id;
    }

    if (status && status !== "all") {
      query.status = status;
    }

    if (paymentMethod && paymentMethod !== "all") {
      query.paymentMethod = paymentMethod;
    }

    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) query.createdAt.$lte = new Date(toDate);
    }

    const payments = await Payment.find(query)
      .populate({
        path: role === "patient" ? "doctor" : "patient",
        populate: { path: "user", select: "fullName" },
      })
      .populate("appointment", "appointmentDate")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Payment.countDocuments(query);

    // Calculate totals
    const totals = await Payment.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          totalPlatformFee: { $sum: "$platformFee" },
          totalDoctorAmount: { $sum: "$doctorAmount" },
          count: { $sum: 1 },
        },
      },
    ]);

    return {
      payments,
      summary: {
        totalAmount: totals[0]?.totalAmount || 0,
        totalPlatformFee: totals[0]?.totalPlatformFee || 0,
        totalDoctorAmount: totals[0]?.totalDoctorAmount || 0,
        count: totals[0]?.count || 0,
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get payment by appointment
   */
  static async getPaymentByAppointment(appointmentId, userId, role) {
    let query = { appointment: appointmentId };

    if (role === "patient") {
      const patient = await Patient.findOne({ user: userId });
      if (!patient) throw new ApiError(404, "Patient not found");
      query.patient = patient._id;
    } else if (role === "doctor") {
      const doctor = await Doctor.findOne({ user: userId });
      if (!doctor) throw new ApiError(404, "Doctor not found");
      query.doctor = doctor._id;
    }

    const payment = await Payment.findOne(query)
      .populate({
        path: "patient",
        populate: { path: "user", select: "fullName" },
      })
      .populate({
        path: "doctor",
        populate: { path: "user", select: "fullName" },
      });

    if (!payment) {
      throw new ApiError(404, "Payment not found for this appointment");
    }

    return payment;
  }

  /**
   * Get all payments (admin)
   */
  static async getAllPayments(filters) {
    const { status, fromDate, toDate, paymentMethod, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const query = {};

    if (status && status !== "all") {
      query.status = status;
    }

    if (paymentMethod && paymentMethod !== "all") {
      query.paymentMethod = paymentMethod;
    }

    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) query.createdAt.$lte = new Date(toDate);
    }

    const payments = await Payment.find(query)
      .populate({
        path: "patient",
        populate: { path: "user", select: "fullName" },
      })
      .populate({
        path: "doctor",
        populate: { path: "user", select: "fullName" },
      })
      .populate("appointment")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Payment.countDocuments(query);

    // Calculate totals
    const totals = await Payment.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          totalPlatformFee: { $sum: "$platformFee" },
          totalDoctorAmount: { $sum: "$doctorAmount" },
          totalRefunded: { $sum: "$refundAmount" },
          count: { $sum: 1 },
        },
      },
    ]);

    return {
      payments,
      summary: {
        totalAmount: totals[0]?.totalAmount || 0,
        totalPlatformFee: totals[0]?.totalPlatformFee || 0,
        totalDoctorAmount: totals[0]?.totalDoctorAmount || 0,
        totalRefunded: totals[0]?.totalRefunded || 0,
        netRevenue: (totals[0]?.totalAmount || 0) - (totals[0]?.totalRefunded || 0),
        count: totals[0]?.count || 0,
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // ==================== Statistics & Reports ====================

  /**
   * Get payment statistics
   */
  static async getStatistics(filters) {
    const { fromDate, toDate } = filters;

    const match = {};
    if (fromDate || toDate) {
      match.createdAt = {};
      if (fromDate) match.createdAt.$gte = new Date(fromDate);
      if (toDate) match.createdAt.$lte = new Date(toDate);
    }

    const [
      totalStats,
      byMethod,
      byStatus,
      dailyStats,
      topDoctors,
    ] = await Promise.all([
      Payment.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
            totalPlatformFee: { $sum: "$platformFee" },
            totalDoctorAmount: { $sum: "$doctorAmount" },
            totalRefunded: { $sum: "$refundAmount" },
            count: { $sum: 1 },
          },
        },
      ]),
      Payment.aggregate([
        { $match: { ...match, status: "completed" } },
        {
          $group: {
            _id: "$paymentMethod",
            amount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),
      Payment.aggregate([
        { $match },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            amount: { $sum: "$amount" },
          },
        },
      ]),
      Payment.aggregate([
        { $match: { ...match, status: "completed" } },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
              day: { $dayOfMonth: "$createdAt" },
            },
            amount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } },
        { $limit: 30 },
      ]),
      Payment.aggregate([
        { $match: { ...match, status: "completed" } },
        {
          $group: {
            _id: "$doctor",
            amount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { amount: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "doctors",
            localField: "_id",
            foreignField: "_id",
            as: "doctor",
          },
        },
        { $unwind: "$doctor" },
        {
          $lookup: {
            from: "users",
            localField: "doctor.user",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" },
        {
          $project: {
            doctorName: "$user.fullName",
            amount: 1,
            count: 1,
          },
        },
      ]),
    ]);

    return {
      summary: {
        totalAmount: totalStats[0]?.totalAmount || 0,
        totalPlatformFee: totalStats[0]?.totalPlatformFee || 0,
        totalDoctorAmount: totalStats[0]?.totalDoctorAmount || 0,
        totalRefunded: totalStats[0]?.totalRefunded || 0,
        netRevenue: (totalStats[0]?.totalAmount || 0) - (totalStats[0]?.totalRefunded || 0),
        totalTransactions: totalStats[0]?.count || 0,
      },
      byPaymentMethod: byMethod,
      byStatus,
      dailyStats: dailyStats.map(d => ({
        date: `${d._id.year}-${d._id.month}-${d._id.day}`,
        amount: d.amount,
        count: d.count,
      })),
      topDoctors,
    };
  }

  /**
   * Generate payment report
   */
  static async generateReport(filters) {
    const { fromDate, toDate, groupBy = "day", format = "json" } = filters;

    const payments = await Payment.find({
      createdAt: {
        $gte: fromDate ? new Date(fromDate) : new Date(0),
        $lte: toDate ? new Date(toDate) : new Date(),
      },
    })
      .populate({
        path: "patient",
        populate: { path: "user", select: "fullName" },
      })
      .populate({
        path: "doctor",
        populate: { path: "user", select: "fullName" },
      })
      .sort({ createdAt: 1 });

    // Group data
    let groupedData = [];

    if (groupBy === "day") {
      const grouped = {};
      payments.forEach(p => {
        const date = p.createdAt.toISOString().split("T")[0];
        if (!grouped[date]) {
          grouped[date] = {
            date,
            amount: 0,
            platformFee: 0,
            doctorAmount: 0,
            count: 0,
          };
        }
        grouped[date].amount += p.amount;
        grouped[date].platformFee += p.platformFee;
        grouped[date].doctorAmount += p.doctorAmount;
        grouped[date].count += 1;
      });
      groupedData = Object.values(grouped);
    } else if (groupBy === "month") {
      const grouped = {};
      payments.forEach(p => {
        const month = p.createdAt.toISOString().slice(0, 7);
        if (!grouped[month]) {
          grouped[month] = {
            month,
            amount: 0,
            platformFee: 0,
            doctorAmount: 0,
            count: 0,
          };
        }
        grouped[month].amount += p.amount;
        grouped[month].platformFee += p.platformFee;
        grouped[month].doctorAmount += p.doctorAmount;
        grouped[month].count += 1;
      });
      groupedData = Object.values(grouped);
    } else if (groupBy === "doctor") {
      const grouped = {};
      payments.forEach(p => {
        const doctorId = p.doctor._id.toString();
        if (!grouped[doctorId]) {
          grouped[doctorId] = {
            doctorId,
            doctorName: p.doctor.user?.fullName,
            amount: 0,
            platformFee: 0,
            doctorAmount: 0,
            count: 0,
          };
        }
        grouped[doctorId].amount += p.amount;
        grouped[doctorId].platformFee += p.platformFee;
        grouped[doctorId].doctorAmount += p.doctorAmount;
        grouped[doctorId].count += 1;
      });
      groupedData = Object.values(grouped);
    }

    return {
      period: {
        from: fromDate || "All time",
        to: toDate || "Present",
      },
      summary: {
        totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
        totalPlatformFee: payments.reduce((sum, p) => sum + p.platformFee, 0),
        totalDoctorAmount: payments.reduce((sum, p) => sum + p.doctorAmount, 0),
        totalRefunded: payments.reduce((sum, p) => sum + (p.refundAmount || 0), 0),
        totalTransactions: payments.length,
      },
      groupedData,
      payments: payments.slice(0, 100), // Last 100 transactions
    };
  }

  // ==================== Notifications ====================

  /**
   * Send payment confirmation
   */
  static async sendPaymentConfirmation(payment) {
    const patient = await Patient.findById(payment.patient).populate("user");
    const doctor = await Doctor.findById(payment.doctor).populate("user");
    const appointment = await Appointment.findById(payment.appointment);

    // Email to patient
    await sendEmail({
      to: patient.user.email,
      subject: "Payment Successful",
      template: "payment-success",
      data: {
        patientName: patient.user.fullName,
        doctorName: doctor.user.fullName,
        amount: payment.amount,
        date: new Date().toLocaleDateString("bn-BD"),
        transactionId: payment.transactionId,
        paymentMethod: payment.paymentMethod,
        appointmentDate: new Date(appointment.appointmentDate).toLocaleDateString("bn-BD"),
        appointmentTime: appointment.startTime,
      },
    });

    // SMS to patient
    await sendSMS({
      to: patient.user.phone,
      message: `Payment of ${payment.amount} BDT successful for appointment with Dr. ${doctor.user.fullName} on ${new Date(
        appointment.appointmentDate
      ).toLocaleDateString("bn-BD")} at ${appointment.startTime}. Transaction ID: ${payment.transactionId}`,
    });
  }

  /**
   * Send refund notification
   */
  static async sendRefundNotification(payment, amount, reason) {
    const patient = await Patient.findById(payment.patient).populate("user");

    await sendEmail({
      to: patient.user.email,
      subject: "Payment Refund Processed",
      template: "payment-refund",
      data: {
        patientName: patient.user.fullName,
        amount,
        reason,
        transactionId: payment.transactionId,
        refundDate: new Date().toLocaleDateString("bn-BD"),
      },
    });

    await sendSMS({
      to: patient.user.phone,
      message: `Refund of ${amount} BDT has been processed for transaction ${payment.transactionId}. Reason: ${reason}`,
    });
  }

  /**
   * Send withdrawal request notification
   */
  static async sendWithdrawalRequestNotification(doctor, request) {
    // Notify admin
    const admins = await User.find({ role: { $in: ["admin", "superadmin"] } });

    for (const admin of admins) {
      await sendEmail({
        to: admin.email,
        subject: "New Withdrawal Request",
        template: "withdrawal-request",
        data: {
          adminName: admin.fullName,
          doctorName: doctor.user?.fullName,
          amount: request.amount,
          paymentMethod: request.paymentMethod,
          requestedAt: request.requestedAt,
        },
      });
    }
  }

  /**
   * Send withdrawal update notification
   */
  static async sendWithdrawalUpdateNotification(doctor, update) {
    const doctorUser = await User.findById(doctor.user);

    await sendSMS({
      to: doctorUser.phone,
      message: `Your withdrawal request of ${update.amount} BDT has been ${update.status}. ${update.transactionId ? `Transaction ID: ${update.transactionId}` : ""
        }`,
    });
  }

  // ==================== SSLCommerz Payment Methods ====================

  /**
   * Initiate SSLCommerz payment
   */
  static async initiateSSLCommerzPayment(patientId, paymentData) {
    const { appointmentId, paymentMethod = "card" } = paymentData;

    console.log('=== SSLCommerz Initiate Debug ===');
    console.log('patientId (Patient document ID):', patientId);
    console.log('appointmentId:', appointmentId);

    // 🔥 FIX: Find appointment by _id
    const appointment = await Appointment.findById(appointmentId);

    console.log('Appointment found:', appointment ? 'Yes' : 'No');
    
    if (!appointment) {
      throw new ApiError(404, `Appointment not found with ID: ${appointmentId}`);
    }

    console.log('Appointment patientId:', appointment.patientId);
    console.log('Appointment doctorId:', appointment.doctorId);

    let userFromPatient = null;
    let isAuthorized = false;
    
    // Method 1: Check if patientId matches appointment.patientId directly
    if (appointment.patientId && appointment.patientId.toString() === patientId) {
      isAuthorized = true;
      console.log('Authorized by direct patientId match');
    }
    
    // Method 2: Find patient document and get user ID
    if (!isAuthorized) {
      const patientDoc = await Patient.findById(patientId);
      console.log('Patient document found:', patientDoc ? 'Yes' : 'No');
      
      if (patientDoc && patientDoc.user) {
        userFromPatient = patientDoc.user.toString();
        console.log('User ID from patient document:', userFromPatient);
        console.log('Appointment patientId:', appointment.patientId?.toString());
        
        if (userFromPatient === appointment.patientId?.toString()) {
          isAuthorized = true;
          console.log('Authorized by patient document user ID match');
        }
      }
    }
    
    // Method 3: Try to find patient by user ID
    if (!isAuthorized) {
      const patientByUser = await Patient.findOne({ user: appointment.patientId });
      console.log('Patient by user ID found:', patientByUser ? 'Yes' : 'No');
      
      if (patientByUser && patientByUser._id.toString() === patientId) {
        isAuthorized = true;
        console.log('Authorized by patient user ID lookup');
      }
    }

    console.log('Is authorized:', isAuthorized);

    if (!isAuthorized) {
      throw new ApiError(403, "You are not authorized to pay for this appointment");
    }

    // Check if appointment is already paid
    const existingPayment = await Payment.findOne({
      appointment: appointmentId,
      status: "completed"
    });

    if (existingPayment) {
      throw new ApiError(400, "Payment already completed for this appointment");
    }

    // Get doctor profile for commission rate
    const doctorProfile = await Doctor.findOne({ user: appointment.doctorId });
    
    // Calculate fees
    const commissionRate = doctorProfile?.commissionRate || 20;
    const platformFee = Math.round(appointment.fee * (commissionRate / 100));
    const doctorAmount = appointment.fee - platformFee;
    const transactionId = this.generateTransactionId();

    // Get patient user info for email/SMS
    const patientDoc = await Patient.findById(patientId).populate("user");

    // Create or update payment record
    let payment = await Payment.findOne({ appointment: appointmentId });

    if (payment) {
      payment.transactionId = transactionId;
      payment.amount = appointment.fee;
      payment.platformFee = platformFee;
      payment.doctorAmount = doctorAmount;
      payment.paymentMethod = paymentMethod;
      payment.status = "pending";
    } else {
      payment = await Payment.create({
        appointment: appointmentId,
        patient: patientId,
        doctor: appointment.doctorId,
        amount: appointment.fee,
        platformFee,
        doctorAmount,
        paymentMethod,
        status: "pending",
        transactionId,
      });
    }

    await payment.save();

    console.log('Payment record created/updated:', payment._id);

    // Create SSLCommerz payment session
    const { createSSLCommerzPayment } = await import("./payment.utils.js");

    const sslResult = await createSSLCommerzPayment({
      amount: appointment.fee,
      transactionId,
      customerName: patientDoc?.user?.fullName || "Patient",
      customerEmail: patientDoc?.user?.email || "patient@example.com",
      customerPhone: patientDoc?.user?.phone || "01700000000",
      customerAddress: patientDoc?.user?.address?.street || "Dhaka",
      productName: `Appointment with Dr. ${appointment.doctorInfo?.name || 'Doctor'}`,
    });

    console.log('SSLCommerz result:', sslResult);

    if (!sslResult.success) {
      payment.status = "failed";
      await payment.save();
      throw new ApiError(400, sslResult.message || "Payment initiation failed");
    }

    // Store session key in payment details
    payment.paymentDetails = {
      ...payment.paymentDetails,
      sslSessionKey: sslResult.sessionKey,
      initiatedAt: new Date(),
    };
    await payment.save();

    return {
      payment,
      redirectURL: sslResult.redirectURL,
    };
  }

  /**
   * Handle SSLCommerz failure callback
   */
  static async handleSSLCommerzFail(transactionId, reason) {
    const payment = await Payment.findOne({ transactionId });

    if (!payment) {
      throw new ApiError(404, "Payment not found");
    }

    payment.status = "failed";
    payment.paymentDetails = {
      ...payment.paymentDetails,
      failureReason: reason || "Payment failed",
      failedAt: new Date(),
    };
    await payment.save();

    return payment;
  }

  /**
   * Handle SSLCommerz cancellation
   */
  static async handleSSLCommerzCancel(transactionId) {
    const payment = await Payment.findOne({ transactionId });

    if (!payment) {
      throw new ApiError(404, "Payment not found");
    }

    payment.status = "cancelled";
    payment.paymentDetails = {
      ...payment.paymentDetails,
      cancelledAt: new Date(),
      cancellationReason: "User cancelled payment",
    };
    await payment.save();

    return payment;
  }
}