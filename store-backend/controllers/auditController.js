const AuditLog = require("../models/AuditLog");
const asyncHandler = require("../utils/asyncHandler");
const { successResponse } = require("../utils/apiResponse");

exports.getAuditLogs = asyncHandler(async (req, res) => {
  const logs = await AuditLog.find()
    .populate("user", "name email role")
    .sort({ createdAt: -1 });

  return successResponse(res, "Audit logs fetched successfully", logs);
});