const express = require("express");
const router = express.Router();

const saleController = require("../controllers/saleController");

const { protect } = require("../middleware/authMiddleware");
const { authorizePermissions } = require("../middleware/permissionMiddleware");

const validate = require("../middleware/validateMiddleware");
const { createSaleValidator } = require("../validators/saleValidator");

/* GET ALL SALES */
router.get(
  "/",
  protect,
  authorizePermissions(
    "view_sales",
    "manage_sales"
  ),
  saleController.getSales
);

/* GET SINGLE SALE */
router.get(
  "/:id",
  protect,
  authorizePermissions(
    "view_sales",
    "manage_sales"
  ),
  saleController.getSale
);

/* CREATE SALE */
router.post(
  "/",
  protect,
  authorizePermissions(
    "create_sale",
    "manage_sales"
  ),
  createSaleValidator,
  validate,
  saleController.createSale
);

/* VOID SALE */
router.post(
  "/:id/void",
  protect,
  authorizePermissions(
    "delete_sale",
    "manage_sales"
  ),
  saleController.voidSale
);

/* RETURN SALE */
router.post(
  "/:id/return",
  protect,
  authorizePermissions(
    "delete_sale",
    "manage_sales"
  ),
  saleController.returnSale
);

/* PRINT RECEIPT */
router.get(
  "/:id/receipt",
  protect,
  authorizePermissions(
    "print_receipt",
    "manage_sales"
  ),
  saleController.getReceipt
);

module.exports = router;