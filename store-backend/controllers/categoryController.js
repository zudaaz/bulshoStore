const Category = require("../models/Category");
const Product = require("../models/Product");

const asyncHandler = require("../utils/asyncHandler");
const { successResponse, errorResponse } = require("../utils/apiResponse");
const { createAuditLog } = require("../middleware/auditMiddleware");

function getOwnerId(req) {
  return req.storeOwner || req.user.owner || req.user._id;
}

/* CREATE CATEGORY */
exports.createCategory = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);

  if (!req.body.name || !req.body.name.trim()) {
    return errorResponse(res, "Category name is required", 400);
  }

  const name = req.body.name.trim();

  const existingCategory = await Category.findOne({
    owner: ownerId,
    name,
    isDeleted: false
  });

  if (existingCategory) {
    return errorResponse(res, "Category already exists", 400);
  }

  const category = await Category.create({
    owner: ownerId,
    createdBy: req.user._id,
    name,
    description: req.body.description || "",
    image: req.body.image || "",
    status: req.body.status || "active"
  });

  await createAuditLog({
    req,
    action: "CREATE",
    module: "CATEGORY",
    recordId: category._id,
    newData: category
  });

  return successResponse(
    res,
    "Category created successfully",
    category,
    201
  );
});

/* GET CATEGORIES */
exports.getCategories = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);

  const { search, status } = req.query;

  const query = {
    owner: ownerId,
    isDeleted: false
  };

  if (status) {
    query.status = status;
  }

  if (search) {
    query.$or = [
      {
        name: {
          $regex: search,
          $options: "i"
        }
      },
      {
        description: {
          $regex: search,
          $options: "i"
        }
      }
    ];
  }

  const categories = await Category.find(query)
    .populate("createdBy", "name email")
    .sort({ createdAt: -1 });

  return successResponse(
    res,
    "Categories fetched successfully",
    categories
  );
});

/* GET SINGLE CATEGORY */
exports.getCategory = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);

  const category = await Category.findOne({
    _id: req.params.id,
    owner: ownerId,
    isDeleted: false
  }).populate("createdBy", "name email");

  if (!category) {
    return errorResponse(res, "Category not found", 404);
  }

  return successResponse(
    res,
    "Category fetched successfully",
    category
  );
});

/* UPDATE CATEGORY */
exports.updateCategory = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);

  const category = await Category.findOne({
    _id: req.params.id,
    owner: ownerId,
    isDeleted: false
  });

  if (!category) {
    return errorResponse(res, "Category not found", 404);
  }

  const oldData = category.toObject();

  if (
    req.body.name &&
    req.body.name.trim() !== category.name
  ) {
    const existingCategory = await Category.findOne({
      _id: { $ne: category._id },
      owner: ownerId,
      name: req.body.name.trim(),
      isDeleted: false
    });

    if (existingCategory) {
      return errorResponse(res, "Category name already exists", 400);
    }
  }

  category.name = req.body.name?.trim() ?? category.name;
  category.description =
    req.body.description ?? category.description;
  category.image = req.body.image ?? category.image;
  category.status = req.body.status ?? category.status;
  category.owner = ownerId;
  category.createdBy = category.createdBy || req.user._id;

  await category.save();

  await createAuditLog({
    req,
    action: "UPDATE",
    module: "CATEGORY",
    recordId: category._id,
    oldData,
    newData: category
  });

  return successResponse(
    res,
    "Category updated successfully",
    category
  );
});

/* DELETE CATEGORY */
exports.deleteCategory = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);

  const category = await Category.findOne({
    _id: req.params.id,
    owner: ownerId,
    isDeleted: false
  });

  if (!category) {
    return errorResponse(res, "Category not found", 404);
  }

  const productCount = await Product.countDocuments({
    owner: ownerId,
    category: category._id,
    isDeleted: false
  });

  if (productCount > 0) {
    return errorResponse(
      res,
      "Cannot delete category because it has products",
      400
    );
  }

  const oldData = category.toObject();

  category.isDeleted = true;
  category.status = "inactive";

  await category.save();

  await createAuditLog({
    req,
    action: "DELETE",
    module: "CATEGORY",
    recordId: category._id,
    oldData
  });

  return successResponse(
    res,
    "Category deleted successfully"
  );
});