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

// ==================== SSLCommerz Configuration ====================

const SSLCOMMERZ_CONFIG = {
  sandbox: {
    baseURL: "https://sandbox.sslcommerz.com",
    storeId: process.env.SSLCOMMERZ_SANDBOX_STORE_ID,
    storePassword: process.env.SSLCOMMERZ_SANDBOX_STORE_PASSWORD,
  },
  live: {
    baseURL: "https://secure.sslcommerz.com",
    storeId: process.env.SSLCOMMERZ_LIVE_STORE_ID,
    storePassword: process.env.SSLCOMMERZ_LIVE_STORE_PASSWORD,
  },
};

const isProduction = process.env.NODE_ENV === "production";
const sslcommerzConfig = isProduction ? SSLCOMMERZ_CONFIG.live : SSLCOMMERZ_CONFIG.sandbox;

/**
 * Create SSLCommerz payment session
 */
export async function createSSLCommerzPayment(orderData) {
  try {
    const {
      amount,
      transactionId,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      productName = "Doctor Appointment",
      successUrl,
      failUrl,
      cancelUrl,
      ipnUrl,
    } = orderData;

    const postData = {
      store_id: sslcommerzConfig.storeId,
      store_passwd: sslcommerzConfig.storePassword,
      total_amount: amount,
      currency: "BDT",
      tran_id: transactionId,
      success_url: successUrl || `${process.env.API_URL || 'http://localhost:5001'}/api/v1/payments/sslcommerz/success`,
      fail_url: failUrl || `${process.env.API_URL || 'http://localhost:5001'}/api/v1/payments/sslcommerz/fail`,
      cancel_url: cancelUrl || `${process.env.API_URL || 'http://localhost:5001'}/api/v1/payments/sslcommerz/cancel`,
      ipn_url: ipnUrl || `${process.env.API_URL || 'http://localhost:5001'}/api/v1/webhooks/sslcommerz`,
      cus_name: customerName,
      cus_email: customerEmail,
      cus_phone: customerPhone,
      cus_add1: customerAddress || "Dhaka",
      cus_city: "Dhaka",
      cus_country: "Bangladesh",
      shipping_method: "NO",
      product_name: productName,
      product_category: "Healthcare",
      product_profile: "general",
    };

    console.log("SSLCommerz Request:", postData);

    const response = await axios({
      method: "POST",
      url: `${sslcommerzConfig.baseURL}/gwprocess/v4/api.php`,
      data: new URLSearchParams(postData),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    console.log("SSLCommerz Response:", response.data);

    if (response.data.status === "SUCCESS") {
      return {
        success: true,
        redirectURL: response.data.GatewayPageURL,
        sessionKey: response.data.sessionkey,
      };
    } else {
      return {
        success: false,
        message: response.data.failedreason || "Payment initiation failed",
        error: response.data,
      };
    }
  } catch (error) {
    console.error("SSLCommerz payment error:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.failedreason || "Payment gateway error",
    };
  }
}

/**
 * Validate SSLCommerz payment
 */
export async function validateSSLCommerzPayment(transactionId, amount) {
  try {
    const validationUrl = `${sslcommerzConfig.baseURL}/validator/api/validationserverAPI.php`;
    
    const response = await axios.get(validationUrl, {
      params: {
        store_id: sslcommerzConfig.storeId,
        store_passwd: sslcommerzConfig.storePassword,
        tran_id: transactionId,
        format: "json",
      },
    });

    console.log("SSLCommerz Validation Response:", response.data);

    if (response.data.status === "VALID" || response.data.status === "VALIDATED") {
      const responseAmount = parseFloat(response.data.amount);
      if (responseAmount !== amount) {
        return {
          success: false,
          message: "Amount mismatch",
          data: response.data,
        };
      }

      return {
        success: true,
        message: "Payment validated successfully",
        data: {
          transactionId: response.data.tran_id,
          amount: response.data.amount,
          bankTransactionId: response.data.bank_tran_id,
          cardType: response.data.card_type,
          cardNumber: response.data.card_no,
          paymentDate: response.data.tran_date,
        },
      };
    } else {
      return {
        success: false,
        message: response.data.error_reason || "Invalid transaction",
        data: response.data,
      };
    }
  } catch (error) {
    console.error("SSLCommerz validation error:", error.message);
    return {
      success: false,
      message: "Validation failed",
    };
  }
}

// Make sure to export these at the bottom of file
// export default {
//   verifyBKashTransaction,
//   verifyNagadTransaction,
//   processCardPayment,
//   generatePaymentQRCode,
//   calculateCommission,
//   formatPaymentMethod,
//   getPaymentStatusBadge,
//   validateBKashNumber,
//   validateNagadNumber,
//   maskCardNumber,
//   calculateRefund,
//   generateTransactionReport,
//   createSSLCommerzPayment,
//   validateSSLCommerzPayment,
// };