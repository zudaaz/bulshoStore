const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const rolePermissions = require("../constants/roles");
const asyncHandler = require("../utils/asyncHandler");
const { successResponse, errorResponse } = require("../utils/apiResponse");

function getUserPermissions(user) {
  const custom = Array.isArray(user.permissions) ? user.permissions : [];
  const defaults = rolePermissions[user.role] || [];
  return [...new Set([...defaults, ...custom])];
}

function getStoreOwner(user) {
  return user.role === "admin" ? user._id : user.owner || user._id;
}

function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      owner: user.owner || null,
      storeOwner: getStoreOwner(user),
      permissions: getUserPermissions(user)
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "15m" }
  );
}

function generateRefreshToken(user) {
  return jwt.sign({ id: user._id, type: "refresh" }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES || "7d"
  });
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function cleanUser(user) {
  return {
    id: user._id,
    _id: user._id,
    owner: user.owner || null,
    storeOwner: getStoreOwner(user),
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    role: user.role || "staff",
    staffProfile: user.staffProfile || null,
    storeName: user.storeName || "Bulsho Store",
    address: user.address || "",
    country: user.country || "Somalia",
    timezone: user.timezone || "Africa/Mogadishu",
    avatar: user.avatar || "",
    permissions: getUserPermissions(user),
    isActive: user.isActive,
    isEmailVerified: user.isEmailVerified,
    lastLogin: user.lastLogin
  };
}

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, storeName = "Bulsho Store" } = req.body;
  const normalizedEmail = String(email || "").toLowerCase().trim();

  if (!name || !normalizedEmail || !password) {
    return errorResponse(res, "Name, email and password are required", 400);
  }

  const existingUserCount = await User.estimatedDocumentCount();
  if (existingUserCount > 0 && process.env.ALLOW_PUBLIC_REGISTRATION !== "true") {
    return errorResponse(res, "Public registration is disabled. Ask an administrator to create your account.", 403);
  }

  if (await User.exists({ email: normalizedEmail })) {
    return errorResponse(res, "Email already exists", 409);
  }

  const user = await User.create({
    name: String(name).trim(),
    email: normalizedEmail,
    password,
    role: "admin",
    owner: null,
    permissions: rolePermissions.admin || [],
    isActive: true,
    isEmailVerified: true,
    storeName: String(storeName || "Bulsho Store").trim(),
    country: "Somalia",
    timezone: "Africa/Mogadishu"
  });

  return successResponse(res, "Store owner account created successfully", { user: cleanUser(user) }, 201);
});

exports.login = asyncHandler(async (req, res) => {
  const normalizedEmail = String(req.body.email || "").toLowerCase().trim();
  const password = String(req.body.password || "");
  const user = await User.findOne({ email: normalizedEmail }).select(
    "+password +refreshToken +failedLoginAttempts +lockUntil"
  );

  if (!user) return errorResponse(res, "Invalid email or password", 401);

  if (user.isLocked) {
    return errorResponse(res, "Account is temporarily locked. Try again later.", 423);
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    user.failedLoginAttempts = Number(user.failedLoginAttempts || 0) + 1;
    if (user.failedLoginAttempts >= Number(process.env.MAX_LOGIN_ATTEMPTS || 5)) {
      user.lockUntil = new Date(Date.now() + Number(process.env.LOGIN_LOCK_MINUTES || 15) * 60 * 1000);
      user.failedLoginAttempts = 0;
    }
    await user.save({ validateBeforeSave: false });
    return errorResponse(res, "Invalid email or password", 401);
  }

  if (!user.isActive) return errorResponse(res, "Account is disabled", 403);

  const refreshToken = generateRefreshToken(user);
  user.permissions = getUserPermissions(user);
  user.refreshToken = hashToken(refreshToken);
  user.lastLogin = new Date();
  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  user.loginHistory = Array.isArray(user.loginHistory) ? user.loginHistory : [];
  user.loginHistory.push({ ip: req.ip, userAgent: req.headers["user-agent"] || "" });
  if (user.loginHistory.length > 50) user.loginHistory = user.loginHistory.slice(-50);
  await user.save({ validateBeforeSave: false });

  return successResponse(res, "Login successful", {
    accessToken: generateAccessToken(user),
    refreshToken,
    user: cleanUser(user)
  });
});

