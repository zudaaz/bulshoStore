const crypto = require("crypto");
const Expense = require("../models/Expense");
const asyncHandler = require("../utils/asyncHandler");
const { successResponse, errorResponse } = require("../utils/apiResponse");
const { createAuditLog } = require("../middleware/auditMiddleware");
const { syncExpenseEntry } = require("../services/ledgerService");

function getOwnerId(req) {
  return req.storeOwner || req.user.owner || req.user._id;
}

function generatedReference() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `EXP-${date}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function normalize(body = {}) {
  return {
    referenceNumber: String(body.referenceNumber || "").trim(),
    title: String(body.title || "").trim(),
    amount: Number(body.amount),
    category: String(body.category || "General").trim() || "General",
    paymentMethod: body.paymentMethod || body.method || "cash",
    date: body.date ? new Date(body.date) : new Date(),
    description: String(body.description || body.note || "").trim(),
    attachment: String(body.attachment || "").trim(),
    status: body.status || "approved"
  };
}

function validate(payload) {
  if (!payload.title) return "Expense title is required";
  if (!Number.isFinite(payload.amount) || payload.amount <= 0) return "Expense amount must be greater than zero";
  if (!["cash", "mobile_money", "bank", "credit"].includes(payload.paymentMethod)) return "Invalid payment method";
  if (Number.isNaN(payload.date.getTime())) return "A valid expense date is required";
  if (!["pending", "approved", "rejected"].includes(payload.status)) return "Invalid expense status";
  return null;
}

exports.createExpense = asyncHandler(async (req, res) => {
  const payload = normalize(req.body);
  const validationError = validate(payload);
  if (validationError) return errorResponse(res, validationError, 400);

  if (!payload.referenceNumber) payload.referenceNumber = generatedReference();
  if (payload.status === "approved") {
    payload.approvedBy = req.user._id;
    payload.approvedAt = new Date();
  }

  const owner = getOwnerId(req);
  const expense = await Expense.create({
    ...payload,
    owner,
    createdBy: req.user._id
  });

  try {
    await syncExpenseEntry(expense, owner, req.user._id);
  } catch (error) {
    await Expense.deleteOne({ _id: expense._id, owner }).catch(() => undefined);
    throw error;
  }

  await createAuditLog({
    req,
    action: "CREATE",
    module: "EXPENSE",
    recordId: expense._id,
    newData: expense
  });

  return successResponse(res, "Expense created successfully", expense, 201);
});

exports.getExpenses = asyncHandler(async (req, res) => {
  const owner = getOwnerId(req);
  const { search, category, paymentMethod, status, startDate, endDate } = req.query;
  const query = { owner, isDeleted: false };

  if (category) query.category = category;
  if (paymentMethod) query.paymentMethod = paymentMethod;
  if (status) query.status = status;
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(`${startDate}T00:00:00.000Z`);
    if (endDate) query.date.$lte = new Date(`${endDate}T23:59:59.999Z`);
  }
  if (search) {
    query.$or = [
      { referenceNumber: { $regex: search, $options: "i" } },
      { title: { $regex: search, $options: "i" } },
      { category: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } }
    ];
  }

  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 25, 1), 200);
  const [expenses, total, totals] = await Promise.all([
    Expense.find(query)
      .populate("createdBy", "name email")
      .populate("approvedBy", "name email")
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Expense.countDocuments(query),
    Expense.aggregate([
      { $match: query },
      { $group: { _id: null, amount: { $sum: "$amount" } } }
    ])
  ]);

  return successResponse(res, "Expenses fetched successfully", {
    expenses,
    summary: { totalAmount: totals[0]?.amount || 0, totalRecords: total },
    pagination: { total, page, limit, pages: Math.ceil(total / limit) }
  });
});

exports.getExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({
    _id: req.params.id,
    owner: getOwnerId(req),
    isDeleted: false
  })
    .populate("createdBy", "name email")
    .populate("approvedBy", "name email");

  if (!expense) return errorResponse(res, "Expense not found", 404);
  return successResponse(res, "Expense fetched successfully", expense);
});

exports.updateExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({
    _id: req.params.id,
    owner: getOwnerId(req),
    isDeleted: false
  });
  if (!expense) return errorResponse(res, "Expense not found", 404);

  const payload = normalize({ ...expense.toObject(), ...req.body });
  const validationError = validate(payload);
  if (validationError) return errorResponse(res, validationError, 400);

  const oldData = expense.toObject();
  const previousStatus = expense.status;
  Object.assign(expense, payload);
  if (expense.status === "approved" && previousStatus !== "approved") {
    expense.approvedBy = req.user._id;
    expense.approvedAt = new Date();
  } else if (expense.status !== "approved") {
    expense.approvedBy = null;
    expense.approvedAt = null;
  }
  await expense.save();

  try {
    await syncExpenseEntry(expense, getOwnerId(req), req.user._id);
  } catch (error) {
    expense.set(oldData);
    await expense.save({ validateBeforeSave: false }).catch(() => undefined);
    throw error;
  }

  await createAuditLog({
    req,
    action: "UPDATE",
    module: "EXPENSE",
    recordId: expense._id,
    oldData,
    newData: expense
  });

  return successResponse(res, "Expense updated successfully", expense);
});

exports.deleteExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({
    _id: req.params.id,
    owner: getOwnerId(req),
    isDeleted: false
  });
  if (!expense) return errorResponse(res, "Expense not found", 404);

  const oldData = expense.toObject();
  expense.isDeleted = true;
  await expense.save();

  try {
    await syncExpenseEntry(expense, getOwnerId(req), req.user._id);
  } catch (error) {
    expense.isDeleted = false;
    await expense.save({ validateBeforeSave: false }).catch(() => undefined);
    throw error;
  }

  await createAuditLog({
    req,
    action: "DELETE",
    module: "EXPENSE",
    recordId: expense._id,
    oldData
  });

  return successResponse(res, "Expense deleted successfully");
});
