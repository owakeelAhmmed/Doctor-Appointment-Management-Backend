import axios from "axios";
import crypto from "crypto";

/**
 * Verify bKash transaction
 */
export async function verifyBKashTransaction(transactionId, reference) {
  try {
    // This would call bKash API
    // For now, return mock verification
    return {
      valid: true,
      message: "Transaction verified successfully",
      data: {
        transactionId,
        amount: 1000,
        reference,
        timestamp: new Date(),
      },
    };
  } catch (error) {
    return {
      valid: false,
      message: "Transaction verification failed",
    };
  }
}

/**
 * Verify Nagad transaction
 */
export async function verifyNagadTransaction(transactionId, reference) {
  try {
    // This would call Nagad API
    // For now, return mock verification
    return {
      valid: true,
      message: "Transaction verified successfully",
      data: {
        transactionId,
        amount: 1000,
        reference,
        timestamp: new Date(),
      },
    };
  } catch (error) {
    return {
      valid: false,
      message: "Transaction verification failed",
    };
  }
}

/**
 * Process card payment through payment gateway
 */
export async function processCardPayment({ amount, cardDetails, transactionId }) {
  try {
    // This would call a payment gateway like SSLCOMMERZ, AmarPay, etc.
    // For now, return mock success
    return {
      success: true,
      message: "Payment processed successfully",
      transactionId: `CARD${Date.now()}`,
      authCode: crypto.randomBytes(4).toString("hex").toUpperCase(),
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || "Payment processing failed",
    };
  }
}

/**
 * Generate payment QR code
 */
export function generatePaymentQRCode(paymentId, amount) {
  // This would generate a QR code for payment
  const qrData = JSON.stringify({
    paymentId,
    amount,
    timestamp: Date.now(),
  });
  
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;
}

/**
 * Calculate commission
 */
export function calculateCommission(amount, rate) {
  const commission = Math.round(amount * (rate / 100));
  return {
    commission,
    netAmount: amount - commission,
  };
}

/**
 * Format payment method for display
 */
export function formatPaymentMethod(method) {
  const methods = {
    bKash: "bKash",
    Nagad: "Nagad",
    card: "Credit/Debit Card",
    cash: "Cash",
  };
  
  return methods[method] || method;
}

/**
 * Get payment status badge
 */
export function getPaymentStatusBadge(status) {
  const badges = {
    pending: { color: "warning", text: "Pending" },
    completed: { color: "success", text: "Completed" },
    failed: { color: "danger", text: "Failed" },
    refunded: { color: "info", text: "Refunded" },
    cancelled: { color: "secondary", text: "Cancelled" },
  };
  
  return badges[status] || { color: "light", text: status };
}

/**
 * Validate bKash number
 */
export function validateBKashNumber(number) {
  const bKashRegex = /^(?:\+88|88)?01[3-9]\d{8}$/;
  return bKashRegex.test(number);
}

/**
 * Validate Nagad number
 */
export function validateNagadNumber(number) {
  const nagadRegex = /^(?:\+88|88)?01[6-9]\d{8}$/;
  return nagadRegex.test(number);
}

/**
 * Mask card number
 */
export function maskCardNumber(cardNumber) {
  const last4 = cardNumber.slice(-4);
  return `**** **** **** ${last4}`;
}

/**
 * Calculate refund amount based on cancellation policy
 */
export function calculateRefund(amount, hoursBeforeAppointment) {
  if (hoursBeforeAppointment >= 24) {
    return amount; // 100% refund
  } else if (hoursBeforeAppointment >= 12) {
    return Math.round(amount * 0.5); // 50% refund
  } else if (hoursBeforeAppointment >= 6) {
    return Math.round(amount * 0.25); // 25% refund
  } else {
    return 0; // No refund
  }
}

/**
 * Generate transaction report
 */
export function generateTransactionReport(transactions, period) {
  const summary = {
    totalAmount: 0,
    totalTransactions: transactions.length,
    byMethod: {},
    byStatus: {},
  };
  
  transactions.forEach(t => {
    summary.totalAmount += t.amount;
    
    // Group by method
    if (!summary.byMethod[t.paymentMethod]) {
      summary.byMethod[t.paymentMethod] = {
        count: 0,
        amount: 0,
      };
    }
    summary.byMethod[t.paymentMethod].count++;
    summary.byMethod[t.paymentMethod].amount += t.amount;
    
    // Group by status
    if (!summary.byStatus[t.status]) {
      summary.byStatus[t.status] = {
        count: 0,
        amount: 0,
      };
    }
    summary.byStatus[t.status].count++;
    summary.byStatus[t.status].amount += t.amount;
  });
  
  return {
    period,
    summary,
    transactions: transactions.slice(0, 50), // Last 50
  };
}