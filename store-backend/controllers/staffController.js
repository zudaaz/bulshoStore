const Staff = require("../models/Staff");
const User = require("../models/User");
const rolePermissions = require("../constants/roles");
const asyncHandler = require("../utils/asyncHandler");
const { successResponse, errorResponse } = require("../utils/apiResponse");
const { createAuditLog } = require("../middleware/auditMiddleware");

const roleMap = {
  Admin: "manager",
  Manager: "manager",
  Cashier: "cashier",
  Accountant: "accountant",
  "Store Keeper": "store_keeper",
  "Sales Officer": "sales_officer",
  "Inventory Officer": "inventory_officer",
  Viewer: "staff"
};

function mapRole(role) {
  return roleMap[role] || "staff";
}

function getOwnerId(req) {
  return req.storeOwner || req.user.owner || req.user._id;
}

function finalPermissions(role, permissions = []) {
  const custom = Array.isArray(permissions) ? [...new Set(permissions.filter(Boolean))] : [];
  return custom.length > 0 ? custom : rolePermissions[mapRole(role)] || [];
}

function publicStaff(staff) {
  const data = staff.toObject ? staff.toObject() : { ...staff };
  delete data.password;
  return data;
}

exports.createStaff = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);
  const {
    name,
    email,
    phone,
    role = "Cashier",
    department = "",
    salary = 0,
    status = "Active",
    permissions = [],
    password,
    address = "",
    notes = ""
  } = req.body;

  const normalizedName = String(name || "").trim();
  const normalizedEmail = String(email || "").toLowerCase().trim();
  const normalizedPhone = String(phone || "").trim();

  if (!normalizedName || !normalizedEmail || !normalizedPhone) {
    return errorResponse(res, "Name, email and phone are required", 400);
  }
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) return errorResponse(res, "A valid email address is required", 400);
  if (!password || String(password).length < 8) return errorResponse(res, "Password must be at least 8 characters", 400);
  if (!roleMap[role]) return errorResponse(res, "Invalid staff role", 400);
  if (!["Active", "Inactive"].includes(status)) return errorResponse(res, "Invalid staff status", 400);

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) return errorResponse(res, "This email already has a login account", 400);

  const existingStaff = await Staff.findOne({ user: ownerId, email: normalizedEmail, isDeleted: false });
  if (existingStaff) return errorResponse(res, "Staff email already exists", 400);

  const staffPermissions = finalPermissions(role, permissions);
  let staff = null;
  let loginUser = null;

  try {
    staff = await Staff.create({
      user: ownerId,
      name: normalizedName,
      email: normalizedEmail,
      phone: normalizedPhone,
      password: String(password),
      role,
      department: String(department || "").trim(),
      salary: Number(salary || 0),
      status,
      permissions: staffPermissions,
      isActive: status === "Active",
      address: String(address || "").trim(),
      notes: String(notes || "").trim(),
      isDeleted: false
    });

    loginUser = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      phone: normalizedPhone,
      password: String(password),
      role: mapRole(role),
      owner: ownerId,
      permissions: staffPermissions,
      staffProfile: staff._id,
      storeName: req.user.storeName || "Bulsho Store",
      address: req.user.address || "",
      country: req.user.country || "Somalia",
      timezone: req.user.timezone || "Africa/Mogadishu",
      isActive: status === "Active",
      isEmailVerified: true
    });
  } catch (error) {
    if (loginUser?._id) await User.deleteOne({ _id: loginUser._id }).catch(() => undefined);
    if (staff?._id) await Staff.deleteOne({ _id: staff._id }).catch(() => undefined);
    throw error;
  }

  await createAuditLog({ req, action: "CREATE", module: "STAFF", recordId: staff._id, newData: publicStaff(staff) });
  return successResponse(res, "Staff and login account created successfully", { staff: publicStaff(staff), login: { email: loginUser.email } }, 201);
});

exports.getStaff = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);
  const staff = await Staff.find({ user: ownerId, isDeleted: false }).sort({ createdAt: -1 });
  return successResponse(res, "Staff fetched successfully", staff.map(publicStaff));
});

