const express = require("express");
const controller = require("../controllers/notificationController");
const { protect } = require("../middleware/authMiddleware");
const { authorizePermissions } = require("../middleware/permissionMiddleware");

const router = express.Router();
router.use(protect);

router.get("/", controller.getNotifications);
router.post("/", authorizePermissions("manage_settings"), controller.createNotification);
router.put("/mark-all-read", controller.markAllAsRead);
router.put("/:id/read", controller.markAsRead);
router.delete("/:id", controller.deleteNotification);

module.exports = router;
