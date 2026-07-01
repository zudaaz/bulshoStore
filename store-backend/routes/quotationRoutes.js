const express = require("express");
const router = express.Router();
const controller = require("../controllers/quotationController");
const { protect } = require("../middleware/authMiddleware");
const { authorizePermissions } = require("../middleware/permissionMiddleware");

router.use(protect);
router.get("/", authorizePermissions("view_sales", "manage_sales"), controller.getQuotations);
router.get("/:id", authorizePermissions("view_sales", "manage_sales"), controller.getQuotation);
router.post("/", authorizePermissions("create_sale", "manage_sales"), controller.createQuotation);
router.put("/:id", authorizePermissions("create_sale", "manage_sales"), controller.updateQuotation);
router.delete("/:id", authorizePermissions("delete_sale", "manage_sales"), controller.deleteQuotation);

module.exports = router;
