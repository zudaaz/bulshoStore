const Product = require("../models/Product");
const StockMovement = require("../models/StockMovement");
const StockAdjustment = require("../models/StockAdjustment");
const asyncHandler = require("../utils/asyncHandler");
const { successResponse, errorResponse } = require("../utils/apiResponse");
const { createAuditLog } = require("../middleware/auditMiddleware");
const { syncProductAlerts } = require("../services/notificationService");

function getOwnerId(req) {
  return req.storeOwner || req.user.owner || req.user._id;
}

function getImagePath(req) {
  return req.file ? `/uploads/${req.file.filename}` : undefined;
}

function text(value) {
  return String(value ?? "").trim();
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function optionalDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function validateNumericFields(body) {
  const nonNegative = [
    ["buyingPrice", body.buyingPrice],
    ["sellingPrice", body.sellingPrice],
    ["wholesalePrice", body.wholesalePrice],
    ["quantityInStock", body.quantityInStock],
    ["minimumStockLevel", body.minimumStockLevel]
  ];
  for (const [label, value] of nonNegative) {
    if (value !== undefined && (!Number.isFinite(Number(value)) || Number(value) < 0)) {
      return `${label} must be zero or greater`;
    }
  }
  for (const label of ["taxRate", "discountRate"]) {
    if (body[label] !== undefined && (!Number.isFinite(Number(body[label])) || Number(body[label]) < 0 || Number(body[label]) > 100)) {
      return `${label} must be between 0 and 100`;
    }
  }
  return null;
}

async function ensureUniqueCodes({ ownerId, productId = null, sku, barcode }) {
  if (sku) {
    const existing = await Product.findOne({ owner: ownerId, sku, isDeleted: false, ...(productId ? { _id: { $ne: productId } } : {}) });
    if (existing) return "SKU already exists";
  }
  if (barcode) {
    const existing = await Product.findOne({ owner: ownerId, barcode, isDeleted: false, ...(productId ? { _id: { $ne: productId } } : {}) });
    if (existing) return "Barcode already exists";
  }
  return null;
}

function validateDates(manufacturingDate, expiryDate) {
  if (manufacturingDate === undefined || expiryDate === undefined) return "Invalid manufacturing or expiry date";
  if (manufacturingDate && expiryDate && manufacturingDate > expiryDate) return "Manufacturing date cannot be after expiry date";
  return null;
}

function populateProduct(query) {
  return query
    .populate("category", "name")
    .populate("supplier", "name phone")
    .populate("createdBy", "name email");
}

exports.createProduct = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);
  const name = text(req.body.name);
  if (!name) return errorResponse(res, "Product name is required", 400);
  if (!req.body.category) return errorResponse(res, "Category is required", 400);

  const numericError = validateNumericFields(req.body);
  if (numericError) return errorResponse(res, numericError, 400);

  const sku = text(req.body.sku).toUpperCase();
  const barcode = text(req.body.barcode);
  const uniqueError = await ensureUniqueCodes({ ownerId, sku, barcode });
  if (uniqueError) return errorResponse(res, uniqueError, 400);

  const manufacturingDate = optionalDate(req.body.manufacturingDate);
  const expiryDate = optionalDate(req.body.expiryDate);
  const dateError = validateDates(manufacturingDate, expiryDate);
  if (dateError) return errorResponse(res, dateError, 400);

  let product = null;
  try {
    product = await Product.create({
      owner: ownerId,
      createdBy: req.user._id,
      name,
      sku,
      barcode,
      category: req.body.category,
      brand: text(req.body.brand),
      unit: text(req.body.unit) || "pcs",
      supplier: req.body.supplier || null,
      buyingPrice: number(req.body.buyingPrice),
      sellingPrice: number(req.body.sellingPrice),
      wholesalePrice: number(req.body.wholesalePrice),
      taxRate: number(req.body.taxRate),
      discountRate: number(req.body.discountRate),
      quantityInStock: number(req.body.quantityInStock),
      minimumStockLevel: number(req.body.minimumStockLevel, 5),
      shelfLocation: text(req.body.shelfLocation),
      batchNumber: text(req.body.batchNumber),
      manufacturingDate,
      expiryDate,
      description: text(req.body.description),
      status: req.body.status || "active",
      image: getImagePath(req) || ""
    });

    if (product.quantityInStock > 0) {
      await StockMovement.create({
        owner: ownerId,
        product: product._id,
        type: "IN",
        quantity: product.quantityInStock,
        previousStock: 0,
        newStock: product.quantityInStock,
        reason: "Opening stock",
        reference: String(product._id),
        createdBy: req.user._id
      });
    }
    await syncProductAlerts({ owner: ownerId, product }).catch(() => undefined);
  } catch (error) {
    if (product?._id) {
      await StockMovement.deleteMany({ owner: ownerId, product: product._id, reference: String(product._id) }).catch(() => undefined);
      await Product.deleteOne({ _id: product._id }).catch(() => undefined);
    }
    throw error;
  }

  await createAuditLog({ req, action: "CREATE", module: "PRODUCT", recordId: product._id, newData: product });
  const populated = await populateProduct(Product.findById(product._id));
  return successResponse(res, "Product created successfully", populated, 201);
});

