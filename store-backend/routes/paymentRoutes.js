const express = require("express");
const router = express.Router();

const paymentController = require("../controllers/paymentController");

const { protect } = require("../middleware/authMiddleware");
const {
  authorizePermissions
} = require("../middleware/permissionMiddleware");

/* ALL ROUTES REQUIRE LOGIN */
router.use(protect);

/* GET ALL PAYMENTS */
router.get(
  "/",
  authorizePermissions(
    "view_reports",
    "manage_customers",
    "manage_suppliers"
  ),
  paymentController.getPayments
);

/* GET SINGLE PAYMENT */
router.get(
  "/:id",
  authorizePermissions(
    "view_reports",
    "manage_customers",
    "manage_suppliers"
  ),
  paymentController.getPayment
);

/* CREATE PAYMENT */
router.post(
  "/",
  authorizePermissions(
    "manage_customers",
    "manage_suppliers"
  ),
  paymentController.createPayment
);

/* CUSTOMER CREDIT */
router.post(
  "/customer-credit",
  authorizePermissions(
    "manage_customers"
  ),
  paymentController.customerCredit
);

/* DELETE PAYMENT */
router.delete(
  "/:id",
  authorizePermissions(
    "manage_customers",
    "manage_suppliers"
  ),
  paymentController.deletePayment
);

module.exports = router;