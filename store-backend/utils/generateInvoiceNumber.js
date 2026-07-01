const crypto = require("crypto");

function createDocumentNumber(prefix) {
  const now = new Date();
  const date = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0")
  ].join("");
  const time = [
    String(now.getUTCHours()).padStart(2, "0"),
    String(now.getUTCMinutes()).padStart(2, "0"),
    String(now.getUTCSeconds()).padStart(2, "0"),
    String(now.getUTCMilliseconds()).padStart(3, "0")
  ].join("");
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();

  return `${prefix}-${date}-${time}-${random}`;
}

exports.generateInvoiceNumber = async () => createDocumentNumber("INV");
exports.generateReceiptNumber = async () => createDocumentNumber("REC");
