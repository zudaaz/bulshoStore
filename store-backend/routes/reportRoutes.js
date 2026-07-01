const express = require("express");
const router = express.Router();

const controller = require("../controllers/reportController");

const { protect } = require("../middleware/authMiddleware");
const { authorizePermissions } = require("../middleware/permissionMiddleware");

/* SALES REPORT */
router.get(
  "/sales",
  protect,
  authorizePermissions("view_reports"),
  controller.salesReport
);

/* PURCHASE REPORT */
router.get(
  "/purchases",
  protect,
  authorizePermissions("view_reports"),
  controller.purchaseReport
);

/* EXPENSE REPORT */
router.get(
  "/expenses",
  protect,
  authorizePermissions("view_reports"),
  controller.expenseReport
);

/* PROFIT & LOSS */
router.get(
  "/profit-loss",
  protect,
  authorizePermissions("view_reports"),
  controller.profitLossReport
);

/* STOCK REPORT */
router.get(
  "/stock",
  protect,
  authorizePermissions("view_reports"),
  controller.stockReport
);

/* CUSTOMER BALANCES */
router.get(
  "/customer-balances",
  protect,
  authorizePermissions("view_reports"),
  controller.customerBalanceReport
);

/* SUPPLIER BALANCES */
router.get(
  "/supplier-balances",
  protect,
  authorizePermissions("view_reports"),
  controller.supplierBalanceReport
);

/* EXPORT SALES PDF */
router.get(
  "/export/sales/pdf",
  protect,
  authorizePermissions("export_reports", "view_reports"),
  controller.exportSalesPDF
);

/* EXPORT SALES EXCEL */
router.get(
  "/export/sales/excel",
  protect,
  authorizePermissions("export_reports", "view_reports"),
  controller.exportSalesExcel
);

module.exports = router;