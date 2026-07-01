const express = require("express");
const router = express.Router();

const productController = require("../controllers/productController");

const { protect } = require("../middleware/authMiddleware");
const { authorizePermissions } = require("../middleware/permissionMiddleware");

const upload = require("../config/upload");
const validate = require("../middleware/validateMiddleware");

const {
  createProductValidator,
  stockAdjustmentValidator
} = require("../validators/productValidator");

/* LOW STOCK ALERTS */
router.get(
  "/alerts/low-stock",
  protect,
  authorizePermissions("view_low_stock", "manage_inventory"),
  productController.getLowStockProducts
);

/* GET ALL PRODUCTS */
router.get(
  "/",
  protect,
  authorizePermissions("view_products", "manage_products"),
  productController.getProducts
);

/* CREATE PRODUCT */
router.post(
  "/",
  protect,
  authorizePermissions("create_product", "manage_products"),
  upload.single("image"),
  createProductValidator,
  validate,
  productController.createProduct
);

/* GET SINGLE PRODUCT */
router.get(
  "/:id",
  protect,
  authorizePermissions("view_products", "manage_products"),
  productController.getProduct
);

/* UPDATE PRODUCT */
router.put(
  "/:id",
  protect,
  authorizePermissions("edit_product", "manage_products"),
  upload.single("image"),
  productController.updateProduct
);

/* DELETE PRODUCT */
router.delete(
  "/:id",
  protect,
  authorizePermissions("delete_product", "manage_products"),
  productController.deleteProduct
);

/* STOCK ADJUSTMENT */
router.patch(
  "/:id/stock-adjustment",
  protect,
  authorizePermissions("adjust_stock", "manage_inventory"),
  stockAdjustmentValidator,
  validate,
  productController.adjustStock
);

/* PRODUCT STOCK MOVEMENTS */
router.get(
  "/:id/stock-movements",
  protect,
  authorizePermissions("view_stock_report", "manage_inventory"),
  productController.getStockMovements
);

module.exports = router;