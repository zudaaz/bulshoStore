const express = require("express");
const router = express.Router();

const controller = require("../controllers/customerController");

const { protect } = require("../middleware/authMiddleware");
const {
  authorizePermissions
} = require("../middleware/permissionMiddleware");

/* =========================
   PROTECT ALL ROUTES
========================= */
router.use(protect);

/* =========================
   GET ALL CUSTOMERS
========================= */
router.get(
  "/",
  authorizePermissions(
    "view_customers",
    "manage_customers"
  ),
  controller.getCustomers
);

/* =========================
   CUSTOMER STATEMENT
   IMPORTANT:
   Must be before /:id
========================= */
router.get(
  "/:id/statement",
  authorizePermissions(
    "view_customers",
    "manage_customers"
  ),
  controller.getCustomerStatement
);

/* =========================
   GET SINGLE CUSTOMER
========================= */
router.get(
  "/:id",
  authorizePermissions(
    "view_customers",
    "manage_customers"
  ),
  controller.getCustomer
);

/* =========================
   CREATE CUSTOMER
========================= */
router.post(
  "/",
  authorizePermissions(
    "create_customer",
    "manage_customers"
  ),
  controller.createCustomer
);

/* =========================
   UPDATE CUSTOMER
========================= */
router.put(
  "/:id",
  authorizePermissions(
    "edit_customer",
    "manage_customers"
  ),
  controller.updateCustomer
);

/* =========================
   DELETE CUSTOMER
========================= */
router.delete(
  "/:id",
  authorizePermissions(
    "delete_customer",
    "manage_customers"
  ),
  controller.deleteCustomer
);

module.exports = router;