exports.getSingleStaff = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);
  const staff = await Staff.findOne({ _id: req.params.id, user: ownerId, isDeleted: false });
  if (!staff) return errorResponse(res, "Staff not found", 404);
  return successResponse(res, "Staff fetched successfully", publicStaff(staff));
});

exports.updateStaff = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);
  const staff = await Staff.findOne({ _id: req.params.id, user: ownerId, isDeleted: false }).select("+password");
  if (!staff) return errorResponse(res, "Staff not found", 404);

  const oldData = publicStaff(staff);
  const nextEmail = req.body.email ? String(req.body.email).toLowerCase().trim() : staff.email;
  const nextRole = req.body.role || staff.role;
  const nextStatus = req.body.status || staff.status;
  const password = req.body.password ? String(req.body.password) : "";

  if (!/^\S+@\S+\.\S+$/.test(nextEmail)) return errorResponse(res, "A valid email address is required", 400);
  if (password && password.length < 8) return errorResponse(res, "Password must be at least 8 characters", 400);
  if (!roleMap[nextRole]) return errorResponse(res, "Invalid staff role", 400);
  if (!["Active", "Inactive"].includes(nextStatus)) return errorResponse(res, "Invalid staff status", 400);

  if (nextEmail !== staff.email) {
    const duplicate = await User.findOne({ email: nextEmail, staffProfile: { $ne: staff._id } });
    if (duplicate) return errorResponse(res, "This email already has a login account", 400);
  }

  const permissions = finalPermissions(nextRole, req.body.permissions ?? staff.permissions);
  staff.name = req.body.name !== undefined ? String(req.body.name).trim() : staff.name;
  staff.email = nextEmail;
  staff.phone = req.body.phone !== undefined ? String(req.body.phone).trim() : staff.phone;
  staff.role = nextRole;
  staff.department = req.body.department !== undefined ? String(req.body.department).trim() : staff.department;
  staff.salary = req.body.salary !== undefined ? Number(req.body.salary || 0) : staff.salary;
  staff.status = nextStatus;
  staff.permissions = permissions;
  staff.isActive = nextStatus === "Active";
  staff.address = req.body.address !== undefined ? String(req.body.address).trim() : staff.address;
  staff.notes = req.body.notes !== undefined ? String(req.body.notes).trim() : staff.notes;
  if (password) staff.password = password;

  let loginUser = await User.findOne({ staffProfile: staff._id }).select("+password +refreshToken");
  if (!loginUser) return errorResponse(res, "The staff login account is missing; recreate this staff member", 409);

  loginUser.name = staff.name;
  loginUser.email = staff.email;
  loginUser.phone = staff.phone;
  loginUser.role = mapRole(staff.role);
  loginUser.owner = ownerId;
  loginUser.permissions = permissions;
  loginUser.isActive = staff.isActive;
  if (!staff.isActive || password) loginUser.refreshToken = null;
  if (password) loginUser.password = password;

  await staff.save();
  await loginUser.save();

  await createAuditLog({ req, action: "UPDATE", module: "STAFF", recordId: staff._id, oldData, newData: publicStaff(staff) });
  return successResponse(res, "Staff and login account updated successfully", publicStaff(staff));
});

exports.deleteStaff = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);
  const staff = await Staff.findOne({ _id: req.params.id, user: ownerId, isDeleted: false });
  if (!staff) return errorResponse(res, "Staff not found", 404);

  const oldData = publicStaff(staff);
  staff.isDeleted = true;
  staff.isActive = false;
  staff.status = "Inactive";
  await staff.save();

  await User.updateOne(
    { staffProfile: staff._id, owner: ownerId },
    { $set: { isActive: false, refreshToken: null } }
  );

  await createAuditLog({ req, action: "DELETE", module: "STAFF", recordId: staff._id, oldData, newData: publicStaff(staff) });
  return successResponse(res, "Staff account deactivated and history preserved");
});
