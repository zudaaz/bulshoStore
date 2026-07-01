const express = require("express");
const router = express.Router();

const controller = require("../controllers/dashboardController");

const { protect } = require("../middleware/authMiddleware");
const { authorizePermissions } = require("../middleware/permissionMiddleware");

/* DASHBOARD SUMMARY */
router.get(
  "/summary",
  protect,
  authorizePermissions("view_dashboard"),
  controller.summary
);

/* DASHBOARD CHARTS */
router.get(
  "/charts",
  protect,
  authorizePermissions("view_dashboard"),
  controller.charts
);

/* RECENT ACTIVITIES */
router.get(
  "/recent-activities",
  protect,
  authorizePermissions("view_dashboard"),
  controller.recentActivities
);

module.exports = router;