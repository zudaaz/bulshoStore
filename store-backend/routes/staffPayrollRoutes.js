const express = require("express");
const router = express.Router();
const controller = require("../controllers/staffPayrollController");
const { protect } = require("../middleware/authMiddleware");
const { authorizePermissions } = require("../middleware/permissionMiddleware");

router.use(protect, authorizePermissions("manage_staff", "manage_payroll"));
router.get("/", controller.getPayroll);
router.post("/", controller.createPayroll);
router.put("/:id", controller.updatePayroll);
router.delete("/:id", controller.deletePayroll);

module.exports = router;
