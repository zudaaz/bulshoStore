const express = require("express");
const router = express.Router();
const { sendCustomerSMS } = require("../controllers/smsController");
const { protect } = require("../middleware/authMiddleware");
const { authorizePermissions } = require("../middleware/permissionMiddleware");

router.post("/send", protect, authorizePermissions("manage_customers", "view_customers"), sendCustomerSMS);

module.exports = router;
