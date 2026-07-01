const express = require("express");
const router = express.Router();

const purchaseController = require("../controllers/purchaseController");

const { protect } = require("../middleware/authMiddleware");
const {
  authorizePermissions
} = require("../middleware/permissionMiddleware");

/* ALL PURCHASE ROUTES REQUIRE LOGIN */
router.use(protect);

/* CREATE PURCHASE */
router.post(
  "/",
  authorizePermissions(
    "create_purchase",
    "manage_purchases"
  ),
  purchaseController.createPurchase
);

/* GET ALL PURCHASES */
router.get(
  "/",
  authorizePermissions(
    "view_purchases",
    "manage_purchases"
  ),
  purchaseController.getPurchases
);

/* GET SINGLE PURCHASE */
router.get(
  "/:id",
  authorizePermissions(
    "view_purchases",
    "manage_purchases"
  ),
  purchaseController.getPurchase
);

/* UPDATE PURCHASE */
router.put(
  "/:id",
  authorizePermissions(
    "manage_purchases"
  ),
  purchaseController.updatePurchase
);


/* RETURN PURCHASE AND REVERSE STOCK */
router.post(
  "/:id/return",
  authorizePermissions("delete_purchase", "manage_purchases"),
  purchaseController.returnPurchase
);

/* DELETE PURCHASE */
router.delete(
  "/:id",
  authorizePermissions(
    "delete_purchase",
    "manage_purchases"
  ),
  purchaseController.deletePurchase
);

module.exports = router;