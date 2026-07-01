const asyncHandler = require("../utils/asyncHandler");
const { successResponse, errorResponse } = require("../utils/apiResponse");

function normalizePhone(phone) {
  const value = String(phone || "").replace(/[^\d+]/g, "");
  if (value.startsWith("+")) return value;
  if (value.startsWith("252")) return `+${value}`;
  if (value.startsWith("0")) return `+252${value.slice(1)}`;
  return value ? `+252${value}` : "";
}

exports.sendCustomerSMS = asyncHandler(async (req, res) => {
  const { phone, message } = req.body;
  const recipient = normalizePhone(phone);

  if (!recipient || !message) {
    return errorResponse(res, "Phone number and message are required", 400);
  }
  if (String(message).length > 480) {
    return errorResponse(res, "SMS message cannot exceed 480 characters", 400);
  }

  const apiUrl = process.env.HORMUUD_SMS_API_URL;
  if (!apiUrl) {
    return errorResponse(
      res,
      "SMS provider is not configured. Set HORMUUD_SMS_API_URL and provider credentials.",
      503
    );
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: process.env.HORMUUD_SMS_USERNAME,
      password: process.env.HORMUUD_SMS_PASSWORD,
      senderId: process.env.HORMUUD_SMS_SENDER_ID || "Bulsho",
      phone: recipient,
      message: String(message)
    }),
    signal: AbortSignal.timeout(15000)
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    return errorResponse(res, body.message || "SMS provider rejected the request", 502);
  }

  return successResponse(res, "SMS sent successfully", {
    recipient,
    providerResponse: body
  });
});
