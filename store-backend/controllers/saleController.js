const Sale = require("../models/Sale");
const Customer = require("../models/Customer");
const Setting = require("../models/Setting");

const asyncHandler = require("../utils/asyncHandler");
const { successResponse, errorResponse } = require("../utils/apiResponse");
const {
  generateInvoiceNumber,
  generateReceiptNumber
} = require("../utils/generateInvoiceNumber");
const {
  prepareSaleItems,
  reduceStockAfterSale,
  restoreStockFromSale
} = require("../services/saleService");
const { createAuditLog } = require("../middleware/auditMiddleware");
const {
  createSystemEntry,
  deleteSystemEntry
} = require("../services/ledgerService");

function getOwnerId(req) {
  return req.storeOwner || req.user.owner || req.user._id;
}

function asNonNegativeNumber(value, label) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number < 0) {
    const error = new Error(`${label} must be zero or greater`);
    error.statusCode = 400;
    throw error;
  }
  return number;
}

function getCustomerImpact(sale) {
  const total = Number(sale.total || 0);
  const paid = Math.min(Number(sale.paidAmount || 0), total);
  const balance = Math.max(total - paid, 0);
  return { total, paid, balance };
}

async function reverseCustomerImpact(sale, ownerId) {
  if (!sale.customer) return;

  const customer = await Customer.findOne({
    _id: sale.customer,
    owner: ownerId,
    isDeleted: false
  });

  if (!customer) return;

  const impact = getCustomerImpact(sale);
  customer.totalSales = Math.max(Number(customer.totalSales || 0) - impact.total, 0);
  customer.totalPaid = Math.max(Number(customer.totalPaid || 0) - impact.paid, 0);
  customer.currentBalance = Math.max(
    Number(customer.currentBalance || 0) - impact.balance,
    0
  );
  customer.lastTransactionDate = new Date();
  await customer.save();
}

async function applyCustomerImpact(sale, ownerId) {
  if (!sale.customer) return;

  const customer = await Customer.findOne({
    _id: sale.customer,
    owner: ownerId,
    isDeleted: false
  });
  if (!customer) return;

  const impact = getCustomerImpact(sale);
  customer.totalSales = Number(customer.totalSales || 0) + impact.total;
  customer.totalPaid = Number(customer.totalPaid || 0) + impact.paid;
  customer.currentBalance = Number(customer.currentBalance || 0) + impact.balance;
  customer.lastTransactionDate = new Date();
  await customer.save();
}

