import { PaymentService } from "./payment.service.js";

/**
 * Handle bKash payment webhook
 */
export async function handleBKashWebhook(req, res) {
  try {
    const { transactionId, amount, reference, status } = req.body;

    // Verify webhook signature
    // This would verify the request is from bKash

    if (status === "success") {
      // Find payment by reference
      const payment = await Payment.findOne({ transactionId: reference });
      
      if (payment && payment.status === "pending") {
        await PaymentService.processBKashPayment(payment.patient, {
          appointmentId: payment.appointment,
          bkashNumber: payment.paymentDetails?.bkashNumber,
          transactionId,
        });
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error("bKash webhook error:", error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Handle Nagad payment webhook
 */
export async function handleNagadWebhook(req, res) {
  try {
    const { transactionId, amount, reference, status } = req.body;

    if (status === "success") {
      const payment = await Payment.findOne({ transactionId: reference });
      
      if (payment && payment.status === "pending") {
        await PaymentService.processNagadPayment(payment.patient, {
          appointmentId: payment.appointment,
          nagadNumber: payment.paymentDetails?.nagadNumber,
          transactionId,
        });
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Nagad webhook error:", error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Handle card payment webhook
 */
export async function handleCardWebhook(req, res) {
  try {
    const { transactionId, amount, reference, status } = req.body;

    if (status === "success") {
      const payment = await Payment.findById(reference);
      
      if (payment && payment.status === "pending") {
        await PaymentService.processCardPayment({
          paymentId: reference,
          amount,
          transactionId,
        });
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Card webhook error:", error);
    res.status(500).json({ error: error.message });
  }
}