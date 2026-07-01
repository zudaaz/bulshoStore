const express = require("express");
const router = express.Router();
const controller = require("../controllers/staffAttendanceController");
const { protect } = require("../middleware/authMiddleware");
const { authorizePermissions } = require("../middleware/permissionMiddleware");

router.use(protect, authorizePermissions("manage_staff", "manage_attendance"));
router.get("/", controller.getAttendance);
router.post("/", controller.markAttendance);
router.delete("/:id", controller.deleteAttendance);

module.exports = router;
