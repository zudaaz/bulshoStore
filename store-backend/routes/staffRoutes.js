const express = require("express");
const router = express.Router();
const staffController = require("../controllers/staffController");
const { protect } = require("../middleware/authMiddleware");
const { authorizePermissions } = require("../middleware/permissionMiddleware");

router.use(protect, authorizePermissions("manage_staff"));
router.get("/", staffController.getStaff);
router.get("/:id", staffController.getSingleStaff);
router.post("/", staffController.createStaff);
router.put("/:id", staffController.updateStaff);
router.delete("/:id", staffController.deleteStaff);

module.exports = router;
