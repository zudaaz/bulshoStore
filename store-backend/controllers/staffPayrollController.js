const StaffPayroll = require("../models/StaffPayroll");
const Staff = require("../models/Staff");
const asyncHandler = require("../utils/asyncHandler");
const { successResponse, errorResponse } = require("../utils/apiResponse");

function ownerId(req) {
  return req.storeOwner || req.user.owner || req.user._id;
}

exports.getPayroll = asyncHandler(async (req, res) => {
  const query = { owner: ownerId(req) };
  if (req.query.month) query.month = req.query.month;
  if (req.query.staff) query.staff = req.query.staff;
  if (req.query.status) query.status = req.query.status;

  const payrolls = await StaffPayroll.find(query)
    .populate("staff", "name email phone role salary")
    .populate("createdBy", "name email")
    .sort({ month: -1, createdAt: -1 });

  return successResponse(res, "Payroll fetched successfully", payrolls);
});

async function savePayroll(req, res, existingId = null) {
  const { staff, month, salary = 0, method = "Cash", status = "Pending", note = "" } = req.body;
  if (!staff || !month) return errorResponse(res, "Staff and month are required", 400);
  if (!/^\d{4}-\d{2}$/.test(month)) return errorResponse(res, "Month must use YYYY-MM format", 400);
  if (Number(salary) < 0) return errorResponse(res, "Salary cannot be negative", 400);

  const owner = ownerId(req);
  const staffRecord = await Staff.findOne({ _id: staff, user: owner });
  if (!staffRecord) return errorResponse(res, "Staff member not found", 404);

  const query = existingId ? { _id: existingId, owner } : { owner, staff, month };
  const payroll = await StaffPayroll.findOneAndUpdate(
    query,
    {
      owner,
      staff,
      month,
      salary: Number(salary),
      method,
      status,
      note,
      paidAt: status === "Paid" ? new Date() : null,
      createdBy: req.user._id
    },
    { new: true, upsert: !existingId, runValidators: true, setDefaultsOnInsert: true }
  ).populate("staff", "name email phone role salary");

  if (!payroll) return errorResponse(res, "Payroll record not found", 404);
  return successResponse(res, existingId ? "Payroll updated successfully" : "Payroll saved successfully", payroll, existingId ? 200 : 201);
}

exports.createPayroll = asyncHandler((req, res) => savePayroll(req, res));
exports.updatePayroll = asyncHandler((req, res) => savePayroll(req, res, req.params.id));

exports.deletePayroll = asyncHandler(async (req, res) => {
  const payroll = await StaffPayroll.findOneAndDelete({ _id: req.params.id, owner: ownerId(req) });
  if (!payroll) return errorResponse(res, "Payroll record not found", 404);
  return successResponse(res, "Payroll deleted successfully");
});
