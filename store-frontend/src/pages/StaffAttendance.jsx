import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import {
  CalendarCheck,
  Search,
  Users,
  CheckCircle2,
  XCircle,
  Clock3,
  CalendarDays,
  Download,
  RotateCcw,
  Save
} from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";
import api from "../api/client";

export default function StaffAttendance() {
  const [staff, setStaff] = useState([]);
  const [attendance, setAttendance] = useState([]);

  const [loading, setLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] =
    useState(false);

  const [search, setSearch] = useState("");

  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  useEffect(() => {
    loadStaff();
  }, []);

  useEffect(() => {
    loadAttendance();
  }, [date]);

  async function loadStaff() {
    try {
      setLoading(true);

      const res = await api.get("/staff");

      const data =
        res.data?.data?.staff ||
        res.data?.data ||
        res.data?.staff ||
        [];

      setStaff(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log(error);

      toast.error(
        error.response?.data?.message ||
          "Failed to load staff"
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadAttendance() {
    try {
      setAttendanceLoading(true);

      const res = await api.get(
        `/staff-attendance?date=${date}`
      );

      const data =
        res.data?.data?.attendance ||
        res.data?.data ||
        [];

      setAttendance(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log(error);

      toast.error(
        error.response?.data?.message ||
          "Failed to load attendance"
      );
    } finally {
      setAttendanceLoading(false);
    }
  }

  const filteredStaff = useMemo(() => {
    return staff.filter((item) => {
      const text =
        `${item.name || ""} ${item.email || ""} ${
          item.phone || ""
        } ${item.role || ""}`.toLowerCase();

      return text.includes(search.toLowerCase());
    });
  }, [staff, search]);

  const presentCount = attendance.filter(
    (item) => item.status === "Present"
  ).length;

  const absentCount = attendance.filter(
    (item) => item.status === "Absent"
  ).length;

  const lateCount = attendance.filter(
    (item) => item.status === "Late"
  ).length;

  async function markAttendance(
    staffId,
    status
  ) {
    try {
      await api.post("/staff-attendance", {
        staff: staffId,
        date,
        status,
        time: new Date().toLocaleTimeString()
      });

      toast.success(
        `Marked as ${status}`
      );

      loadAttendance();
    } catch (error) {
      console.log(error);

      toast.error(
        error.response?.data?.message ||
          "Failed to mark attendance"
      );
    }
  }

  async function resetDay() {
    if (
      !window.confirm(
        "Reset attendance for this date?"
      )
    )
      return;

    try {
      const records = attendance || [];

      await Promise.all(
        records.map((item) =>
          api.delete(
            `/staff-attendance/${item._id}`
          )
        )
      );

      toast.success(
        "Attendance reset successfully"
      );

      loadAttendance();
    } catch (error) {
      console.log(error);

      toast.error("Failed to reset attendance");
    }
  }

  function exportCSV() {
    const rows = [
      [
        "Date",
        "Staff Name",
        "Role",
        "Status",
        "Time"
      ],

      ...filteredStaff.map((item) => {
        const record = attendance.find(
          (a) =>
            a.staff?._id === item._id
        );

        return [
          date,
          item.name,
          item.role,
          record?.status ||
            "Not Marked",
          record?.time || "-"
        ];
      })
    ];

    const csv = rows
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv"
    });

    const url =
      URL.createObjectURL(blob);

    const a =
      document.createElement("a");

    a.href = url;

    a.download = `staff-attendance-${date}.csv`;

    a.click();

    URL.revokeObjectURL(url);
  }

  return (
    <DashboardLayout>
      <div className="space-y-7">
        {/* HERO */}
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#071B34] via-[#0B2545] to-[#0E7490] p-7 text-white shadow-2xl">
          <div className="absolute top-[-80px] right-[-80px] w-[260px] h-[260px] rounded-full bg-white/10 blur-3xl" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div>
              <h1 className="text-4xl font-black">
                Staff Attendance
              </h1>

              <p className="text-white/80 mt-2 text-lg">
                Manage staff attendance
                records dynamically.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={exportCSV}
                className="bg-white/15 hover:bg-white/25 text-white px-6 py-4 rounded-2xl font-black flex items-center gap-2"
              >
                <Download size={18} />
                Export CSV
              </button>

              <button
                onClick={resetDay}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-4 rounded-2xl font-black flex items-center gap-2"
              >
                <RotateCcw size={18} />
                Reset Day
              </button>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          <StatCard
            title="Total Staff"
            value={staff.length}
            icon={Users}
            color="from-indigo-500 to-violet-600"
          />

          <StatCard
            title="Present"
            value={presentCount}
            icon={CheckCircle2}
            color="from-green-500 to-emerald-600"
          />

          <StatCard
            title="Absent"
            value={absentCount}
            icon={XCircle}
            color="from-red-500 to-orange-600"
          />

          <StatCard
            title="Late"
            value={lateCount}
            icon={Clock3}
            color="from-yellow-500 to-amber-600"
          />
        </div>

        {/* FILTERS */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-4 top-4 text-slate-400"
              />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="Search staff..."
                className="w-full bg-slate-100 dark:bg-slate-800 dark:text-white rounded-2xl pl-12 pr-4 py-4 outline-none"
              />
            </div>

            <div className="relative">
              <CalendarDays
                size={18}
                className="absolute left-4 top-4 text-slate-400"
              />

              <input
                type="date"
                value={date}
                onChange={(e) =>
                  setDate(
                    e.target.value
                  )
                }
                className="w-full bg-slate-100 dark:bg-slate-800 dark:text-white rounded-2xl pl-12 pr-4 py-4 outline-none"
              />
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#0E7490]/10 text-[#0E7490] flex items-center justify-center">
              <CalendarCheck size={24} />
            </div>

            <div>
              <h2 className="text-2xl font-black">
                Attendance List
              </h2>

              <p className="text-slate-500 text-sm">
                Date: {date}
              </p>
            </div>
          </div>

          {loading ||
          attendanceLoading ? (
            <div className="p-16 text-center">
              <div className="w-12 h-12 mx-auto rounded-full border-4 border-[#0E7490] border-t-transparent animate-spin" />

              <p className="mt-4 text-slate-500">
                Loading...
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <Th text="Staff" />
                    <Th text="Role" />
                    <Th text="Status" />
                    <Th text="Time" />
                    <Th
                      text="Action"
                      right
                    />
                  </tr>
                </thead>

                <tbody>
                  {filteredStaff.map(
                    (item) => {
                      const record =
                        attendance.find(
                          (a) =>
                            a
                              .staff
                              ?._id ===
                            item._id
                        );

                      return (
                        <tr
                          key={
                            item._id
                          }
                          className="border-b border-slate-100 dark:border-slate-800"
                        >
                          <Td>
                            <div>
                              <h3 className="font-black">
                                {
                                  item.name
                                }
                              </h3>

                              <p className="text-xs text-slate-400">
                                {
                                  item.email
                                }
                              </p>
                            </div>
                          </Td>

                          <Td>
                            {
                              item.role
                            }
                          </Td>

                          <Td>
                            <StatusBadge
                              status={
                                record?.status ||
                                "Not Marked"
                              }
                            />
                          </Td>

                          <Td>
                            {record?.time ||
                              "-"}
                          </Td>

                          <Td right>
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() =>
                                  markAttendance(
                                    item._id,
                                    "Present"
                                  )
                                }
                                className="px-4 py-2 rounded-xl bg-green-100 text-green-700 font-black hover:bg-green-600 hover:text-white transition"
                              >
                                Present
                              </button>

                              <button
                                onClick={() =>
                                  markAttendance(
                                    item._id,
                                    "Late"
                                  )
                                }
                                className="px-4 py-2 rounded-xl bg-yellow-100 text-yellow-700 font-black hover:bg-yellow-500 hover:text-white transition"
                              >
                                Late
                              </button>

                              <button
                                onClick={() =>
                                  markAttendance(
                                    item._id,
                                    "Absent"
                                  )
                                }
                                className="px-4 py-2 rounded-xl bg-red-100 text-red-700 font-black hover:bg-red-600 hover:text-white transition"
                              >
                                Absent
                              </button>
                            </div>
                          </Td>
                        </tr>
                      );
                    }
                  )}

                  {filteredStaff.length ===
                    0 && (
                    <tr>
                      <td
                        colSpan="5"
                        className="p-12 text-center text-slate-500"
                      >
                        No staff found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="p-5 flex justify-end">
            <button
              onClick={() =>
                toast.success(
                  "Attendance saved successfully"
                )
              }
              className="bg-gradient-to-r from-[#0B2545] to-[#0E7490] text-white px-7 py-4 rounded-2xl font-black flex items-center gap-2"
            >
              <Save size={18} />
              Save Attendance
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatusBadge({ status }) {
  const styles = {
    Present:
      "bg-green-100 text-green-700",

    Late:
      "bg-yellow-100 text-yellow-700",

    Absent:
      "bg-red-100 text-red-700",

    "Not Marked":
      "bg-slate-100 text-slate-600"
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-black ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 shadow-sm border border-slate-100 dark:border-slate-800">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-500 text-sm">
            {title}
          </p>

          <h2 className="text-3xl font-black mt-2">
            {value}
          </h2>
        </div>

        <div
          className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${color} text-white flex items-center justify-center shadow-lg`}
        >
          <Icon size={30} />
        </div>
      </div>
    </div>
  );
}

function Th({ text, right }) {
  return (
    <th
      className={`px-6 py-4 text-sm font-black ${
        right
          ? "text-right"
          : "text-left"
      }`}
    >
      {text}
    </th>
  );
}

function Td({ children, right }) {
  return (
    <td
      className={`px-6 py-4 text-sm ${
        right
          ? "text-right"
          : "text-left"
      }`}
    >
      {children}
    </td>
  );
}