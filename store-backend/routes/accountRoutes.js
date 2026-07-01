const express = require("express");
const router = express.Router();
const controller = require("../controllers/accountController");
const { protect } = require("../middleware/authMiddleware");
const { authorizePermissions } = require("../middleware/permissionMiddleware");

router.use(protect, authorizePermissions("manage_accounts", "manage_expenses", "view_reports"));
router.get("/", controller.getAccounts);
router.post("/", controller.createAccount);
router.put("/:id", controller.updateAccount);
router.delete("/:id", controller.deleteAccount);

module.exports = router;