exports.getProducts = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);
  const { search, category, supplier, status, lowStock, expired, expiring, page = 1, limit = 100, sort = "-createdAt" } = req.query;
  const query = { owner: ownerId, isDeleted: false };

  if (search) {
    const regex = { $regex: String(search), $options: "i" };
    query.$or = [{ name: regex }, { sku: regex }, { barcode: regex }, { brand: regex }, { batchNumber: regex }];
  }
  if (category) query.category = category;
  if (supplier) query.supplier = supplier;
  if (status) query.status = status;
  if (lowStock === "true") query.$expr = { $lte: ["$quantityInStock", "$minimumStockLevel"] };

  const now = new Date();
  if (expired === "true") query.expiryDate = { $ne: null, $lt: now };
  if (expiring === "true") query.expiryDate = { $gte: now, $lte: new Date(now.getTime() + 30 * 86400000) };

  const pageNumber = Math.max(Number(page) || 1, 1);
  const limitNumber = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const allowedSorts = new Set(["-createdAt", "createdAt", "name", "-name", "quantityInStock", "-quantityInStock", "expiryDate", "-expiryDate"]);
  const sortValue = allowedSorts.has(sort) ? sort : "-createdAt";

  const [products, total] = await Promise.all([
    populateProduct(Product.find(query)).sort(sortValue).skip((pageNumber - 1) * limitNumber).limit(limitNumber),
    Product.countDocuments(query)
  ]);

  return successResponse(res, "Products fetched successfully", { products, pagination: { total, page: pageNumber, pages: Math.ceil(total / limitNumber) } });
});

exports.getProduct = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);
  const product = await populateProduct(Product.findOne({ _id: req.params.id, owner: ownerId, isDeleted: false }));
  if (!product) return errorResponse(res, "Product not found", 404);
  return successResponse(res, "Product fetched successfully", product);
});

exports.updateProduct = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);
  const product = await Product.findOne({ _id: req.params.id, owner: ownerId, isDeleted: false });
  if (!product) return errorResponse(res, "Product not found", 404);

  const numericError = validateNumericFields(req.body);
  if (numericError) return errorResponse(res, numericError, 400);

  const sku = req.body.sku !== undefined ? text(req.body.sku).toUpperCase() : product.sku;
  const barcode = req.body.barcode !== undefined ? text(req.body.barcode) : product.barcode;
  const uniqueError = await ensureUniqueCodes({ ownerId, productId: product._id, sku, barcode });
  if (uniqueError) return errorResponse(res, uniqueError, 400);

  const manufacturingDate = req.body.manufacturingDate !== undefined ? optionalDate(req.body.manufacturingDate) : product.manufacturingDate;
  const expiryDate = req.body.expiryDate !== undefined ? optionalDate(req.body.expiryDate) : product.expiryDate;
  const dateError = validateDates(manufacturingDate, expiryDate);
  if (dateError) return errorResponse(res, dateError, 400);

  const oldData = product.toObject();
  const rollbackData = { ...oldData };
  delete rollbackData._id;
  delete rollbackData.__v;
  const oldStock = Number(product.quantityInStock || 0);
  const fields = {
    name: req.body.name !== undefined ? text(req.body.name) : product.name,
    category: req.body.category ?? product.category,
    sku,
    barcode,
    brand: req.body.brand !== undefined ? text(req.body.brand) : product.brand,
    unit: req.body.unit !== undefined ? text(req.body.unit) || "pcs" : product.unit,
    supplier: req.body.supplier !== undefined ? req.body.supplier || null : product.supplier,
    buyingPrice: req.body.buyingPrice !== undefined ? number(req.body.buyingPrice) : product.buyingPrice,
    sellingPrice: req.body.sellingPrice !== undefined ? number(req.body.sellingPrice) : product.sellingPrice,
    wholesalePrice: req.body.wholesalePrice !== undefined ? number(req.body.wholesalePrice) : product.wholesalePrice,
    taxRate: req.body.taxRate !== undefined ? number(req.body.taxRate) : product.taxRate,
    discountRate: req.body.discountRate !== undefined ? number(req.body.discountRate) : product.discountRate,
    quantityInStock: req.body.quantityInStock !== undefined ? number(req.body.quantityInStock) : product.quantityInStock,
    minimumStockLevel: req.body.minimumStockLevel !== undefined ? number(req.body.minimumStockLevel) : product.minimumStockLevel,
    shelfLocation: req.body.shelfLocation !== undefined ? text(req.body.shelfLocation) : product.shelfLocation,
    batchNumber: req.body.batchNumber !== undefined ? text(req.body.batchNumber) : product.batchNumber,
    manufacturingDate,
    expiryDate,
    description: req.body.description !== undefined ? text(req.body.description) : product.description,
    status: req.body.status ?? product.status
  };

  if (!fields.name) return errorResponse(res, "Product name is required", 400);
  Object.assign(product, fields);
  product.createdBy = product.createdBy || req.user._id;
  const imagePath = getImagePath(req);
  if (imagePath) product.image = imagePath;

  let movement = null;
  try {
    await product.save();
    const newStock = Number(product.quantityInStock || 0);
    if (newStock !== oldStock) {
      movement = await StockMovement.create({
        owner: ownerId,
        product: product._id,
        type: newStock > oldStock ? "IN" : "OUT",
        quantity: Math.abs(newStock - oldStock),
        previousStock: oldStock,
        newStock,
        reason: "Stock updated from product edit",
        reference: String(product._id),
        createdBy: req.user._id
      });
    }
    await syncProductAlerts({ owner: ownerId, product }).catch(() => undefined);
  } catch (error) {
    await Product.updateOne({ _id: product._id, owner: ownerId }, { $set: rollbackData }).catch(() => undefined);
    if (movement?._id) await StockMovement.deleteOne({ _id: movement._id }).catch(() => undefined);
    throw error;
  }

  await createAuditLog({ req, action: "UPDATE", module: "PRODUCT", recordId: product._id, oldData, newData: product });
  const updated = await populateProduct(Product.findById(product._id));
  return successResponse(res, "Product updated successfully", updated);
});

