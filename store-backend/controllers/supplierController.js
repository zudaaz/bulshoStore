const Supplier = require("../models/Supplier");
const Purchase = require("../models/Purchase");

const asyncHandler = require("../utils/asyncHandler");
const { successResponse, errorResponse } = require("../utils/apiResponse");
const { createAuditLog } = require("../middleware/auditMiddleware");

function getOwnerId(req) {
  return req.storeOwner || req.user.owner || req.user._id;
}

/* CREATE SUPPLIER */
exports.createSupplier = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);

  if (!req.body.name || !req.body.name.trim()) {
    return errorResponse(res, "Supplier name is required", 400);
  }

  const name = req.body.name.trim();

  const existingSupplier = await Supplier.findOne({
    owner: ownerId,
    name,
    isDeleted: false
  });

  if (existingSupplier) {
    return errorResponse(
      res,
      "Supplier with this name already exists",
      400
    );
  }

  const openingBalance = Number(req.body.openingBalance || 0);

  const supplier = await Supplier.create({
    owner: ownerId,
    createdBy: req.user._id,

    name,
    phone: req.body.phone || "",
    email: req.body.email || "",
    address: req.body.address || "",

    openingBalance,
    currentBalance:
      req.body.currentBalance !== undefined
        ? Number(req.body.currentBalance || 0)
        : openingBalance,

    totalPurchases: Number(req.body.totalPurchases || 0),
    totalPaid: Number(req.body.totalPaid || 0),

    contactPerson: req.body.contactPerson || "",
    companyName: req.body.companyName || "",
    notes: req.body.notes || "",

    status: req.body.status || "active"
  });

  await createAuditLog({
    req,
    action: "CREATE",
    module: "SUPPLIER",
    recordId: supplier._id,
    newData: supplier
  });

  return successResponse(
    res,
    "Supplier created successfully",
    supplier,
    201
  );
});

/* GET ALL SUPPLIERS */
exports.getSuppliers = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);

  const { search, status } = req.query;

  const query = {
    owner: ownerId,
    isDeleted: false
  };

  if (status) query.status = status;

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { companyName: { $regex: search, $options: "i" } }
    ];
  }

  const suppliers = await Supplier.find(query)
    .populate("createdBy", "name email")
    .sort({ createdAt: -1 });

  return successResponse(
    res,
    "Suppliers fetched successfully",
    suppliers
  );
});

/* GET SINGLE SUPPLIER */
exports.getSupplier = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);

  const supplier = await Supplier.findOne({
    _id: req.params.id,
    owner: ownerId,
    isDeleted: false
  }).populate("createdBy", "name email");

  if (!supplier) {
    return errorResponse(res, "Supplier not found", 404);
  }

  return successResponse(
    res,
    "Supplier fetched successfully",
    supplier
  );
});

/* UPDATE SUPPLIER */
exports.updateSupplier = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);

  const supplier = await Supplier.findOne({
    _id: req.params.id,
    owner: ownerId,
    isDeleted: false
  });

  if (!supplier) {
    return errorResponse(res, "Supplier not found", 404);
  }

  const oldData = supplier.toObject();

  if (req.body.name && req.body.name.trim() !== supplier.name) {
    const existingSupplier = await Supplier.findOne({
      owner: ownerId,
      name: req.body.name.trim(),
      isDeleted: false,
      _id: { $ne: supplier._id }
    });

    if (existingSupplier) {
      return errorResponse(
        res,
        "Supplier with this name already exists",
        400
      );
    }
  }

  supplier.name = req.body.name?.trim() ?? supplier.name;
  supplier.phone = req.body.phone ?? supplier.phone;
  supplier.email = req.body.email ?? supplier.email;
  supplier.address = req.body.address ?? supplier.address;

  supplier.openingBalance = Number(
    req.body.openingBalance ?? supplier.openingBalance
  );

  supplier.currentBalance = Number(
    req.body.currentBalance ?? supplier.currentBalance
  );

  supplier.totalPurchases = Number(
    req.body.totalPurchases ?? supplier.totalPurchases
  );

  supplier.totalPaid = Number(
    req.body.totalPaid ?? supplier.totalPaid
  );

  supplier.contactPerson =
    req.body.contactPerson ?? supplier.contactPerson;

  supplier.companyName =
    req.body.companyName ?? supplier.companyName;

  supplier.notes = req.body.notes ?? supplier.notes;
  supplier.status = req.body.status ?? supplier.status;

  supplier.owner = ownerId;
  supplier.createdBy = supplier.createdBy || req.user._id;

  await supplier.save();

  await createAuditLog({
    req,
    action: "UPDATE",
    module: "SUPPLIER",
    recordId: supplier._id,
    oldData,
    newData: supplier
  });

  return successResponse(
    res,
    "Supplier updated successfully",
    supplier
  );
});

/* DELETE SUPPLIER */
exports.deleteSupplier = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);

  const supplier = await Supplier.findOne({
    _id: req.params.id,
    owner: ownerId,
    isDeleted: false
  });

  if (!supplier) {
    return errorResponse(res, "Supplier not found", 404);
  }

  const purchaseCount = await Purchase.countDocuments({
    owner: ownerId,
    supplier: supplier._id,
    isDeleted: false
  });

  if (purchaseCount > 0) {
    return errorResponse(
      res,
      "Cannot delete supplier because this supplier has purchase history",
      400
    );
  }

  if (Number(supplier.currentBalance || 0) > 0) {
    return errorResponse(
      res,
      "Cannot delete supplier because this supplier has outstanding balance",
      400
    );
  }

  const oldData = supplier.toObject();

  supplier.isDeleted = true;
  supplier.status = "inactive";

  await supplier.save();

  await createAuditLog({
    req,
    action: "DELETE",
    module: "SUPPLIER",
    recordId: supplier._id,
    oldData
  });

  return successResponse(
    res,
    "Supplier deleted successfully"
  );
});

/* SUPPLIER STATEMENT */
exports.getSupplierStatement = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);

  const supplier = await Supplier.findOne({
    _id: req.params.id,
    owner: ownerId,
    isDeleted: false
  });

  if (!supplier) {
    return errorResponse(res, "Supplier not found", 404);
  }

  const purchases = await Purchase.find({
    owner: ownerId,
    supplier: supplier._id,
    isDeleted: false
  }).sort({ createdAt: -1 });

  return successResponse(
    res,
    "Supplier statement fetched successfully",
    {
      supplier,
      summary: {
        totalPurchases: supplier.totalPurchases || 0,
        totalPaid: supplier.totalPaid || 0,
        balance: supplier.currentBalance || 0
      },
      purchases
    }
  );
});