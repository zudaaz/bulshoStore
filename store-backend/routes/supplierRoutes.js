const express = require("express");
const router = express.Router();

const controller = require("../controllers/supplierController");

const { protect } = require("../middleware/authMiddleware");
const {
  authorizePermissions
} = require("../middleware/permissionMiddleware");

/* ALL ROUTES REQUIRE AUTH */
router.use(protect);

/* GET ALL SUPPLIERS */
router.get(
  "/",
  authorizePermissions(
    "view_suppliers",
    "manage_suppliers"
  ),
  controller.getSuppliers
);

/* SUPPLIER STATEMENT */
router.get(
  "/:id/statement",
  authorizePermissions(
    "view_suppliers",
    "manage_suppliers"
  ),
  controller.getSupplierStatement
);

/* GET SINGLE SUPPLIER */
router.get(
  "/:id",
  authorizePermissions(
    "view_suppliers",
    "manage_suppliers"
  ),
  controller.getSupplier
);

/* CREATE SUPPLIER */
router.post(
  "/",
  authorizePermissions(
    "create_supplier",
    "manage_suppliers"
  ),
  controller.createSupplier
);

/* UPDATE SUPPLIER */
router.put(
  "/:id",
  authorizePermissions(
    "edit_supplier",
    "manage_suppliers"
  ),
  controller.updateSupplier
);

/* DELETE SUPPLIER */
router.delete(
  "/:id",
  authorizePermissions(
    "delete_supplier",
    "manage_suppliers"
  ),
  controller.deleteSupplier
);

module.exports = router;