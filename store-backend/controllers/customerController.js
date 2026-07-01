const Customer = require("../models/Customer");
const Sale = require("../models/Sale");
const Payment = require("../models/Payment");

const asyncHandler = require("../utils/asyncHandler");
const { successResponse, errorResponse } = require("../utils/apiResponse");
const { createAuditLog } = require("../middleware/auditMiddleware");

function getOwnerId(req) {
  return req.storeOwner || req.user.owner || req.user._id;
}

function generateCustomerCode() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `CUS-${date}-${random}`;
}

/* CREATE CUSTOMER */
exports.createCustomer = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);

  if (!req.body.name || !req.body.name.trim()) {
    return errorResponse(res, "Customer name is required", 400);
  }

  const openingBalance = Number(req.body.openingBalance || 0);

  const customer = await Customer.create({
    owner: ownerId,
    createdBy: req.user._id,

    customerCode: req.body.customerCode || generateCustomerCode(),

    name: req.body.name.trim(),
    phone: req.body.phone || "",
    email: req.body.email || "",
    address: req.body.address || "",
    notes: req.body.notes || "",

    openingBalance,

    currentBalance:
      req.body.currentBalance !== undefined
        ? Number(req.body.currentBalance || 0)
        : openingBalance,

    totalSales: Number(req.body.totalSales || 0),
    totalPaid: Number(req.body.totalPaid || 0),

    status: req.body.status || "active",
    lastTransactionDate: null
  });

  await createAuditLog({
    req,
    action: "CREATE",
    module: "CUSTOMER",
    recordId: customer._id,
    newData: customer
  });

  return successResponse(
    res,
    "Customer created successfully",
    customer,
    201
  );
});

/* GET CUSTOMERS */
exports.getCustomers = asyncHandler(async (req, res) => {
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
      { customerCode: { $regex: search, $options: "i" } }
    ];
  }

  const customers = await Customer.find(query)
    .populate("createdBy", "name email")
    .sort({ createdAt: -1 });

  return successResponse(
    res,
    "Customers fetched successfully",
    customers
  );
});

/* GET SINGLE CUSTOMER */
exports.getCustomer = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);

  const customer = await Customer.findOne({
    _id: req.params.id,
    owner: ownerId,
    isDeleted: false
  }).populate("createdBy", "name email");

  if (!customer) {
    return errorResponse(res, "Customer not found", 404);
  }

  return successResponse(
    res,
    "Customer fetched successfully",
    customer
  );
});

/* UPDATE CUSTOMER */
exports.updateCustomer = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);

  const customer = await Customer.findOne({
    _id: req.params.id,
    owner: ownerId,
    isDeleted: false
  });

  if (!customer) {
    return errorResponse(res, "Customer not found", 404);
  }

  const oldData = customer.toObject();

  customer.name = req.body.name?.trim() ?? customer.name;
  customer.phone = req.body.phone ?? customer.phone;
  customer.email = req.body.email ?? customer.email;
  customer.address = req.body.address ?? customer.address;
  customer.notes = req.body.notes ?? customer.notes;

  customer.openingBalance = Number(
    req.body.openingBalance ?? customer.openingBalance
  );

  customer.currentBalance = Number(
    req.body.currentBalance ?? customer.currentBalance
  );

  customer.totalSales = Number(
    req.body.totalSales ?? customer.totalSales
  );

  customer.totalPaid = Number(
    req.body.totalPaid ?? customer.totalPaid
  );

  customer.status = req.body.status ?? customer.status;
  customer.customerCode =
    req.body.customerCode ?? customer.customerCode;

  customer.owner = ownerId;
  customer.createdBy = customer.createdBy || req.user._id;

  await customer.save();

  await createAuditLog({
    req,
    action: "UPDATE",
    module: "CUSTOMER",
    recordId: customer._id,
    oldData,
    newData: customer
  });

  return successResponse(
    res,
    "Customer updated successfully",
    customer
  );
});

/* DELETE CUSTOMER */
exports.deleteCustomer = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);

  const customer = await Customer.findOne({
    _id: req.params.id,
    owner: ownerId,
    isDeleted: false
  });

  if (!customer) {
    return errorResponse(res, "Customer not found", 404);
  }

  const salesCount = await Sale.countDocuments({
    customer: customer._id,
    owner: ownerId,
    isDeleted: false
  });

  if (salesCount > 0) {
    return errorResponse(
      res,
      "Cannot delete customer because this customer has sales history",
      400
    );
  }

  if (Number(customer.currentBalance || 0) > 0) {
    return errorResponse(
      res,
      "Cannot delete customer because this customer has outstanding balance",
      400
    );
  }

  const oldData = customer.toObject();

  customer.isDeleted = true;
  customer.status = "inactive";

  await customer.save();

  await createAuditLog({
    req,
    action: "DELETE",
    module: "CUSTOMER",
    recordId: customer._id,
    oldData
  });

  return successResponse(
    res,
    "Customer deleted successfully"
  );
});

/* CUSTOMER STATEMENT */
exports.getCustomerStatement = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);
  const customerId = req.params.id;

  const customer = await Customer.findOne({
    _id: customerId,
    owner: ownerId,
    isDeleted: false
  });

  if (!customer) {
    return errorResponse(res, "Customer not found", 404);
  }

  const sales = await Sale.find({
    customer: customerId,
    owner: ownerId,
    isDeleted: false
  }).sort({ createdAt: -1 });

  const payments = await Payment.find({
    referenceId: customerId,
    owner: ownerId,
    isDeleted: false
  }).sort({ createdAt: -1 });

  let totalSales = 0;
  let totalPaid = 0;
  let totalManualCredit = 0;

  const saleTransactions = sales.map((sale) => {
    totalSales += Number(sale.total || 0);
    totalPaid += Number(sale.paidAmount || 0);

    return {
      type: "sale",
      date: sale.createdAt,
      invoice: sale.invoiceNumber,
      description: "Sale invoice",
      total: sale.total,
      paid: sale.paidAmount,
      balance: sale.balance,
      amount: sale.balance,
      direction: sale.balance > 0 ? "gave" : "received",
      status: sale.paymentStatus
    };
  });

  const paymentTransactions = payments.map((payment) => {
    const isCredit = payment.type === "customer_credit";

    if (isCredit) {
      totalManualCredit += Number(payment.amount || 0);
    } else {
      totalPaid += Number(payment.amount || 0);
    }

    return {
      type: payment.type,
      date: payment.createdAt,
      invoice: payment.paymentNumber || payment._id,
      description:
        payment.note || (isCredit ? "Manual credit" : "Payment received"),
      total: payment.amount,
      paid: isCredit ? 0 : payment.amount,
      balance: isCredit ? payment.amount : 0,
      amount: payment.amount,
      direction: isCredit ? "gave" : "received",
      status: payment.method
    };
  });

  const statement = [...saleTransactions, ...paymentTransactions].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  return successResponse(
    res,
    "Customer statement fetched successfully",
    {
      customer,
      summary: {
        totalSales,
        totalManualCredit,
        totalPaid,
        balance: customer.currentBalance
      },
      statement
    }
  );
});