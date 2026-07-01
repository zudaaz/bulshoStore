const Sale = require("../models/Sale");
const Purchase = require("../models/Purchase");
const Expense = require("../models/Expense");
const Product = require("../models/Product");
const Category = require("../models/Category");
const Customer = require("../models/Customer");
const Supplier = require("../models/Supplier");
const StockMovement = require("../models/StockMovement");
const asyncHandler = require("../utils/asyncHandler");
const { successResponse } = require("../utils/apiResponse");

function dateAtStartOfDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function getOwnerId(req) {
  return String(req.storeOwner || req.user.owner || req.user._id);
}

function sumResult(rows, key = "total") {
  return Number(rows[0]?.[key] || 0);
}

exports.summary = asyncHandler(async (req, res) => {
  const owner = getOwnerId(req);
  const today = dateAtStartOfDay();
  const month = new Date(today.getFullYear(), today.getMonth(), 1);
  const expiryWarningDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const baseSale = { owner, status: "completed", isDeleted: false };
  const basePurchase = { owner, status: "completed", isDeleted: false };
  const baseExpense = { owner, status: "approved", isDeleted: false };
  const baseProduct = { owner, isDeleted: false };

  const [
    todaySalesRows,
    monthlySalesRows,
    expenseRows,
    purchaseRows,
    profitRows,
    productCount,
    categoryCount,
    supplierCount,
    customerCount,
    availableStockRows,
    stockValueRows,
    lowStockCount,
    outOfStockCount,
    expiredProductCount,
    expiringProductCount,
    customerCreditRows,
    supplierPayableRows
  ] = await Promise.all([
    Sale.aggregate([{ $match: { ...baseSale, createdAt: { $gte: today } } }, { $group: { _id: null, total: { $sum: "$total" } } }]),
    Sale.aggregate([{ $match: { ...baseSale, createdAt: { $gte: month } } }, { $group: { _id: null, total: { $sum: "$total" } } }]),
    Expense.aggregate([{ $match: baseExpense }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    Purchase.aggregate([{ $match: basePurchase }, { $group: { _id: null, total: { $sum: "$subtotal" } } }]),
    Sale.aggregate([{ $match: baseSale }, { $group: { _id: null, total: { $sum: "$totalProfit" } } }]),
    Product.countDocuments(baseProduct),
    Category.countDocuments({ owner, isDeleted: false }),
    Supplier.countDocuments({ owner, isDeleted: false }),
    Customer.countDocuments({ owner, isDeleted: false }),
    Product.aggregate([{ $match: baseProduct }, { $group: { _id: null, total: { $sum: "$quantityInStock" } } }]),
    Product.aggregate([{ $match: baseProduct }, { $group: { _id: null, total: { $sum: { $multiply: ["$quantityInStock", "$buyingPrice"] } } } }]),
    Product.countDocuments({ ...baseProduct, $expr: { $lte: ["$quantityInStock", "$minimumStockLevel"] } }),
    Product.countDocuments({ ...baseProduct, quantityInStock: { $lte: 0 } }),
    Product.countDocuments({ ...baseProduct, expiryDate: { $ne: null, $lt: today } }),
    Product.countDocuments({ ...baseProduct, expiryDate: { $gte: today, $lte: expiryWarningDate } }),
    Customer.aggregate([{ $match: { owner, isDeleted: false } }, { $group: { _id: null, total: { $sum: "$currentBalance" } } }]),
    Supplier.aggregate([{ $match: { owner, isDeleted: false } }, { $group: { _id: null, total: { $sum: "$currentBalance" } } }])
  ]);

  const totalExpenses = sumResult(expenseRows);
  const grossProfit = sumResult(profitRows);

  return successResponse(res, "Dashboard summary fetched", {
    totalProducts: productCount,
    totalCategories: categoryCount,
    totalSuppliers: supplierCount,
    totalCustomers: customerCount,
    availableStock: sumResult(availableStockRows),
    stockValue: sumResult(stockValueRows),
    todaySales: sumResult(todaySalesRows),
    monthlySales: sumResult(monthlySalesRows),
    totalExpenses,
    totalPurchases: sumResult(purchaseRows),
    grossProfit,
    netProfit: grossProfit - totalExpenses,
    lowStockCount,
    outOfStockCount,
    expiredProductCount,
    expiringProductCount,
    customerCreditBalance: sumResult(customerCreditRows),
    supplierPayableBalance: sumResult(supplierPayableRows)
  });
});

exports.charts = asyncHandler(async (req, res) => {
  const owner = getOwnerId(req);
  const from = new Date();
  from.setDate(from.getDate() - 30);
  from.setHours(0, 0, 0, 0);

  const [salesChart, expenseChart, paymentMethodChart, topProducts] = await Promise.all([
    Sale.aggregate([
      { $match: { owner, status: "completed", isDeleted: false, createdAt: { $gte: from } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, total: { $sum: "$total" } } },
      { $sort: { _id: 1 } }
    ]),
    Expense.aggregate([
      { $match: { owner, status: "approved", isDeleted: false, date: { $gte: from } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, total: { $sum: "$amount" } } },
      { $sort: { _id: 1 } }
    ]),
    Sale.aggregate([
      { $match: { owner, status: "completed", isDeleted: false } },
      { $group: { _id: "$paymentMethod", total: { $sum: "$total" } } },
      { $sort: { total: -1 } }
    ]),
    Sale.aggregate([
      { $match: { owner, status: "completed", isDeleted: false } },
      { $unwind: "$items" },
      { $group: { _id: "$items.productName", quantity: { $sum: "$items.quantity" }, revenue: { $sum: "$items.total" } } },
      { $sort: { quantity: -1 } },
      { $limit: 10 }
    ])
  ]);

  return successResponse(res, "Dashboard charts fetched", {
    salesChart,
    expenseChart,
    paymentMethodChart,
    topProducts
  });
});

exports.recentActivities = asyncHandler(async (req, res) => {
  const owner = getOwnerId(req);
  const [recentSales, recentPurchases, recentExpenses, recentStockMovements] = await Promise.all([
    Sale.find({ owner, isDeleted: false }).populate("customer", "name phone").populate("cashier", "name email").sort({ createdAt: -1 }).limit(5),
    Purchase.find({ owner, isDeleted: false }).populate("supplier", "name phone").populate("createdBy", "name email").sort({ createdAt: -1 }).limit(5),
    Expense.find({ owner, isDeleted: false }).populate("createdBy", "name email").sort({ date: -1 }).limit(5),
    StockMovement.find({ owner }).populate("product", "name barcode").populate("createdBy", "name email").sort({ createdAt: -1 }).limit(8)
  ]);

  return successResponse(res, "Recent activities fetched", {
    recentSales,
    recentPurchases,
    recentExpenses,
    recentStockMovements
  });
});
