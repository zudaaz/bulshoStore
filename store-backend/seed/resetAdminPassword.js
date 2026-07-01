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

async function resetPassword() {
  try {
    const { email, password } = requireAdminCredentials();
    await connectDB();

    const admin = await User.findOne({ email }).select("+refreshToken");
    if (!admin) throw new Error(`Admin account was not found for ${email}`);

    admin.password = password;
    admin.isActive = true;
    admin.isEmailVerified = true;
    admin.failedLoginAttempts = 0;
    admin.lockUntil = null;
    admin.refreshToken = null;
    admin.resetPasswordToken = "";
    admin.resetPasswordExpire = null;
    await admin.save();

    console.log(`Admin password reset successfully: ${admin.email}`);
  } catch (error) {
    console.error(`Admin password reset failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await closeDB().catch(() => undefined);
  }
}

resetPassword();
