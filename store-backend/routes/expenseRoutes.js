const express = require("express");
const router = express.Router();
const controller = require("../controllers/expenseController");
const { protect } = require("../middleware/authMiddleware");
const { authorizePermissions } = require("../middleware/permissionMiddleware");

router.use(protect);
router.get("/", authorizePermissions("view_expenses", "manage_expenses"), controller.getExpenses);
router.get("/:id", authorizePermissions("view_expenses", "manage_expenses"), controller.getExpense);
router.post("/", authorizePermissions("create_expense", "manage_expenses"), controller.createExpense);
router.put("/:id", authorizePermissions("edit_expense", "manage_expenses"), controller.updateExpense);
router.delete("/:id", authorizePermissions("delete_expense", "manage_expenses"), controller.deleteExpense);

module.exports = router;
