const crypto = require("crypto");
const Quotation = require("../models/Quotation");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const asyncHandler = require("../utils/asyncHandler");
const { successResponse, errorResponse } = require("../utils/apiResponse");
const { createAuditLog } = require("../middleware/auditMiddleware");

function ownerId(req) {
  return req.storeOwner || req.user.owner || req.user._id;
}

function createNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `QUO-${date}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

async function prepareItems(items, owner) {
  if (!Array.isArray(items) || items.length === 0) {
    throw Object.assign(new Error("At least one quotation item is required"), { statusCode: 400 });
  }

  const prepared = [];
  let subtotal = 0;
  for (const item of items) {
    const quantity = Number(item.quantity);
    if (!item.product || !Number.isFinite(quantity) || quantity <= 0) {
      throw Object.assign(new Error("Every item requires a product and positive quantity"), { statusCode: 400 });
    }

    const product = await Product.findOne({
      _id: item.product,
      owner,
      isDeleted: false,
      status: "active"
    }).lean();
    if (!product) {
      throw Object.assign(new Error("One or more quotation products were not found"), { statusCode: 404 });
    }

    const unitPrice = item.unitPrice === undefined
      ? Number(product.sellingPrice || 0)
      : Number(item.unitPrice);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw Object.assign(new Error("Unit price cannot be negative"), { statusCode: 400 });
    }

    const total = quantity * unitPrice;
    prepared.push({
      product: product._id,
      productName: product.name,
      quantity,
      unitPrice,
      total
    });
    subtotal += total;
  }

  return { items: prepared, subtotal };
}

async function preparePayload(req, existing = null) {
  const owner = ownerId(req);
  const body = req.body || {};
  const sourceItems = body.items ?? existing?.items ?? [];
  const prepared = await prepareItems(sourceItems, owner);
  const discount = Number(body.discount ?? existing?.discount ?? 0);
  const tax = Number(body.tax ?? existing?.tax ?? 0);

  if (!Number.isFinite(discount) || discount < 0 || discount > prepared.subtotal) {
    throw Object.assign(new Error("Discount must be between zero and the subtotal"), { statusCode: 400 });
  }
  if (!Number.isFinite(tax) || tax < 0) {
    throw Object.assign(new Error("Tax cannot be negative"), { statusCode: 400 });
  }

  let customerData = null;
  const customerId = body.customer ?? existing?.customer ?? null;
  if (customerId) {
    customerData = await Customer.findOne({ _id: customerId, owner, isDeleted: false }).lean();
    if (!customerData) {
      throw Object.assign(new Error("Customer not found"), { statusCode: 404 });
    }
  }

  const validUntilRaw = body.validUntil ?? existing?.validUntil ?? null;
  const validUntil = validUntilRaw ? new Date(validUntilRaw) : null;
  if (validUntil && Number.isNaN(validUntil.getTime())) {
    throw Object.assign(new Error("Valid-until date is invalid"), { statusCode: 400 });
  }

  const status = body.status ?? existing?.status ?? "draft";
  if (!["draft", "sent", "accepted", "rejected", "expired", "converted"].includes(status)) {
    throw Object.assign(new Error("Invalid quotation status"), { statusCode: 400 });
  }

  return {
    customer: customerData?._id || null,
    customerName: customerData?.name || String(body.customerName ?? existing?.customerName ?? "Walk-in Customer").trim(),
    customerPhone: customerData?.phone || String(body.customerPhone ?? existing?.customerPhone ?? "").trim(),
    items: prepared.items,
    subtotal: prepared.subtotal,
    discount,
    tax,
    total: prepared.subtotal - discount + tax,
    validUntil,
    status,
    notes: String(body.notes ?? existing?.notes ?? "").trim()
  };
}

exports.createQuotation = asyncHandler(async (req, res) => {
  const payload = await preparePayload(req);
  const quotation = await Quotation.create({
    ...payload,
    owner: ownerId(req),
    createdBy: req.user._id,
    quotationNumber: createNumber()
  });

  await createAuditLog({
    req,
    action: "CREATE",
    module: "QUOTATION",
    recordId: quotation._id,
    newData: quotation
  });

  return successResponse(res, "Quotation created successfully", quotation, 201);
});

exports.getQuotations = asyncHandler(async (req, res) => {
  const query = { owner: ownerId(req), isDeleted: false };
  if (req.query.status) query.status = req.query.status;
  if (req.query.search) {
    query.$or = [
      { quotationNumber: { $regex: req.query.search, $options: "i" } },
      { customerName: { $regex: req.query.search, $options: "i" } },
      { customerPhone: { $regex: req.query.search, $options: "i" } }
    ];
  }

  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 25, 1), 100);
  const [quotations, total] = await Promise.all([
    Quotation.find(query)
      .populate("customer", "name phone email")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Quotation.countDocuments(query)
  ]);

  return successResponse(res, "Quotations fetched successfully", {
    quotations,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) }
  });
});

exports.getQuotation = asyncHandler(async (req, res) => {
  const quotation = await Quotation.findOne({
    _id: req.params.id,
    owner: ownerId(req),
    isDeleted: false
  })
    .populate("customer", "name phone email address")
    .populate("items.product", "name barcode unit sellingPrice")
    .populate("createdBy", "name email");

  if (!quotation) return errorResponse(res, "Quotation not found", 404);
  return successResponse(res, "Quotation fetched successfully", quotation);
});

exports.updateQuotation = asyncHandler(async (req, res) => {
  const quotation = await Quotation.findOne({
    _id: req.params.id,
    owner: ownerId(req),
    isDeleted: false
  });
  if (!quotation) return errorResponse(res, "Quotation not found", 404);
  if (quotation.status === "converted") {
    return errorResponse(res, "Converted quotations cannot be edited", 400);
  }

  const oldData = quotation.toObject();
  Object.assign(quotation, await preparePayload(req, quotation));
  await quotation.save();

  await createAuditLog({
    req,
    action: "UPDATE",
    module: "QUOTATION",
    recordId: quotation._id,
    oldData,
    newData: quotation
  });

  return successResponse(res, "Quotation updated successfully", quotation);
});

exports.deleteQuotation = asyncHandler(async (req, res) => {
  const quotation = await Quotation.findOne({
    _id: req.params.id,
    owner: ownerId(req),
    isDeleted: false
  });
  if (!quotation) return errorResponse(res, "Quotation not found", 404);

  const oldData = quotation.toObject();
  quotation.isDeleted = true;
  await quotation.save();
  await createAuditLog({
    req,
    action: "DELETE",
    module: "QUOTATION",
    recordId: quotation._id,
    oldData
  });

  return successResponse(res, "Quotation deleted successfully");
});
