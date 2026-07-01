const AuditLog = require("../models/AuditLog");

function getOwnerId(req) {
  return req.storeOwner || req.user?.owner || req.user?._id || null;
}

exports.createAuditLog = async ({
  req,
  action,
  module,
  recordId = null,
  oldData = null,
  newData = null
}) => {
  try {
    await AuditLog.create({
      owner: getOwnerId(req),

      user: req.user?._id || null,
      userName: req.user?.name || "",

      action,
      module,
      recordId,

      oldData,
      newData,

      ipAddress: req.ip || "",
      userAgent: req.headers?.["user-agent"] || ""
    });
  } catch (error) {
    console.error("Audit log failed:", error.message);
  }
};