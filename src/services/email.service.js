import nodemailer from "nodemailer";
import {
  EMAIL_SERVICE,
  EMAIL_USERNAME,
  EMAIL_PASSWORD,
  MAIL_FROM_NAME,
  MAIL_FROM_EMAIL,
  CLIENT_URL
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
    let html = "";

    // ================================
    // EMAIL OTP TEMPLATE
    // ================================
    if (template === "email-otp") {
      html = `
      <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto;">
        <h2>Email Verification</h2>
        <p>Hello <b>${data.name}</b>,</p>

        <p>Your OTP for email verification is:</p>

        <h1 style="
          background:#f4f4f4;
          padding:15px;
          text-align:center;
          letter-spacing:5px;
          border-radius:6px;
        ">
          ${data.otp}
        </h1>

        <p>This OTP will expire in <b>10 minutes</b>.</p>

        <p>If you didn't request this, please ignore this email.</p>

        <hr/>

        <p style="font-size:12px;color:#888;">
          Doctor Appointment System
        </p>
      </div>
      `;
    }

    // ================================
    // RESET PASSWORD TEMPLATE
    // ================================
    if (template === "reset-password") {

      const resetUrl = `${CLIENT_URL}/reset-password/${data.resetToken}`;

      html = `
      <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto;">
        <h2>Password Reset Request</h2>

        <p>Hello <b>${data.name}</b>,</p>

        <p>You requested to reset your password.</p>

        <p>
          Click the button below to reset your password:
        </p>

        <div style="text-align:center;margin:30px 0;">
          <a href="${resetUrl}" 
            style="
              background:#6366f1;
              color:white;
              padding:12px 25px;
              text-decoration:none;
              border-radius:6px;
              font-weight:bold;
              display:inline-block;
            ">
            Reset Password
          </a>
        </div>

        <p>This link will expire in <b>10 minutes</b>.</p>

        <p>If you did not request this, please ignore this email.</p>

        <hr/>

        <p style="font-size:12px;color:#888;">
          Doctor Appointment System
        </p>
      </div>
      `;
    }

    // ================================
    // ADMIN WELCOME TEMPLATE
    // ================================
    if (template === "admin-welcome") {
      html = `
      <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto;">
        <h2>Welcome to Admin Panel</h2>

        <p>Hello <b>${data.name}</b>,</p>

        <p>Your admin account has been created.</p>

        <p><b>Email:</b> ${data.email}</p>
        <p><b>Password:</b> ${data.password}</p>

        <p>
          Login here:
          <a href="${data.loginUrl}">
            ${data.loginUrl}
          </a>
        </p>

        <p>Please change your password after login.</p>

        <hr/>

        <p style="font-size:12px;color:#888;">
          Doctor Appointment System
        </p>
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