/* CREATE SALE */
exports.createSale = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);
  const {
    customer,
    items,
    discount = 0,
    tax = 0,
    paidAmount = 0,
    paymentMethod = "cash",
    note = ""
  } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return errorResponse(res, "Sale items are required", 400);
  }

  const { preparedItems, subtotal, totalProfit } = await prepareSaleItems(
    items,
    ownerId
  );
  const discountAmount = asNonNegativeNumber(discount, "Discount");
  const taxAmount = asNonNegativeNumber(tax, "Tax");
  const cashReceived = asNonNegativeNumber(paidAmount, "Paid amount");

  if (discountAmount > subtotal) {
    return errorResponse(res, "Discount cannot exceed the subtotal", 400);
  }

  const total = subtotal - discountAmount + taxAmount;
  const paid = Math.min(cashReceived, total);
  const changeAmount = Math.max(cashReceived - total, 0);
  const balance = Math.max(total - paid, 0);
  const paymentStatus = balance === 0 ? "paid" : paid > 0 ? "partial" : "unpaid";

  let customerData = null;
  let customerName = "Walk-in Customer";

  if (customer) {
    customerData = await Customer.findOne({
      _id: customer,
      owner: ownerId,
      isDeleted: false,
      status: "active"
    });

    if (!customerData) {
      return errorResponse(res, "Customer not found or inactive", 404);
    }

    customerName = customerData.name;
  }

  if (balance > 0 && !customerData) {
    return errorResponse(
      res,
      "A customer is required for partial or credit sales",
      400
    );
  }

  const sale = await Sale.create({
    owner: ownerId,
    createdBy: req.user._id,
    invoiceNumber: await generateInvoiceNumber(),
    receiptNumber: await generateReceiptNumber(),
    customer: customerData?._id || null,
    customerName,
    items: preparedItems,
    subtotal,
    discount: discountAmount,
    tax: taxAmount,
    total,
    totalProfit,
    cashReceived,
    changeAmount,
    paidAmount: paid,
    balance,
    paymentMethod,
    paymentStatus,
    status: "processing",
    cashier: req.user._id,
    cashierName: req.user.name,
    note
  });

  let stockReduced = false;
  let customerUpdated = false;
  let ledgerCreated = false;

  try {
    const ledger = await createSystemEntry({
      owner: ownerId,
      createdBy: req.user._id,
      title: `Sale receipt: ${sale.receiptNumber}`,
      type: "income",
      paymentMethod,
      amount: paid,
      date: sale.createdAt,
      note: `Customer: ${customerName}`,
      referenceNumber: sale.invoiceNumber,
      sourceType: "sale",
      sourceId: sale._id,
      sourceAction: "CREATE"
    });
    ledgerCreated = Boolean(ledger);

    await reduceStockAfterSale(preparedItems, sale._id, ownerId, req.user._id);
    stockReduced = true;

    if (customerData) {
      customerData.totalSales = Number(customerData.totalSales || 0) + total;
      customerData.totalPaid = Number(customerData.totalPaid || 0) + paid;
      customerData.currentBalance =
        Number(customerData.currentBalance || 0) + balance;
      customerData.lastTransactionDate = new Date();
      await customerData.save();
      customerUpdated = true;
    }

    sale.status = "completed";
    await sale.save();
  } catch (error) {
    if (customerUpdated) {
      await reverseCustomerImpact(sale, ownerId).catch(() => undefined);
    }

    if (stockReduced) {
      await restoreStockFromSale(
        preparedItems,
        sale._id,
        ownerId,
        req.user._id,
        "Automatic rollback after failed sale"
      ).catch(() => undefined);
    }

    if (ledgerCreated) {
      await deleteSystemEntry({
        owner: ownerId,
        sourceType: "sale",
        sourceId: sale._id,
        sourceAction: "CREATE"
      }).catch(() => undefined);
    }

    await Sale.deleteOne({ _id: sale._id, owner: ownerId }).catch(() => undefined);
    throw error;
  }

  await createAuditLog({
    req,
    action: "CREATE",
    module: "SALE",
    recordId: sale._id,
    newData: sale
  });

  return successResponse(res, "Sale created successfully", sale, 201);
});

/* GET SALES */
exports.getSales = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);
  const {
    search,
    paymentMethod,
    status,
    startDate,
    endDate,
    page = 1,
    limit = 10
  } = req.query;
  const query = { owner: ownerId, isDeleted: false };

  if (paymentMethod) query.paymentMethod = paymentMethod;
  if (status) query.status = status;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(`${startDate}T00:00:00.000Z`);
    if (endDate) query.createdAt.$lte = new Date(`${endDate}T23:59:59.999Z`);
  }

  if (search) {
    query.$or = [
      { invoiceNumber: { $regex: search, $options: "i" } },
      { receiptNumber: { $regex: search, $options: "i" } },
      { customerName: { $regex: search, $options: "i" } },
      { cashierName: { $regex: search, $options: "i" } }
    ];
  }

  const pageNumber = Math.max(Number(page) || 1, 1);
  const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 100);
  const skip = (pageNumber - 1) * limitNumber;
  const [sales, total] = await Promise.all([
    Sale.find(query)
      .populate("customer", "name phone")
      .populate("cashier", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber),
    Sale.countDocuments(query)
  ]);

  return successResponse(res, "Sales fetched successfully", {
    sales,
    pagination: {
      total,
      page: pageNumber,
      limit: limitNumber,
      pages: Math.ceil(total / limitNumber)
    }
  });
});

