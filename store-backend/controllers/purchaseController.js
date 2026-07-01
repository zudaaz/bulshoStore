const crypto = require("crypto");
const Purchase = require("../models/Purchase");
const Supplier = require("../models/Supplier");
const asyncHandler = require("../utils/asyncHandler");
const { successResponse, errorResponse } = require("../utils/apiResponse");
const { createAuditLog } = require("../middleware/auditMiddleware");
const {
  preparePurchaseItems,
  increaseStockFromPurchase,
  rollbackPurchaseIncrease,
  reversePurchaseStock,
  rollbackPurchaseReturn
} = require("../services/purchaseService");
const {
  createSystemEntry,
  deleteSystemEntry
} = require("../services/ledgerService");

function ownerId(req) {
  return req.storeOwner || req.user.owner || req.user._id;
}

function generatePurchaseInvoice() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `PUR-${date}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function validPaymentMethod(value) {
  return ["cash", "mobile_money", "bank", "credit"].includes(value);
}

exports.createPurchase = asyncHandler(async (req, res) => {
  const owner = ownerId(req);
  const {
    supplier,
    items,
    paidAmount = 0,
    invoiceNumber = "",
    paymentMethod = "cash"
  } = req.body;

  if (!supplier) return errorResponse(res, "Supplier is required", 400);
  if (!Array.isArray(items) || !items.length) {
    return errorResponse(res, "Purchase items are required", 400);
  }
  if (!validPaymentMethod(paymentMethod)) {
    return errorResponse(res, "Invalid payment method", 400);
  }

  const supplierData = await Supplier.findOne({
    _id: supplier,
    owner,
    isDeleted: false,
    status: "active"
  });
  if (!supplierData) return errorResponse(res, "Supplier not found or inactive", 404);

  let prepared;
  try {
    prepared = await preparePurchaseItems(items, owner);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }

  const paid = Number(paidAmount || 0);
  if (!Number.isFinite(paid) || paid < 0 || paid > prepared.subtotal) {
    return errorResponse(res, "Paid amount must be between zero and the purchase subtotal", 400);
  }
  if (paymentMethod === "credit" && paid > 0) {
    return errorResponse(res, "Credit purchases cannot have an immediate paid amount", 400);
  }

  const balance = prepared.subtotal - paid;
  const paymentStatus = paid === 0 ? "unpaid" : balance > 0 ? "partial" : "paid";
  const purchase = await Purchase.create({
    owner,
    invoiceNumber: String(invoiceNumber || generatePurchaseInvoice()).trim(),
    supplier,
    supplierName: supplierData.name,
    items: prepared.preparedItems,
    subtotal: prepared.subtotal,
    paidAmount: paid,
    balance,
    paymentMethod,
    paymentStatus,
    status: "completed",
    createdBy: req.user._id
  });

  const supplierBefore = {
    currentBalance: Number(supplierData.currentBalance || 0),
    totalPurchases: Number(supplierData.totalPurchases || 0),
    totalPaid: Number(supplierData.totalPaid || 0)
  };
  let appliedStock = [];
  let supplierUpdated = false;
  let ledgerCreated = false;

  try {
    const ledger = await createSystemEntry({
      owner,
      createdBy: req.user._id,
      title: `Purchase payment: ${purchase.invoiceNumber}`,
      type: "expense",
      paymentMethod,
      amount: paid,
      date: purchase.createdAt,
      note: `Supplier: ${supplierData.name}`,
      referenceNumber: purchase.invoiceNumber,
      sourceType: "purchase",
      sourceId: purchase._id,
      sourceAction: "CREATE"
    });
    ledgerCreated = Boolean(ledger);

    appliedStock = await increaseStockFromPurchase(
      purchase.items,
      purchase._id,
      owner,
      req.user._id
    );

    supplierData.currentBalance = supplierBefore.currentBalance + balance;
    supplierData.totalPurchases = supplierBefore.totalPurchases + prepared.subtotal;
    supplierData.totalPaid = supplierBefore.totalPaid + paid;
    await supplierData.save();
    supplierUpdated = true;
  } catch (error) {
    if (supplierUpdated) {
      await Supplier.updateOne(
        { _id: supplierData._id, owner },
        { $set: supplierBefore }
      ).catch(() => undefined);
    }
    if (appliedStock.length) await rollbackPurchaseIncrease(appliedStock, owner);
    if (ledgerCreated) {
      await deleteSystemEntry({ owner, sourceType: "purchase", sourceId: purchase._id, sourceAction: "CREATE" });
    }
    await Purchase.deleteOne({ _id: purchase._id, owner }).catch(() => undefined);
    throw error;
  }

  await createAuditLog({
    req,
    action: "CREATE",
    module: "PURCHASE",
    recordId: purchase._id,
    newData: purchase
  });
  return successResponse(res, "Purchase created successfully", purchase, 201);
});

exports.getPurchases = asyncHandler(async (req, res) => {
  const query = { owner: ownerId(req), isDeleted: false };
  if (req.query.status) query.status = req.query.status;
  if (req.query.supplier) query.supplier = req.query.supplier;
  if (req.query.paymentStatus) query.paymentStatus = req.query.paymentStatus;
  if (req.query.search) {
    query.$or = [
      { invoiceNumber: { $regex: req.query.search, $options: "i" } },
      { supplierName: { $regex: req.query.search, $options: "i" } }
    ];
  }
  if (req.query.startDate || req.query.endDate) {
    query.createdAt = {};
    if (req.query.startDate) query.createdAt.$gte = new Date(`${req.query.startDate}T00:00:00.000Z`);
    if (req.query.endDate) query.createdAt.$lte = new Date(`${req.query.endDate}T23:59:59.999Z`);
  }

  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 25, 1), 200);
  const [purchases, total] = await Promise.all([
    Purchase.find(query)
      .populate("supplier", "name phone email")
      .populate("items.product", "name barcode unit")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Purchase.countDocuments(query)
  ]);
  return successResponse(res, "Purchases fetched successfully", {
    purchases,
    pagination: { total, page, pages: Math.ceil(total / limit), limit }
  });
});

exports.getPurchase = asyncHandler(async (req, res) => {
  const purchase = await Purchase.findOne({
    _id: req.params.id,
    owner: ownerId(req),
    isDeleted: false
  })
    .populate("supplier", "name phone email address")
    .populate("items.product", "name barcode unit")
    .populate("createdBy", "name email");
  if (!purchase) return errorResponse(res, "Purchase not found", 404);
  return successResponse(res, "Purchase fetched successfully", purchase);
});

exports.updatePurchase = asyncHandler(async (req, res) => {
  const owner = ownerId(req);
  const purchase = await Purchase.findOne({ _id: req.params.id, owner, isDeleted: false });
  if (!purchase) return errorResponse(res, "Purchase not found", 404);
  if (purchase.status !== "completed") {
    return errorResponse(res, "Returned purchases cannot be updated", 400);
  }
  if (req.body.paidAmount === undefined) {
    return errorResponse(res, "Paid amount is required", 400);
  }

  const newPaid = Number(req.body.paidAmount);
  if (!Number.isFinite(newPaid) || newPaid < 0 || newPaid > purchase.subtotal) {
    return errorResponse(res, "Paid amount must be between zero and the purchase subtotal", 400);
  }

  const oldData = purchase.toObject();
  const oldPaid = Number(purchase.paidAmount || 0);
  const oldBalance = Number(purchase.balance || 0);
  const delta = newPaid - oldPaid;
  if (delta === 0) return successResponse(res, "Purchase payment is unchanged", purchase);

  const supplier = await Supplier.findOne({ _id: purchase.supplier, owner, isDeleted: false });
  const supplierBefore = supplier
    ? { totalPaid: Number(supplier.totalPaid || 0), currentBalance: Number(supplier.currentBalance || 0) }
    : null;
  const action = `PAYMENT_${oldPaid}_${newPaid}`;
  let ledgerCreated = false;

  try {
    const ledger = await createSystemEntry({
      owner,
      createdBy: req.user._id,
      title: delta > 0 ? `Additional purchase payment: ${purchase.invoiceNumber}` : `Purchase payment correction: ${purchase.invoiceNumber}`,
      type: delta > 0 ? "expense" : "income",
      paymentMethod: purchase.paymentMethod,
      amount: Math.abs(delta),
      date: new Date(),
      note: `Supplier: ${purchase.supplierName}`,
      referenceNumber: purchase.invoiceNumber,
      sourceType: "purchase",
      sourceId: purchase._id,
      sourceAction: action
    });
    ledgerCreated = Boolean(ledger);

    purchase.paidAmount = newPaid;
    purchase.balance = Number(purchase.subtotal) - newPaid;
    purchase.paymentStatus = newPaid === 0 ? "unpaid" : purchase.balance > 0 ? "partial" : "paid";

    if (supplier) {
      supplier.totalPaid = Math.max(supplierBefore.totalPaid + delta, 0);
      supplier.currentBalance = Math.max(supplierBefore.currentBalance - delta, 0);
      await supplier.save();
    }
    await purchase.save();
  } catch (error) {
    if (supplier && supplierBefore) {
      await Supplier.updateOne({ _id: supplier._id, owner }, { $set: supplierBefore }).catch(() => undefined);
    }
    if (ledgerCreated) {
      await deleteSystemEntry({ owner, sourceType: "purchase", sourceId: purchase._id, sourceAction: action });
    }
    throw error;
  }

  await createAuditLog({
    req,
    action: "UPDATE",
    module: "PURCHASE",
    recordId: purchase._id,
    oldData,
    newData: purchase
  });
  return successResponse(res, "Purchase payment updated successfully", purchase);
});

async function returnPurchase(req, res, markDeleted = false) {
  const owner = ownerId(req);
  const purchase = await Purchase.findOne({ _id: req.params.id, owner, isDeleted: false });
  if (!purchase) return errorResponse(res, "Purchase not found", 404);
  if (purchase.status === "returned") {
    return errorResponse(res, "Purchase has already been returned", 400);
  }

  const reason = String(req.body.reason || "Purchase returned").trim();
  const supplier = await Supplier.findOne({ _id: purchase.supplier, owner, isDeleted: false });
  const supplierBefore = supplier
    ? {
        currentBalance: Number(supplier.currentBalance || 0),
        totalPurchases: Number(supplier.totalPurchases || 0),
        totalPaid: Number(supplier.totalPaid || 0)
      }
    : null;
  const oldData = purchase.toObject();
  let returnStock = [];
  let supplierUpdated = false;
  let ledgerCreated = false;

  try {
    const ledger = await createSystemEntry({
      owner,
      createdBy: req.user._id,
      title: `Purchase refund: ${purchase.invoiceNumber}`,
      type: "income",
      paymentMethod: purchase.paymentMethod,
      amount: purchase.paidAmount,
      date: new Date(),
      note: reason,
      referenceNumber: purchase.invoiceNumber,
      sourceType: "purchase",
      sourceId: purchase._id,
      sourceAction: "RETURN"
    });
    ledgerCreated = Boolean(ledger);

    returnStock = await reversePurchaseStock(
      purchase.items,
      purchase._id,
      owner,
      req.user._id,
      reason
    );

    if (supplier) {
      supplier.currentBalance = Math.max(supplierBefore.currentBalance - Number(purchase.balance || 0), 0);
      supplier.totalPurchases = Math.max(supplierBefore.totalPurchases - Number(purchase.subtotal || 0), 0);
      supplier.totalPaid = Math.max(supplierBefore.totalPaid - Number(purchase.paidAmount || 0), 0);
      await supplier.save();
      supplierUpdated = true;
    }

    purchase.status = "returned";
    purchase.returnReason = reason;
    purchase.returnedAt = new Date();
    purchase.isDeleted = markDeleted;
    await purchase.save();
  } catch (error) {
    if (supplierUpdated && supplierBefore) {
      await Supplier.updateOne({ _id: supplier._id, owner }, { $set: supplierBefore }).catch(() => undefined);
    }
    if (returnStock.length) await rollbackPurchaseReturn(returnStock, owner);
    if (ledgerCreated) {
      await deleteSystemEntry({ owner, sourceType: "purchase", sourceId: purchase._id, sourceAction: "RETURN" });
    }
    throw error;
  }

  await createAuditLog({
    req,
    action: markDeleted ? "DELETE" : "RETURN",
    module: "PURCHASE",
    recordId: purchase._id,
    oldData,
    newData: purchase
  });
  return successResponse(
    res,
    markDeleted ? "Purchase reversed and archived successfully" : "Purchase returned successfully",
    purchase
  );
}

exports.returnPurchase = asyncHandler((req, res) => returnPurchase(req, res, false));
exports.deletePurchase = asyncHandler((req, res) => returnPurchase(req, res, true));
