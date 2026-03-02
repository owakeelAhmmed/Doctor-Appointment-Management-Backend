import { User } from "../modules/auth/auth.model.js";

export const seedSuperAdmin = async () => {
  try {
    const existingSuperAdmin = await User.findOne({ role: "superadmin" });

    if (existingSuperAdmin) {
      console.log("✅ Superadmin already exists");
      return;
    }

    await User.create({
      email: process.env.DEFAULT_SUPERADMIN_EMAIL,
      phone: process.env.DEFAULT_SUPERADMIN_PHONE,
      password: process.env.DEFAULT_SUPERADMIN_PASSWORD,
      fullName: "Super Admin",
      dateOfBirth: new Date("1990-01-01"),
      gender: "M",
      role: "superadmin",
      isActive: true,
      isEmailVerified: true,
      isPhoneVerified: true,
    });

    console.log("🔥 Superadmin created successfully");
  } catch (error) {
    console.error("❌ Error seeding superadmin:", error);
  }
};