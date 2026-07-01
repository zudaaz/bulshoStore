const StaffAttendance = require("../models/StaffAttendance");
const Staff = require("../models/Staff");
const asyncHandler = require("../utils/asyncHandler");
const { successResponse, errorResponse } = require("../utils/apiResponse");

function ownerId(req) {
  return req.storeOwner || req.user.owner || req.user._id;
}

exports.getAttendance = asyncHandler(async (req, res) => {
  const query = { owner: ownerId(req) };
  if (req.query.date) query.date = req.query.date;
  if (req.query.staff) query.staff = req.query.staff;

  const attendance = await StaffAttendance.find(query)
    .populate("staff", "name email phone role")
    .populate("createdBy", "name email")
    .sort({ date: -1, createdAt: -1 });

  return successResponse(res, "Attendance fetched successfully", attendance);
});

exports.markAttendance = asyncHandler(async (req, res) => {
  const { staff, date, status, time = "" } = req.body;
  if (!staff || !date || !status) {
    return errorResponse(res, "Staff, date and status are required", 400);
  }
  if (!["Present", "Late", "Absent"].includes(status)) {
    return errorResponse(res, "Invalid attendance status", 400);
  }

  const owner = ownerId(req);
  const staffRecord = await Staff.findOne({ _id: staff, user: owner });
  if (!staffRecord) return errorResponse(res, "Staff member not found", 404);

  const attendance = await StaffAttendance.findOneAndUpdate(
    { owner, staff, date },
    { owner, staff, date, status, time, createdBy: req.user._id },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  ).populate("staff", "name email phone role");

  return successResponse(res, "Attendance saved successfully", attendance, 201);
});

exports.deleteAttendance = asyncHandler(async (req, res) => {
  const attendance = await StaffAttendance.findOneAndDelete({
    _id: req.params.id,
    owner: ownerId(req)
  });
  if (!attendance) return errorResponse(res, "Attendance record not found", 404);
  return successResponse(res, "Attendance deleted successfully");
});