exports.deleteProduct = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);
  const product = await Product.findOne({ _id: req.params.id, owner: ownerId, isDeleted: false });
  if (!product) return errorResponse(res, "Product not found", 404);
  const oldData = product.toObject();
  product.isDeleted = true;
  product.status = "inactive";
  await product.save();
  await syncProductAlerts({ owner: ownerId, product }).catch(() => undefined);
  await createAuditLog({ req, action: "DELETE", module: "PRODUCT", recordId: product._id, oldData, newData: product });
  return successResponse(res, "Product archived successfully");
});

exports.adjustStock = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);
  const { adjustmentType, quantity: rawQuantity, reason = "" } = req.body;
  const quantity = Number(rawQuantity);
  if (!["increase", "decrease"].includes(adjustmentType)) return errorResponse(res, "Invalid adjustment type", 400);
  if (!Number.isFinite(quantity) || quantity <= 0) return errorResponse(res, "Valid quantity is required", 400);
  if (!text(reason)) return errorResponse(res, "Adjustment reason is required", 400);

  const product = await Product.findOne({ _id: req.params.id, owner: ownerId, isDeleted: false });
  if (!product) return errorResponse(res, "Product not found", 404);

  const oldStock = Number(product.quantityInStock || 0);
  const newStock = adjustmentType === "increase" ? oldStock + quantity : oldStock - quantity;
  if (newStock < 0) return errorResponse(res, "Not enough stock to decrease", 400);

  product.quantityInStock = newStock;
  let adjustment = null;
  let movement = null;
  try {
    await product.save();
    adjustment = await StockAdjustment.create({ owner: ownerId, product: product._id, adjustmentType, quantity, reason: text(reason), oldStock, newStock, adjustedBy: req.user._id });
    movement = await StockMovement.create({ owner: ownerId, product: product._id, type: "ADJUSTMENT", quantity, previousStock: oldStock, newStock, reason: text(reason), reference: String(adjustment._id), createdBy: req.user._id });
    await syncProductAlerts({ owner: ownerId, product }).catch(() => undefined);
  } catch (error) {
    await Product.updateOne({ _id: product._id, owner: ownerId }, { $set: { quantityInStock: oldStock } }).catch(() => undefined);
    if (adjustment?._id) await StockAdjustment.deleteOne({ _id: adjustment._id }).catch(() => undefined);
    if (movement?._id) await StockMovement.deleteOne({ _id: movement._id }).catch(() => undefined);
    throw error;
  }

  await createAuditLog({ req, action: "UPDATE", module: "INVENTORY", recordId: product._id, oldData: { stock: oldStock }, newData: { stock: newStock, reason: text(reason) } });
  return successResponse(res, "Stock adjusted successfully", { product, adjustment });
});

exports.getLowStockProducts = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);
  const products = await Product.find({ owner: ownerId, isDeleted: false, status: "active", $expr: { $lte: ["$quantityInStock", "$minimumStockLevel"] } }).populate("category", "name").sort({ quantityInStock: 1 });
  return successResponse(res, "Low stock products fetched", products);
});

exports.getStockMovements = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);
  const product = await Product.findOne({ _id: req.params.id, owner: ownerId, isDeleted: false });
  if (!product) return errorResponse(res, "Product not found", 404);
  const movements = await StockMovement.find({ owner: ownerId, product: product._id }).populate("product", "name sku barcode").populate("createdBy", "name email").sort({ createdAt: -1 });
  return successResponse(res, "Stock movements fetched", movements);
});
