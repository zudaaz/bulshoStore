const express = require("express");
const { getSettings, updateSettings } = require("../controllers/settingController");
const upload = require("../config/upload");
const { protect } = require("../middleware/authMiddleware");
const { authorizePermissions } = require("../middleware/permissionMiddleware");

const router = express.Router();

router.use(protect, authorizePermissions("manage_settings"));
router.get("/", getSettings);
router.put("/", upload.single("logo"), updateSettings);

module.exports = router;
