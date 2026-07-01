const Account = require("../models/Account");
const asyncHandler = require("../utils/asyncHandler");
const { successResponse, errorResponse } = require("../utils/apiResponse");
const { createAuditLog } = require("../middleware/auditMiddleware");

function ownerId(req) {
  return req.storeOwner || req.user.owner || req.user._id;
}

function normalizePayload(body = {}) {
  return {
    title: String(body.title || "").trim(),
    type: body.type,
    account: body.account || "cash",
    amount: Number(body.amount),
    date: body.date ? new Date(body.date) : new Date(),
    note: String(body.note || "").trim(),
    referenceNumber: String(body.referenceNumber || "").trim()
  };
}

function validate(payload) {
  if (!payload.title) return "Title is required";
  if (!["income", "expense"].includes(payload.type)) return "Type must be income or expense";
  if (!["cash", "bank", "mobile_money"].includes(payload.account)) return "Invalid account type";
  if (!Number.isFinite(payload.amount) || payload.amount <= 0) return "Amount must be greater than zero";
  if (Number.isNaN(payload.date.getTime())) return "A valid date is required";
  return null;
}

exports.createAccount = asyncHandler(async (req, res) => {
  const payload = normalizePayload(req.body);
  const message = validate(payload);
  if (message) return errorResponse(res, message, 400);

  const account = await Account.create({
    ...payload,
    user: ownerId(req),
    createdBy: req.user._id,
    sourceType: "manual",
    isSystemGenerated: false
  });
  await createAuditLog({ req, action: "CREATE", module: "ACCOUNT", recordId: account._id, newData: account });
  return successResponse(res, "Account transaction created successfully", account, 201);
});

exports.getAccounts = asyncHandler(async (req, res) => {
  const query = { user: ownerId(req), isDeleted: false };
  if (req.query.type) query.type = req.query.type;
  if (req.query.account) query.account = req.query.account;
  if (req.query.sourceType) query.sourceType = req.query.sourceType;
  if (req.query.search) {
    query.$or = [
      { title: { $regex: req.query.search, $options: "i" } },
      { note: { $regex: req.query.search, $options: "i" } },
      { referenceNumber: { $regex: req.query.search, $options: "i" } }
    ];
  }
  if (req.query.startDate || req.query.endDate) {
    query.date = {};
    if (req.query.startDate) query.date.$gte = new Date(`${req.query.startDate}T00:00:00.000Z`);
    if (req.query.endDate) query.date.$lte = new Date(`${req.query.endDate}T23:59:59.999Z`);
  }

  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 250, 1), 500);
  const [accounts, total, totals] = await Promise.all([
    Account.find(query)
      .populate("createdBy", "name email")
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Account.countDocuments(query),
    Account.aggregate([
      { $match: query },
      { $group: { _id: "$type", amount: { $sum: "$amount" } } }
    ])
  ]);

  const income = Number(totals.find((item) => item._id === "income")?.amount || 0);
  const expense = Number(totals.find((item) => item._id === "expense")?.amount || 0);
  return successResponse(res, "Account transactions fetched successfully", {
    accounts,
    summary: { income, expense, balance: income - expense },
    pagination: { total, page, limit, pages: Math.ceil(total / limit) }
  });
});

exports.updateAccount = asyncHandler(async (req, res) => {
  const payload = normalizePayload(req.body);
  const message = validate(payload);
  if (message) return errorResponse(res, message, 400);

  const account = await Account.findOne({ _id: req.params.id, user: ownerId(req), isDeleted: false });
  if (!account) return errorResponse(res, "Account transaction not found", 404);
  if (account.isSystemGenerated) {
    return errorResponse(res, "System-generated ledger entries cannot be edited directly", 400);
  }

  const oldData = account.toObject();
  Object.assign(account, payload);
  await account.save();
  await createAuditLog({ req, action: "UPDATE", module: "ACCOUNT", recordId: account._id, oldData, newData: account });
  return successResponse(res, "Account transaction updated successfully", account);
});

exports.deleteAccount = asyncHandler(async (req, res) => {
  const account = await Account.findOne({ _id: req.params.id, user: ownerId(req), isDeleted: false });
  if (!account) return errorResponse(res, "Account transaction not found", 404);
  if (account.isSystemGenerated) {
    return errorResponse(res, "System-generated ledger entries must be reversed from their source transaction", 400);
  }

  const oldData = account.toObject();
  account.isDeleted = true;
  await account.save();
  await createAuditLog({ req, action: "DELETE", module: "ACCOUNT", recordId: account._id, oldData });
  return successResponse(res, "Account transaction deleted successfully");
});
