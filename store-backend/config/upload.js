const crypto = require("crypto");
const fs = require("fs");
const multer = require("multer");
const path = require("path");

const uploadPath = path.join(__dirname, "..", "uploads");
fs.mkdirSync(uploadPath, { recursive: true });

const allowedMimeTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"]
]);

const storage = multer.diskStorage({
  destination(req, file, callback) {
    callback(null, uploadPath);
  },
  filename(req, file, callback) {
    const extension = allowedMimeTypes.get(file.mimetype) || "";
    callback(null, `${Date.now()}-${crypto.randomBytes(12).toString("hex")}${extension}`);
  }
});

const maxUploadMb = Math.max(Number(process.env.MAX_UPLOAD_MB || 5), 1);

module.exports = multer({
  storage,
  limits: { fileSize: maxUploadMb * 1024 * 1024, files: 1 },
  fileFilter(req, file, callback) {
    if (!allowedMimeTypes.has(file.mimetype)) {
      const error = new Error("Only JPG, PNG, and WebP image files are allowed");
      error.statusCode = 400;
      return callback(error);
    }
    return callback(null, true);
  }
});
