const express = require("express");
const router = express.Router();

const controller = require("../controllers/subscriptionController");

const { protect } = require("../middleware/authMiddleware");
const { authorizePermissions } = require("../middleware/permissionMiddleware");

router.use(protect);

router.get(
  "/overview",
  authorizePermissions("manage_settings", "view_reports"),
  controller.getSubscriptionOverview
);

router.post(
  "/",
  authorizePermissions("manage_settings"),
  controller.createSubscription
);

router.put(
  "/:id/renew",
  authorizePermissions("manage_settings"),
  controller.renewSubscription
);

router.put(
  "/:id/cancel",
  authorizePermissions("manage_settings"),
  controller.cancelSubscription
);

router.delete(
  "/:id",
  authorizePermissions("manage_settings"),
  controller.deleteSubscription
);

module.exports = router;