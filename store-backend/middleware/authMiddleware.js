const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token && req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized. Please login first."
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "User inactive"
      });
    }

    const storeOwner =
      user.role === "admin"
        ? user._id
        : user.owner || user._id;

    req.user = {
      _id: user._id,
      id: user._id,

      owner: user.owner || null,
      staffProfile: user.staffProfile || null,

      name: user.name,
      email: user.email,

      role: user.role || "staff",

      permissions: Array.isArray(user.permissions)
        ? user.permissions
        : [],

      storeName: user.storeName || "Bulsho Store",

      phone: user.phone || "",
      address: user.address || "",
      country: user.country || "Somalia",
      timezone: user.timezone || "Africa/Mogadishu",

      avatar: user.avatar || "",
      isActive: user.isActive
    };

    req.storeOwner = storeOwner;
    req.createdBy = user._id;

    next();
  } catch (error) {
    console.log("AUTH ERROR:", error.message);

    return res.status(401).json({
      success: false,
      message: "Token invalid or expired"
    });
  }
};