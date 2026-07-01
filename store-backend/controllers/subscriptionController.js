const Subscription = require("../models/Subscription");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const Staff = require("../models/Staff");

const asyncHandler = require("../utils/asyncHandler");
const { successResponse, errorResponse } = require("../utils/apiResponse");

function getOwnerId(req) {
  return req.storeOwner || req.user.owner || req.user._id;
}

const plans = {
  Free: { price: 0, maxProducts: 100, maxStaff: 2, maxCustomers: 500 },
  Basic: { price: 10, maxProducts: 500, maxStaff: 5, maxCustomers: 2000 },
  Standard: { price: 25, maxProducts: 2000, maxStaff: 15, maxCustomers: 10000 },
  Premium: { price: 50, maxProducts: 10000, maxStaff: 50, maxCustomers: 50000 }
};

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + Number(months || 1));
  return d;
}

function invoiceNo() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `SUB-${date}-${random}`;
}

exports.getSubscriptionOverview = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);

  let activeSubscription = await Subscription.findOne({
    owner: ownerId,
    status: "active"
  }).sort({ createdAt: -1 });

  if (!activeSubscription) {
    activeSubscription = await Subscription.create({
      owner: ownerId,
      planName: "Free",
      price: 0,
      durationMonths: 1,
      startDate: new Date(),
      endDate: addMonths(new Date(), 1),
      maxProducts: 100,
      maxStaff: 2,
      maxCustomers: 500,
      invoiceNumber: invoiceNo()
    });
  }

  const productsUsed = await Product.countDocuments({
    owner: ownerId,
    isDeleted: false
  });

  const customersUsed = await Customer.countDocuments({
    owner: ownerId,
    isDeleted: false
  });

  const staffUsed = await Staff.countDocuments({
    user: ownerId
  });

  const history = await Subscription.find({
    owner: ownerId
  }).sort({ createdAt: -1 });

  return successResponse(res, "Subscription overview fetched", {
    activeSubscription,
    usage: {
      productsUsed,
      customersUsed,
      staffUsed
    },
    history,
    plans
  });
});

exports.createSubscription = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);

  const {
    planName,
    durationMonths = 1,
    paymentMethod = "cash",
    transactionReference = "",
    autoRenew = false,
    notes = ""
  } = req.body;

  if (!plans[planName]) {
    return errorResponse(res, "Invalid subscription plan", 400);
  }

  await Subscription.updateMany(
    { owner: ownerId, status: "active" },
    { status: "expired" }
  );

  const plan = plans[planName];
  const startDate = new Date();
  const endDate = addMonths(startDate, durationMonths);

  const subscription = await Subscription.create({
    owner: ownerId,
    planName,
    price: plan.price,
    durationMonths,
    startDate,
    endDate,
    maxProducts: plan.maxProducts,
    maxStaff: plan.maxStaff,
    maxCustomers: plan.maxCustomers,
    status: "active",
    paymentStatus: "paid",
    paymentMethod,
    transactionReference,
    autoRenew,
    invoiceNumber: invoiceNo(),
    notes
  });

  return successResponse(res, "Subscription created successfully", subscription, 201);
});

exports.renewSubscription = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);

  const subscription = await Subscription.findOne({
    _id: req.params.id,
    owner: ownerId
  });

  if (!subscription) {
    return errorResponse(res, "Subscription not found", 404);
  }

  const baseDate =
    new Date(subscription.endDate) > new Date()
      ? subscription.endDate
      : new Date();

  subscription.endDate = addMonths(baseDate, subscription.durationMonths || 1);
  subscription.status = "active";
  subscription.paymentStatus = "paid";
  subscription.cancelledAt = null;

  await subscription.save();

  return successResponse(res, "Subscription renewed successfully", subscription);
});

exports.cancelSubscription = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);

  const subscription = await Subscription.findOne({
    _id: req.params.id,
    owner: ownerId
  });

  if (!subscription) {
    return errorResponse(res, "Subscription not found", 404);
  }

  subscription.status = "cancelled";
  subscription.autoRenew = false;
  subscription.cancelledAt = new Date();

  await subscription.save();

  return successResponse(res, "Subscription cancelled successfully", subscription);
});

exports.deleteSubscription = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);

  const subscription = await Subscription.findOne({
    _id: req.params.id,
    owner: ownerId
  });

  if (!subscription) {
    return errorResponse(res, "Subscription not found", 404);
  }

  await subscription.deleteOne();

  return successResponse(res, "Subscription deleted successfully");
});