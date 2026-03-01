import nodemailer from "nodemailer";
import {
  EMAIL_SERVICE,
  EMAIL_USERNAME,
  EMAIL_PASSWORD,
  MAIL_FROM_NAME,
  MAIL_FROM_EMAIL,
} from "../config/env.js";

const transporter = nodemailer.createTransport({
  service: EMAIL_SERVICE,
  auth: {
    user: EMAIL_USERNAME,
    pass: EMAIL_PASSWORD,
  },
});

export const sendEmail = async ({ to, subject, template, data }) => {
  try {
    // Simple HTML template for OTP
    let html = "";
    
    if (template === "email-otp") {
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Email Verification</h2>
          <p>Hello ${data.name},</p>
          <p>Your OTP for email verification is:</p>
          <h1 style="background: #f0f0f0; padding: 10px; text-align: center; letter-spacing: 5px;">${data.otp}</h1>
          <p>This OTP will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `;
    }

    const mailOptions = {
      from: `"${MAIL_FROM_NAME}" <${MAIL_FROM_EMAIL}>`,
      to,
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}`);
  } catch (error) {
    console.error("❌ Email sending failed:", error);
    throw error;
  }
};