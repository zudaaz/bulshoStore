const multer = require("multer");

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (process.env.NODE_ENV !== "test") {
    console.error(err);
  }

  let statusCode = err.statusCode || 500;
  let message = err.message || "Server Error";

  if (err instanceof multer.MulterError) {
    statusCode = 400;
    if (err.code === "LIMIT_FILE_SIZE") message = "Uploaded image is too large";
    else if (err.code === "LIMIT_FILE_COUNT") message = "Only one image may be uploaded";
    else message = err.message;
  }

  if (err.name === "CastError") {
    statusCode = 404;
    message = "Resource not found";
  }

  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0] || "Record";
    message = `${field} already exists`;
  }

  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((item) => item.message)
      .join(", ");
  }

  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }

  if (process.env.NODE_ENV === "production" && statusCode >= 500) {
    message = "An unexpected server error occurred";
  }

  return res.status(statusCode).json({ success: false, message });
};

module.exports = errorHandler;