exports.refreshToken = asyncHandler(async (req, res) => {
  const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
  if (!refreshToken) return errorResponse(res, "Refresh token is required", 400);

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch {
    return errorResponse(res, "Invalid or expired refresh token", 401);
  }

  if (decoded.type !== "refresh") return errorResponse(res, "Invalid refresh token", 401);

  const user = await User.findById(decoded.id).select("+refreshToken");
  if (!user || user.refreshToken !== hashToken(refreshToken)) {
    return errorResponse(res, "Invalid refresh token", 401);
  }
  if (!user.isActive) return errorResponse(res, "Account is disabled", 403);

  const newRefreshToken = generateRefreshToken(user);
  user.refreshToken = hashToken(newRefreshToken);
  await user.save({ validateBeforeSave: false });

  return successResponse(res, "Token refreshed successfully", {
    accessToken: generateAccessToken(user),
    refreshToken: newRefreshToken,
    user: cleanUser(user)
  });
});

exports.logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $set: { refreshToken: null } });
  res.clearCookie("refreshToken");
  return successResponse(res, "Logged out successfully");
});

exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) return errorResponse(res, "User not found", 404);
  return successResponse(res, "Current user fetched", cleanUser(user));
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) return errorResponse(res, "User not found", 404);

  const { name, email, phone, storeName, address, country, timezone, avatar } = req.body;
  if (email && String(email).toLowerCase().trim() !== user.email) {
    const normalizedEmail = String(email).toLowerCase().trim();
    if (await User.exists({ email: normalizedEmail, _id: { $ne: user._id } })) {
      return errorResponse(res, "Email already exists", 409);
    }
    user.email = normalizedEmail;
  }

  if (name !== undefined) user.name = String(name).trim();
  if (phone !== undefined) user.phone = phone;
  if (storeName !== undefined) user.storeName = storeName;
  if (address !== undefined) user.address = address;
  if (country !== undefined) user.country = country;
  if (timezone !== undefined) user.timezone = timezone;
  if (avatar !== undefined) user.avatar = avatar;
  await user.save();

  return successResponse(res, "Profile updated successfully", cleanUser(user));
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select("+password +refreshToken");
  if (!user) return errorResponse(res, "User not found", 404);
  if (!(await user.comparePassword(currentPassword))) {
    return errorResponse(res, "Current password is incorrect", 400);
  }

  user.password = newPassword;
  user.refreshToken = null;
  await user.save();
  return successResponse(res, "Password changed successfully. Please sign in again.");
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  const normalizedEmail = String(req.body.email || "").toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });
  let developmentResetToken;

  if (user) {
    const rawToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = hashToken(rawToken);
    user.resetPasswordExpire = new Date(Date.now() + 30 * 60 * 1000);
    await user.save({ validateBeforeSave: false });
    if (process.env.NODE_ENV !== "production") developmentResetToken = rawToken;
    // Integrate an email/SMS provider in production using rawToken and PASSWORD_RESET_URL.
  }

  return successResponse(res, "If the account exists, password reset instructions have been generated.", {
    ...(developmentResetToken ? { developmentResetToken } : {})
  });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const tokenHash = hashToken(String(req.params.token || ""));
  const user = await User.findOne({
    resetPasswordToken: tokenHash,
    resetPasswordExpire: { $gt: new Date() }
  }).select("+password +refreshToken");

  if (!user) return errorResponse(res, "Reset token is invalid or expired", 400);
  user.password = req.body.password;
  user.resetPasswordToken = "";
  user.resetPasswordExpire = null;
  user.refreshToken = null;
  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  await user.save();
  return successResponse(res, "Password reset successfully. You can now sign in.");
});
