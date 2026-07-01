import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import {
  Wallet,
  Search,
  Users,
  CheckCircle2,
  Clock3,
  Download,
  ReceiptText,
  CalendarDays,
  CreditCard,
  Save
} from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";
import api from "../api/client";

export default function StaffPayroll() {
  const [staff, setStaff] = useState([]);
  const [payroll, setPayroll] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");

  const [month, setMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  useEffect(() => {
    loadData();
  }, [month]);

  async function loadData() {
    try {
      setLoading(true);

      const [staffRes, payrollRes] = await Promise.all([
        api.get("/staff"),
        api.get(`/staff-payroll?month=${month}`)
      ]);

      const staffData =
        staffRes.data?.data?.staff ||
        staffRes.data?.data ||
        [];

      const payrollData =
        payrollRes.data?.data?.payrolls ||
        payrollRes.data?.data ||
        [];

      setStaff(Array.isArray(staffData) ? staffData : []);
      setPayroll(Array.isArray(payrollData) ? payrollData : []);
    } catch (error) {
      console.log(error);

      toast.error(
        error.response?.data?.message ||
          "Failed to load payroll"
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredStaff = useMemo(() => {
    return staff.filter((item) => {
      const text =
        `${item.name || ""} ${item.email || ""} ${item.role || ""}`.toLowerCase();

      return text.includes(search.toLowerCase());
    });
  }, [staff, search]);

  function getPayroll(staffId) {
    return payroll.find(
      (item) =>
        item.staff?._id === staffId ||
        item.staff === staffId
    );
  }

  function getSalary(staffMember) {
    const record = getPayroll(staffMember._id);

    return Number(
      record?.salary ??
        staffMember.salary ??
        0
    );
  }

  const totalSalary = staff.reduce(
    (sum, item) => sum + getSalary(item),
    0
  );

  const paidTotal = staff.reduce((sum, item) => {
    const record = getPayroll(item._id);

    if (record?.status === "Paid") {
      return sum + getSalary(item);
    }

    return sum;
  }, 0);

  const pendingTotal = totalSalary - paidTotal;

  const paidCount = staff.filter(
    (item) => getPayroll(item._id)?.status === "Paid"
  ).length;

  async function updatePayroll(staffMember, updates = {}) {
    try {
      const existing = getPayroll(staffMember._id);

      const payload = {
        staff: staffMember._id,
        month,

        salary: Number(
          updates.salary ??
            existing?.salary ??
            staffMember.salary ??
            0
        ),

        method:
          updates.method ??
          existing?.method ??
          "Cash",

        status:
          updates.status ??
          existing?.status ??
          "Pending",

        note:
          updates.note ??
          existing?.note ??
          ""
      };

      if (existing?._id) {
        await api.put(`/staff-payroll/${existing._id}`, payload);
      } else {
        await api.post("/staff-payroll", payload);
      }

      await loadData();
    } catch (error) {
      console.log(error);

      toast.error(
        error.response?.data?.message ||
          "Failed to update payroll"
      );
    }
  }

  async function markPaid(staffMember) {
    const existing = getPayroll(staffMember._id);

    await updatePayroll(staffMember, {
      salary: existing?.salary || staffMember.salary || 0,
      status: "Paid"
    });

    toast.success("Salary paid");
  }

  async function markPending(staffMember) {
    const existing = getPayroll(staffMember._id);

    await updatePayroll(staffMember, {
      salary: existing?.salary || staffMember.salary || 0,
      status: "Pending"
    });

    toast.success("Marked as pending");
  }

  async function savePayroll() {
    try {
      setSaving(true);

      await Promise.all(
        staff.map((staffMember) => {
          const existing = getPayroll(staffMember._id);

          return updatePayroll(staffMember, {
            salary:
              existing?.salary ||
              staffMember.salary ||
              0,

            method:
              existing?.method ||
              "Cash",

            status:
              existing?.status ||
              "Pending"
          });
        })
      );

      toast.success("Payroll saved successfully");
    } catch (error) {
      console.log(error);
      toast.error("Failed to save payroll");
    } finally {
      setSaving(false);
    }
  }

  function exportCSV() {
    const rows = [
      [
        "Month",
        "Staff Name",
        "Role",
        "Salary",
        "Status",
        "Method"
      ],

      ...filteredStaff.map((item) => {
        const record = getPayroll(item._id);

        return [
          month,
          item.name,
          item.role,
          record?.salary || item.salary || 0,
          record?.status || "Pending",
          record?.method || "Cash"
        ];
      })
    ];

    const csv = rows
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv"
    });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;
    a.download = `staff-payroll-${month}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  function money(value) {
    const settings = JSON.parse(
      localStorage.getItem("store_settings") || "{}"
    );

    const currency =
      settings.currency ||
      localStorage.getItem("app_currency") ||
      "USD";

    return `${currency} ${Number(value || 0).toLocaleString()}`;
  }

  return (
    <DashboardLayout>
      <div className="space-y-7">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#071B34] via-[#0B2545] to-[#0E7490] p-7 text-white shadow-2xl">
          <div className="absolute top-[-80px] right-[-80px] w-[260px] h-[260px] rounded-full bg-white/10 blur-3xl" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div>
              <h1 className="text-4xl font-black">
                Staff Payroll
              </h1>

              <p className="text-white/80 mt-2 text-lg">
                Manage staff salaries dynamically using the Supabase payroll system.
              </p>
            </div>

            <div className="flex gap-3 flex-wrap">
              <button
                onClick={exportCSV}
                className="bg-white/15 hover:bg-white/25 text-white px-6 py-4 rounded-2xl font-black flex items-center gap-2"
              >
                <Download size={18} />
                Export CSV
              </button>

              <button
                onClick={savePayroll}
                disabled={saving}
                className="bg-white text-[#0B2545] hover:bg-slate-100 px-6 py-4 rounded-2xl font-black flex items-center gap-2 shadow-xl disabled:opacity-60"
              >
                <Save size={18} />
                {saving ? "Saving..." : "Save Payroll"}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          <StatCard
            title="Total Staff"
            value={staff.length}
            icon={Users}
            color="from-indigo-500 to-violet-600"
          />

          <StatCard
            title="Total Salary"
            value={money(totalSalary)}
            icon={Wallet}
            color="from-blue-500 to-cyan-600"
          />

          <StatCard
            title="Paid"
            value={money(paidTotal)}
            icon={CheckCircle2}
            color="from-green-500 to-emerald-600"
          />

          <StatCard
            title="Pending"
            value={money(pendingTotal)}
            icon={Clock3}
            color="from-orange-500 to-amber-600"
          />
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-4 top-4 text-slate-400"
              />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800 dark:text-white rounded-2xl pl-12 pr-4 py-4 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#0E7490]/10 text-[#0E7490] flex items-center justify-center">
              <ReceiptText size={24} />
            </div>

            <div>
              <h2 className="text-2xl font-black">
                Payroll List
              </h2>

              <p className="text-slate-500 text-sm">
                Month: {month}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="p-16 text-center">
              <div className="w-12 h-12 mx-auto rounded-full border-4 border-[#0E7490] border-t-transparent animate-spin" />

              <p className="mt-4 text-slate-500">
                Loading payroll...
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px]">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <Th text="Staff" />
                    <Th text="Role" />
                    <Th text="Salary" />
                    <Th text="Method" />
                    <Th text="Status" />
                    <Th text="Action" right />
                  </tr>
                </thead>

                <tbody>
                  {filteredStaff.map((item) => {
                    const record = getPayroll(item._id);

                    return (
                      <tr
                        key={item._id}
                        className="border-b border-slate-100 dark:border-slate-800"
                      >
                        <Td>
                          <div>
                            <h3 className="font-black">
                              {item.name}
                            </h3>

                            <p className="text-xs text-slate-400">
                              {item.email}
                            </p>
                          </div>
                        </Td>

                        <Td>{item.role}</Td>

                        <Td>
                          <input
                            type="number"
                            defaultValue={
                              record?.salary ??
                              item.salary ??
                              0
                            }
                            onBlur={(e) =>
                              updatePayroll(item, {
                                salary: e.target.value
                              })
                            }
                            className="w-32 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 dark:text-white outline-none"
                          />
                        </Td>

                        <Td>
                          <select
                            value={record?.method || "Cash"}
                            onChange={(e) =>
                              updatePayroll(item, {
                                method: e.target.value
                              })
                            }
                            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 dark:text-white outline-none"
                          >
                            <option value="Cash">Cash</option>
                            <option value="Bank">Bank</option>
                            <option value="Mobile Money">
                              Mobile Money
                            </option>
                          </select>
                        </Td>

                        <Td>
                          <StatusBadge
                            status={record?.status || "Pending"}
                          />
                        </Td>

                        <Td right>
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => markPaid(item)}
                              className="px-4 py-2 rounded-xl bg-green-100 text-green-700 font-black hover:bg-green-600 hover:text-white transition"
                            >
                              Pay
                            </button>

                            <button
                              onClick={() => markPending(item)}
                              className="px-4 py-2 rounded-xl bg-orange-100 text-orange-700 font-black hover:bg-orange-500 hover:text-white transition"
                            >
                              Pending
                            </button>
                          </div>
                        </Td>
                      </tr>
                    );
                  })}

                  {filteredStaff.length === 0 && (
                    <tr>
                      <td
                        colSpan="6"
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

          <div className="p-5 flex justify-between items-center flex-wrap gap-3">
            <p className="text-slate-500 font-bold">
              Paid Staff: {paidCount} / {staff.length}
            </p>

            <button
              onClick={savePayroll}
              disabled={saving}
              className="bg-gradient-to-r from-[#0B2545] to-[#0E7490] text-white px-7 py-4 rounded-2xl font-black flex items-center gap-2 disabled:opacity-60"
            >
              <CreditCard size={18} />
              {saving ? "Saving..." : "Save Payroll"}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatusBadge({ status }) {
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-black ${
        status === "Paid"
          ? "bg-green-100 text-green-700"
          : "bg-orange-100 text-orange-700"
      }`}
    >
      {status}
    </span>
  );
}

function StatCard({ title, value, icon: Icon, color }) {
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
        right ? "text-right" : "text-left"
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
        right ? "text-right" : "text-left"
      }`}
    >
      {children}
    </td>
  );
}