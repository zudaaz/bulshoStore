const express = require("express");
const router = express.Router();

const auditController = require("../controllers/auditController");
const { protect } = require("../middleware/authMiddleware");
const { authorizePermissions } = require("../middleware/permissionMiddleware");

router.get(
  "/",
  protect,
  authorizePermissions("view_audit_logs"),
  auditController.getAuditLogs
);

module.exports = router;