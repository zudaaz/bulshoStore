const crypto = require("crypto");
const Payment = require("../models/Payment");
const Customer = require("../models/Customer");
const Supplier = require("../models/Supplier");
const asyncHandler = require("../utils/asyncHandler");
const { successResponse, errorResponse } = require("../utils/apiResponse");
const { createAuditLog } = require("../middleware/auditMiddleware");
const { createSystemEntry, deleteSystemEntry } = require("../services/ledgerService");

function getOwnerId(req) {
  return req.storeOwner || req.user.owner || req.user._id;
}

function generatePaymentNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `PAY-${date}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
}

function normalizeAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : NaN;
}

async function findReference(type, referenceId, ownerId) {
  const Model = type === "customer" ? Customer : Supplier;
  return Model.findOne({ _id: referenceId, owner: ownerId, isDeleted: false });
}


function referenceSnapshot(reference) {
  return {
    currentBalance: Number(reference.currentBalance || 0),
    totalPaid: Number(reference.totalPaid || 0),
    totalSales: Number(reference.totalSales || 0),
    lastTransactionDate: reference.lastTransactionDate || null
  };
}

function restoreReference(reference, ownerId, snapshot) {
  return reference.constructor.updateOne(
    { _id: reference._id, owner: ownerId },
    { $set: snapshot }
  );
}

function applyPayment(reference, amount) {
  reference.currentBalance = Math.max(Number(reference.currentBalance || 0) - amount, 0);
  reference.totalPaid = Number(reference.totalPaid || 0) + amount;
  reference.lastTransactionDate = new Date();
}

function reversePayment(reference, amount) {
  reference.currentBalance = Number(reference.currentBalance || 0) + amount;
  reference.totalPaid = Math.max(Number(reference.totalPaid || 0) - amount, 0);
  reference.lastTransactionDate = new Date();
}

exports.createPayment = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);
  const { type, referenceId, amount: rawAmount, method = "cash", note = "" } = req.body;
  const amount = normalizeAmount(rawAmount);

  if (!["customer", "supplier"].includes(type)) return errorResponse(res, "Invalid payment type", 400);
  if (!referenceId) return errorResponse(res, "Reference ID is required", 400);
  if (!Number.isFinite(amount) || amount <= 0) return errorResponse(res, "Amount must be greater than zero", 400);
  if (!["cash", "mobile_money", "bank"].includes(method)) return errorResponse(res, "Invalid payment method", 400);

  const reference = await findReference(type, referenceId, ownerId);
  if (!reference) return errorResponse(res, `${type === "customer" ? "Customer" : "Supplier"} not found`, 404);

  const currentBalance = Number(reference.currentBalance || 0);
  if (currentBalance <= 0) return errorResponse(res, "This account has no outstanding balance", 400);
  if (amount > currentBalance) return errorResponse(res, `Payment cannot exceed the outstanding balance of ${currentBalance}`, 400);

  const oldReference = referenceSnapshot(reference);
  let payment = null;
  try {
    applyPayment(reference, amount);
    await reference.save();

    payment = await Payment.create({
      owner: ownerId,
      paymentNumber: generatePaymentNumber(),
      type,
      referenceId: String(referenceId),
      amount,
      method,
      note: String(note || "").trim(),
      receiptNumber: generatePaymentNumber().replace("PAY-", "RCP-"),
      status: "completed",
      createdBy: req.user._id
    });

    await createSystemEntry({
      owner: ownerId,
      createdBy: req.user._id,
      title: type === "customer" ? `Customer payment: ${reference.name}` : `Supplier payment: ${reference.name}`,
      type: type === "customer" ? "income" : "expense",
      paymentMethod: method,
      amount,
      date: payment.createdAt,
      note: payment.note,
      referenceNumber: payment.paymentNumber,
      sourceType: "payment",
      sourceId: payment._id,
      sourceAction: "PRIMARY"
    });
  } catch (error) {
    if (payment?._id) await Payment.deleteOne({ _id: payment._id }).catch(() => undefined);
    await restoreReference(reference, ownerId, oldReference).catch(() => undefined);
    throw error;
  }

  await createAuditLog({ req, action: "CREATE", module: "PAYMENT", recordId: payment._id, newData: payment });
  return successResponse(res, "Payment recorded successfully", { payment, reference }, 201);
});

exports.customerCredit = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);
  const { customerId, amount: rawAmount, note = "Manual customer credit" } = req.body;
  const amount = normalizeAmount(rawAmount);

  if (!customerId) return errorResponse(res, "Customer ID is required", 400);
  if (!Number.isFinite(amount) || amount <= 0) return errorResponse(res, "Amount must be greater than zero", 400);

  const customer = await Customer.findOne({ _id: customerId, owner: ownerId, isDeleted: false });
  if (!customer) return errorResponse(res, "Customer not found", 404);

  const oldCustomer = referenceSnapshot(customer);
  let payment = null;
  try {
    customer.currentBalance = Number(customer.currentBalance || 0) + amount;
    customer.totalSales = Number(customer.totalSales || 0) + amount;
    customer.lastTransactionDate = new Date();
    await customer.save();

    payment = await Payment.create({
      owner: ownerId,
      paymentNumber: generatePaymentNumber(),
      type: "customer_credit",
      referenceId: String(customerId),
      amount,
      method: "credit",
      note: String(note || "").trim(),
      status: "completed",
      createdBy: req.user._id
    });
  } catch (error) {
    if (payment?._id) await Payment.deleteOne({ _id: payment._id }).catch(() => undefined);
    await restoreReference(customer, ownerId, oldCustomer).catch(() => undefined);
    throw error;
  }

  await createAuditLog({ req, action: "CREATE", module: "CUSTOMER_CREDIT", recordId: payment._id, newData: payment });
  return successResponse(res, "Customer credit added successfully", { customer, payment }, 201);
});

exports.getPayments = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);
  const { type, referenceId, method, status, startDate, endDate, page = 1, limit = 100 } = req.query;
  const query = { owner: ownerId, isDeleted: false };
  if (type) query.type = type;
  if (referenceId) query.referenceId = String(referenceId);
  if (method) query.method = method;
  if (status) query.status = status;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(`${startDate}T00:00:00.000Z`);
    if (endDate) query.createdAt.$lte = new Date(`${endDate}T23:59:59.999Z`);
  }

  const pageNumber = Math.max(Number(page) || 1, 1);
  const limitNumber = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const [payments, total] = await Promise.all([
    Payment.find(query).populate("createdBy", "name email").sort({ createdAt: -1 }).skip((pageNumber - 1) * limitNumber).limit(limitNumber),
    Payment.countDocuments(query)
  ]);

  return successResponse(res, "Payments fetched successfully", {
    payments,
    pagination: { total, page: pageNumber, pages: Math.ceil(total / limitNumber) }
  });
});

exports.getPayment = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);
  const payment = await Payment.findOne({ _id: req.params.id, owner: ownerId, isDeleted: false }).populate("createdBy", "name email");
  if (!payment) return errorResponse(res, "Payment not found", 404);
  return successResponse(res, "Payment fetched successfully", payment);
});

exports.deletePayment = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);
  const payment = await Payment.findOne({ _id: req.params.id, owner: ownerId, isDeleted: false, status: "completed" });
  if (!payment) return errorResponse(res, "Active payment not found", 404);

  const oldData = payment.toObject();
  const referenceType = payment.type === "customer_credit" ? "customer" : payment.type;
  const reference = await findReference(referenceType, payment.referenceId, ownerId);
  if (!reference) return errorResponse(res, "Related account was not found; payment cannot be reversed safely", 409);

  const amount = Number(payment.amount || 0);
  const oldReference = referenceSnapshot(reference);
  try {
    if (payment.type === "customer_credit") {
      reference.currentBalance = Math.max(Number(reference.currentBalance || 0) - amount, 0);
      reference.totalSales = Math.max(Number(reference.totalSales || 0) - amount, 0);
    } else {
      reversePayment(reference, amount);
    }
    await reference.save();

    await deleteSystemEntry({ owner: ownerId, sourceType: "payment", sourceId: payment._id, sourceAction: "PRIMARY" });
    payment.isDeleted = true;
    payment.status = "cancelled";
    payment.cancelledAt = new Date();
    payment.cancelledBy = req.user._id;
    await payment.save();
  } catch (error) {
    await restoreReference(reference, ownerId, oldReference).catch(() => undefined);
    throw error;
  }

  await createAuditLog({ req, action: "DELETE", module: "PAYMENT", recordId: payment._id, oldData, newData: payment });
  return successResponse(res, "Payment reversed successfully", { payment, reference });
});
