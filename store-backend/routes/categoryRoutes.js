const express = require("express");
const router = express.Router();

const {
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
  deleteCategory
} = require("../controllers/categoryController");

const { protect } = require("../middleware/authMiddleware");
const {
  authorizePermissions
} = require("../middleware/permissionMiddleware");

/* PROTECT ALL ROUTES */
router.use(protect);

/* GET ALL CATEGORIES */
router.get(
  "/",
  authorizePermissions(
    "view_categories",
    "manage_categories"
  ),
  getCategories
);

/* GET SINGLE CATEGORY */
router.get(
  "/:id",
  authorizePermissions(
    "view_categories",
    "manage_categories"
  ),
  getCategory
);

/* CREATE CATEGORY */
router.post(
  "/",
  authorizePermissions(
    "create_category",
    "manage_categories"
  ),
  createCategory
);

/* UPDATE CATEGORY */
router.put(
  "/:id",
  authorizePermissions(
    "edit_category",
    "manage_categories"
  ),
  updateCategory
);

/* DELETE CATEGORY */
router.delete(
  "/:id",
  authorizePermissions(
    "delete_category",
    "manage_categories"
  ),
  deleteCategory
);

module.exports = router;