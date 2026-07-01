require("dotenv").config();

const connectDB = require("../config/db");
const { closeDB } = require("../db/pool");
const User = require("../models/User");

function requireAdminCredentials() {
  const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || "");
  if (!email) throw new Error("ADMIN_EMAIL is required");
  if (password.length < 12) throw new Error("ADMIN_PASSWORD must contain at least 12 characters");
  return { email, password };
}

async function seedAdmin() {
  try {
    const { email, password } = requireAdminCredentials();
    await connectDB();

    const existingAdmin = await User.findOne({ email });
    if (existingAdmin) {
      console.log(`Admin already exists: ${existingAdmin.email}`);
      return;
    }

    const admin = await User.create({
      name: String(process.env.ADMIN_NAME || "System Admin").trim(),
      email,
      password,
      role: "admin",
      permissions: [],
      isActive: true,
      isEmailVerified: true
    });

    console.log(`Admin created successfully: ${admin.email}`);
  } catch (error) {
    console.error(`Admin seeding failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await closeDB().catch(() => undefined);
  }
}

seedAdmin();
