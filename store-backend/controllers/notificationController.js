const Notification = require("../models/Notification");

const asyncHandler = require("../utils/asyncHandler");
const { successResponse, errorResponse } = require("../utils/apiResponse");

function getOwnerId(req) {
  return req.storeOwner || req.user.owner || req.user._id;
}

/* CREATE NOTIFICATION */
exports.createNotification = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);

  const { title, message, type = "info", module = "", actionUrl = "" } = req.body;

  if (!title || !title.trim()) {
    return errorResponse(res, "Notification title is required", 400);
  }

  if (!message || !message.trim()) {
    return errorResponse(res, "Notification message is required", 400);
  }

  const notification = await Notification.create({
    owner: ownerId,
    user: req.user._id,
    title: title.trim(),
    message: message.trim(),
    type,
    module,
    actionUrl
  });

  return successResponse(
    res,
    "Notification created successfully",
    notification,
    201
  );
});

/* GET NOTIFICATIONS */
exports.getNotifications = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);

  const {
    type,
    isRead,
    search,
    page = 1,
    limit = 50
  } = req.query;

  const query = {
    owner: ownerId
  };

  if (type && type !== "all") {
    query.type = type;
  }

  if (isRead === "true") query.isRead = true;
  if (isRead === "false") query.isRead = false;

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { message: { $regex: search, $options: "i" } },
      { module: { $regex: search, $options: "i" } }
    ];
  }

  const pageNumber = Math.max(Number(page) || 1, 1);
  const limitNumber = Math.max(Number(limit) || 50, 1);
  const skip = (pageNumber - 1) * limitNumber;

  const notifications = await Notification.find(query)
    .populate("user", "name email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNumber);

  const total = await Notification.countDocuments(query);

  const unreadCount = await Notification.countDocuments({
    owner: ownerId,
    isRead: false
  });

  return successResponse(res, "Notifications fetched successfully", {
    notifications,
    unreadCount,
    pagination: {
      total,
      page: pageNumber,
      pages: Math.ceil(total / limitNumber)
    }
  });
});

/* MARK ONE AS READ */
exports.markAsRead = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);

  const notification = await Notification.findOneAndUpdate(
    {
      _id: req.params.id,
      owner: ownerId
    },
    {
      isRead: true,
      readAt: new Date()
    },
    {
      new: true
    }
  );

  if (!notification) {
    return errorResponse(res, "Notification not found", 404);
  }

  return successResponse(
    res,
    "Notification marked as read",
    notification
  );
});

/* MARK ALL AS READ */
exports.markAllAsRead = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);

  await Notification.updateMany(
    {
      owner: ownerId,
      isRead: false
    },
    {
      isRead: true,
      readAt: new Date()
    }
  );

  return successResponse(res, "All notifications marked as read");
});

/* DELETE NOTIFICATION */
exports.deleteNotification = asyncHandler(async (req, res) => {
  const ownerId = getOwnerId(req);

  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    owner: ownerId
  });

  if (!notification) {
    return errorResponse(res, "Notification not found", 404);
  }

  return successResponse(res, "Notification deleted successfully");
});