/* GET SINGLE SALE */
exports.getSale = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);
  const sale = await Sale.findOne({
    _id: req.params.id,
    owner: ownerId,
    isDeleted: false
  })
    .populate("customer", "name phone email address")
    .populate("cashier", "name email");

  if (!sale) return errorResponse(res, "Sale not found", 404);
  return successResponse(res, "Sale fetched successfully", sale);
});

async function reverseCompletedSale(req, res, status, action, message) {
  const ownerId = getOwnerId(req);
  const sale = await Sale.findOne({
    _id: req.params.id,
    owner: ownerId,
    isDeleted: false
  });

  if (!sale) return errorResponse(res, "Sale not found", 404);
  if (sale.status !== "completed") {
    return errorResponse(res, "Only completed sales can be reversed", 400);
  }

  const reason = String(req.body.reason || `Sale ${status}`).trim();
  const oldData = sale.toObject();
  const sourceAction = status.toUpperCase();
  let ledgerCreated = false;
  let stockRestored = false;
  let customerReversed = false;

  try {
    const ledger = await createSystemEntry({
      owner: ownerId,
      createdBy: req.user._id,
      title: `Sale ${status}: ${sale.receiptNumber}`,
      type: "expense",
      paymentMethod: sale.paymentMethod,
      amount: sale.paidAmount,
      date: new Date(),
      note: reason,
      referenceNumber: sale.invoiceNumber,
      sourceType: "sale",
      sourceId: sale._id,
      sourceAction
    });
    ledgerCreated = Boolean(ledger);

    await restoreStockFromSale(
      sale.items,
      sale._id,
      ownerId,
      req.user._id,
      reason
    );
    stockRestored = true;

    await reverseCustomerImpact(sale, ownerId);
    customerReversed = Boolean(sale.customer);

    sale.status = status;
    sale.reversalReason = reason;
    sale.reversedAt = new Date();
    sale.reversedBy = req.user._id;
    await sale.save();
  } catch (error) {
    if (customerReversed) {
      await applyCustomerImpact(sale, ownerId).catch(() => undefined);
    }
    if (stockRestored) {
      await reduceStockAfterSale(sale.items, sale._id, ownerId, req.user._id).catch(
        () => undefined
      );
    }
    if (ledgerCreated) {
      await deleteSystemEntry({
        owner: ownerId,
        sourceType: "sale",
        sourceId: sale._id,
        sourceAction
      }).catch(() => undefined);
    }
    throw error;
  }

  await createAuditLog({
    req,
    action,
    module: "SALE",
    recordId: sale._id,
    oldData,
    newData: sale
  });

  return successResponse(res, message, sale);
}

exports.voidSale = asyncHandler((req, res) =>
  reverseCompletedSale(req, res, "voided", "VOID", "Sale voided successfully")
);

exports.returnSale = asyncHandler((req, res) =>
  reverseCompletedSale(
    req,
    res,
    "returned",
    "REFUND",
    "Sale returned successfully"
  )
);

/* GET RECEIPT */
exports.getReceipt = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);
  const sale = await Sale.findOne({
    _id: req.params.id,
    owner: ownerId,
    isDeleted: false
  })
    .populate("customer", "name phone email address")
    .populate("cashier", "name");

  if (!sale) return errorResponse(res, "Sale not found", 404);

  const settings = await Setting.findOne({ owner: ownerId }).lean();
  return successResponse(res, "Receipt fetched successfully", {
    store: {
      name: settings?.storeName || "Store",
      logo: settings?.storeLogo || "",
      phone: settings?.storePhone || "",
      address: settings?.storeAddress || "",
      currency: settings?.currency || "USD"
    },
    receipt: sale
  });
});
