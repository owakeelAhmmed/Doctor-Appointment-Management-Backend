import { AuthService } from "./auth.service.js";

export class AuthController {
  
  // Register
  static async register(req, res, next) {
    try {
      const result = await AuthService.register(req.body);
      
      res.status(201).json({
        success: true,
        message: "Registration successful. Please verify your email and phone.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // Verify Email
  static async verifyEmail(req, res, next) {
    try {
      const { email, otp } = req.body;
      const result = await AuthService.verifyEmail(email, otp);
      
      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  // Verify Phone
  static async verifyPhone(req, res, next) {
    try {
      const { phone, otp } = req.body;
      const result = await AuthService.verifyPhone(phone, otp);
      
      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  // Login
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);
      
      // Set cookie
      res.cookie("token", result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      res.json({
        success: true,
        message: "Login successful",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // Resend OTP
  static async resendOTP(req, res, next) {
    try {
      const { identifier, type } = req.body;
      const result = await AuthService.resendOTP(identifier, type);
      
      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  // Complete Doctor Profile
  static async completeDoctorProfile(req, res, next) {
    try {
      const userId = req.user._id;
      const result = await AuthService.completeDoctorProfile(
        userId,
        req.body,
        req.files
      );
      
      res.json({
        success: true,
        message: "Doctor profile completed successfully. Waiting for verification.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // Forgot Password
  static async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      const result = await AuthService.forgotPassword(email);
      
      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  // Reset Password
  static async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.body;
      const result = await AuthService.resetPassword(token, newPassword);
      
      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  // Change Password
  static async changePassword(req, res, next) {
    try {
      const userId = req.user._id;
      const { currentPassword, newPassword } = req.body;
      const result = await AuthService.changePassword(userId, currentPassword, newPassword);
      
      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  // Logout
  static async logout(req, res) {
    res.cookie("token", "none", {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  }

  // Get Current User
  static async getMe(req, res, next) {
    try {
      const result = await AuthService.getProfile(req.user._id);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // Update Profile
  static async updateProfile(req, res, next) {
    try {
      const result = await AuthService.updateProfile(req.user._id, req.body);
      
      res.json({
        success: true,
        message: "Profile updated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin: Create Admin (SuperAdmin only)
  static async createAdmin(req, res, next) {
    try {
      const result = await AuthService.createAdmin(req.body, req.user._id);
      
      res.status(201).json({
        success: true,
        message: "Admin created successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin: Get All Admins
  static async getAllAdmins(req, res, next) {
    try {
      const result = await AuthService.getAllAdmins();
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin: Update Admin Permissions
  static async updateAdminPermissions(req, res, next) {
    try {
      const { adminId } = req.params;
      const { permissions } = req.body;
      const result = await AuthService.updateAdminPermissions(
        adminId,
        permissions,
        req.user._id
      );
      
      res.json({
        success: true,
        message: "Admin permissions updated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}