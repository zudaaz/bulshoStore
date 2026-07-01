const sanitizeHtml = require("sanitize-html");

const sensitiveKeys = new Set([
  "password",
  "currentPassword",
  "newPassword",
  "confirmPassword",
  "refreshToken",
  "token"
]);

function clean(value, key = "") {
  if (typeof value === "string") {
    if (sensitiveKeys.has(key)) return value.replace(/\0/g, "");
    return sanitizeHtml(value.replace(/\0/g, ""), {
      allowedTags: [],
      allowedAttributes: {}
    }).trim();
  }
  if (Array.isArray(value)) return value.map((item) => clean(item));
  if (value && typeof value === "object") {
    for (const [childKey, childValue] of Object.entries(value)) {
      value[childKey] = clean(childValue, childKey);
    }
  }
  return value;
}

module.exports = function sanitizeInput(req, res, next) {
  if (req.body) clean(req.body);
  if (req.params) clean(req.params);
  next();
};
