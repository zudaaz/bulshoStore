const Sale = require("../models/Sale");
const Purchase = require("../models/Purchase");
const Expense = require("../models/Expense");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const Supplier = require("../models/Supplier");

const asyncHandler = require("../utils/asyncHandler");
const { successResponse } = require("../utils/apiResponse");

const { generateSalesReportPDF } = require("../utils/generatePDF");
const { exportSalesReportExcel } = require("../utils/exportExcel");

/* =========================
   OWNER
========================= */
function getOwnerId(req) {
  return req.storeOwner || req.user.owner || req.user._id;
}

/* =========================
   DATE FILTER
========================= */
function dateFilter(startDate, endDate, field = "createdAt") {
  const range = {};
  if (startDate) {
    const start = new Date(startDate);
    if (!Number.isNaN(start.getTime())) {
      start.setHours(0, 0, 0, 0);
      range.$gte = start;
    }
  }
  if (endDate) {
    const end = new Date(endDate);
    if (!Number.isNaN(end.getTime())) {
      end.setHours(23, 59, 59, 999);
      range.$lte = end;
    }
  }
  return Object.keys(range).length ? { [field]: range } : {};
}

/* =========================
   SALES REPORT BUILDER
========================= */
async function buildSalesReport(req) {
  const ownerId = getOwnerId(req);

  const filter = {
    owner: ownerId,
    status: "completed",
    isDeleted: false,
    ...dateFilter(req.query.startDate, req.query.endDate)
  };

  const sales = await Sale.find(filter)
    .populate("customer", "name")
    .populate("cashier", "name")
    .sort({ createdAt: -1 });

  const summary = sales.reduce(
    (acc, sale) => {
      acc.totalSales += Number(sale.total || 0);
      acc.totalPaid += Number(sale.paidAmount || 0);
      acc.totalBalance += Number(sale.balance || 0);
      acc.totalInvoices += 1;
      return acc;
    },
    {
      totalSales: 0,
      totalPaid: 0,
      totalBalance: 0,
      totalInvoices: 0
    }
  );

  return {
    summary,
    sales
  };
}

/* =========================
   SALES REPORT
========================= */
exports.salesReport = asyncHandler(async (req, res) => {
  const report = await buildSalesReport(req);

  return successResponse(
    res,
    "Sales report fetched",
    report
  );
});

/* =========================
   PDF
========================= */
exports.exportSalesPDF = asyncHandler(async (req, res) => {
  const report = await buildSalesReport(req);
  return generateSalesReportPDF(res, report);
});

/* =========================
   EXCEL
========================= */
exports.exportSalesExcel = asyncHandler(async (req, res) => {
  const report = await buildSalesReport(req);
  return exportSalesReportExcel(res, report);
});

/* =========================
   PURCHASE REPORT
========================= */
exports.purchaseReport = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);

  const purchases = await Purchase.find({
    owner: ownerId,
    isDeleted: false,
    ...dateFilter(req.query.startDate, req.query.endDate)
  })
    .populate("supplier", "name")
    .sort({ createdAt: -1 });

  const summary = purchases.reduce(
    (acc, purchase) => {
      acc.totalPurchases += Number(purchase.subtotal || 0);
      acc.totalPaid += Number(purchase.paidAmount || 0);
      acc.totalBalance += Number(purchase.balance || 0);
      acc.totalInvoices += 1;
      return acc;
    },
    {
      totalPurchases: 0,
      totalPaid: 0,
      totalBalance: 0,
      totalInvoices: 0
    }
  );

  return successResponse(res, "Purchase report fetched", {
    summary,
    purchases
  });
});

/* =========================
   EXPENSE REPORT
========================= */
exports.expenseReport = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);

  const expenses = await Expense.find({
    owner: ownerId,
    isDeleted: false,
    ...dateFilter(req.query.startDate, req.query.endDate, "date")
  }).sort({ date: -1 });

  const totalExpenses = expenses.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  return successResponse(res, "Expense report fetched", {
    summary: {
      totalExpenses,
      totalRecords: expenses.length
    },
    expenses
  });
});

/* =========================
   PROFIT LOSS
========================= */
exports.profitLossReport = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);

  const sales = await Sale.find({
    owner: ownerId,
    status: "completed",
    isDeleted: false,
    ...dateFilter(req.query.startDate, req.query.endDate)
  });

  const expenses = await Expense.find({
    owner: ownerId,
    isDeleted: false,
    ...dateFilter(req.query.startDate, req.query.endDate, "date")
  });

  let revenue = 0;
  let grossProfit = 0;

  sales.forEach((sale) => {
    revenue += Number(sale.total || 0);

    sale.items.forEach((item) => {
      grossProfit += Number(item.profit || 0);
    });
  });

  const totalExpenses = expenses.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  return successResponse(res, "Profit report fetched", {
    totalRevenue: revenue,
    grossProfit,
    totalExpenses,
    netProfit: grossProfit - totalExpenses
  });
});

/* =========================
   STOCK REPORT
========================= */
exports.stockReport = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);

  const products = await Product.find({
    owner: ownerId,
    isDeleted: false
  }).populate("category", "name");

  return successResponse(res, "Stock report fetched", products);
});

/* =========================
   CUSTOMER BALANCES
========================= */
exports.customerBalanceReport = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);

  const customers = await Customer.find({
    owner: ownerId,
    isDeleted: false,
    currentBalance: { $gt: 0 }
  });

  return successResponse(res, "Customer balances fetched", customers);
});

/* =========================
   SUPPLIER BALANCES
========================= */
exports.supplierBalanceReport = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);

  const suppliers = await Supplier.find({
    owner: ownerId,
    isDeleted: false,
    currentBalance: { $gt: 0 }
  });

  return successResponse(res, "Supplier balances fetched", suppliers);
});