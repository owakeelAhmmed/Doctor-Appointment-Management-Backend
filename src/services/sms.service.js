import twilio from "twilio";

// Initialize Twilio (you'll need to add these to .env)
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const sendSMS = async ({ to, message }) => {
  try {
    // For development, just log the message
    if (process.env.NODE_ENV === "development") {
      console.log(`📱 SMS to ${to}: ${message}`);
      return { success: true };
    }

    // For production, uncomment this
    /*
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: `+88${to}`, // Add Bangladesh country code
    });
    console.log(`✅ SMS sent to ${to}`);
    return result;
    */
  } catch (error) {
    console.error("❌ SMS sending failed:", error);
    throw error;
  }
};