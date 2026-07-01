import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  Pencil,
  Trash2,
  UserCheck,
  Briefcase,
  X,
  Eye,
  Wallet,
  CalendarDays,
  KeyRound,
  CheckCircle2
} from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";
import api from "../api/client";

const permissionOptions = [
  "view_dashboard",

  "manage_products",
  "view_products",
  "create_product",
  "edit_product",
  "delete_product",

  "manage_inventory",
  "adjust_stock",
  "view_low_stock",
  "view_stock_report",

  "manage_sales",
  "create_sale",
  "view_sales",
  "delete_sale",
  "print_receipt",

  "manage_purchases",
  "create_purchase",
  "view_purchases",
  "delete_purchase",

  "manage_customers",
  "create_customer",
  "edit_customer",
  "view_customers",
  "delete_customer",

  "manage_suppliers",
  "create_supplier",
  "edit_supplier",
  "view_suppliers",
  "delete_supplier",

  "manage_expenses",
  "create_expense",
  "edit_expense",
  "view_expenses",
  "delete_expense",

  "view_reports",
  "export_reports",

  "manage_settings",
  "manage_staff",
  "view_audit_logs"
];

const permissionLabels = {
  view_dashboard: "Dashboard Access",

  manage_products: "Manage Products",
  view_products: "View Products",
  create_product: "Create Product",
  edit_product: "Edit Product",
  delete_product: "Delete Product",

  manage_inventory: "Manage Stock",
  adjust_stock: "Adjust Stock",
  view_low_stock: "View Low Stock",
  view_stock_report: "View Stock Report",

  manage_sales: "Manage Sales",
  create_sale: "Create Bills",
  view_sales: "View Sales",
  delete_sale: "Delete Sale",
  print_receipt: "Print Receipt",

  manage_purchases: "Manage Purchases",
  create_purchase: "Create Purchase",
  view_purchases: "View Purchases",
  delete_purchase: "Delete Purchase",

  manage_customers: "Manage Customers",
  create_customer: "Create Customer",
  edit_customer: "Edit Customer",
  view_customers: "View Customers",
  delete_customer: "Delete Customer",

  manage_suppliers: "Manage Suppliers",
  create_supplier: "Create Supplier",
  edit_supplier: "Edit Supplier",
  view_suppliers: "View Suppliers",
  delete_supplier: "Delete Supplier",

  manage_expenses: "Manage Expenses",
  create_expense: "Create Expense",
  edit_expense: "Edit Expense",
  view_expenses: "View Expenses",
  delete_expense: "Delete Expense",

  view_reports: "View Reports",
  export_reports: "Export Reports",

  manage_settings: "Manage Settings",
  manage_staff: "Manage Staff",
  view_audit_logs: "View Audit Logs"
};

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  role: "Cashier",
  department: "",
  salary: "",
  status: "Active",
  permissions: []
};

export default function Staff() {
  const [staff, setStaff] = useState([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadStaff();
  }, []);

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
      toast.error(error.response?.data?.message || "Failed to load staff");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    return staff.filter((item) => {
      const text = `${item.name || ""} ${item.email || ""} ${item.phone || ""} ${
        item.role || ""
      } ${item.department || ""} ${item.status || ""}`.toLowerCase();

      return text.includes(search.toLowerCase());
    });
  }, [staff, search]);

  const totalSalary = staff.reduce(
    (sum, item) => sum + Number(item.salary || 0),
    0
  );

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(item) {
    setEditingId(item._id);

    setForm({
      name: item.name || "",
      email: item.email || "",
      phone: item.phone || "",
      password: "",
      role: item.role || "Cashier",
      department: item.department || "",
      salary: item.salary || "",
      status: item.status || "Active",
      permissions: Array.isArray(item.permissions) ? item.permissions : []
    });

    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function togglePermission(permission) {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((item) => item !== permission)
        : [...prev.permissions, permission]
    }));
  }

  async function saveStaff(e) {
    e.preventDefault();

    if (!form.name || !form.email || !form.phone) {
      toast.error("Please fill all required fields");
      return;
    }

    if (!editingId && !form.password) {
      toast.error("Password is required for staff login");
      return;
    }

    if (form.password && form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        ...form,
        salary: Number(form.salary || 0),
        permissions: form.permissions || []
      };

      if (!payload.password) {
        delete payload.password;
      }

      if (editingId) {
        await api.put(`/staff/${editingId}`, payload);
        toast.success("Staff updated successfully");
      } else {
        await api.post("/staff", payload);
        toast.success("Staff created successfully. Staff can now login.");
      }

      closeModal();
      await loadStaff();
    } catch (error) {
      console.log(error);
      toast.error(error.response?.data?.message || "Failed to save staff");
    } finally {
      setSaving(false);
    }
  }

  async function deleteStaff(id) {
    if (!window.confirm("Delete this staff member?")) return;

    try {
      await api.delete(`/staff/${id}`);
      toast.success("Staff deleted successfully");
      await loadStaff();
    } catch (error) {
      console.log(error);
      toast.error(error.response?.data?.message || "Failed to delete staff");
    }
  }

  function getRoleColor(role) {
    switch (role) {
      case "Admin":
        return "bg-red-100 text-red-700";
      case "Manager":
        return "bg-indigo-100 text-indigo-700";
      case "Cashier":
        return "bg-green-100 text-green-700";
      case "Accountant":
        return "bg-orange-100 text-orange-700";
      case "Store Keeper":
        return "bg-cyan-100 text-cyan-700";
      case "Sales Officer":
        return "bg-purple-100 text-purple-700";
      case "Inventory Officer":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  }

  function money(value) {
    const settings = JSON.parse(localStorage.getItem("store_settings") || "{}");
    const currency =
      settings.currency || localStorage.getItem("app_currency") || "USD";

    return `${currency} ${Number(value || 0).toLocaleString()}`;
  }

  return (
    <DashboardLayout>
      <div className="space-y-7">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#071B34] via-[#0B2545] to-[#0E7490] p-7 text-white shadow-2xl">
          <div className="absolute top-[-80px] right-[-80px] w-[260px] h-[260px] rounded-full bg-white/10 blur-3xl" />

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 relative z-10">
            <div>
              <h1 className="text-4xl font-black">Staff Management</h1>
              <p className="text-white/80 mt-2 text-lg">
                Manage staff login accounts, salaries, roles and backend permissions.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreate}
              className="bg-white text-[#0B2545] hover:bg-slate-100 px-6 py-4 rounded-2xl font-black flex items-center gap-2 shadow-xl"
            >
              <Plus size={20} />
              Add Staff
            </button>
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
            title="Managers"
            value={staff.filter((s) => s.role === "Manager").length}
            icon={Briefcase}
            color="from-blue-500 to-cyan-600"
          />

          <StatCard
            title="Active Staff"
            value={staff.filter((s) => s.status === "Active").length}
            icon={UserCheck}
            color="from-green-500 to-emerald-600"
          />

          <StatCard
            title="Total Salary"
            value={money(totalSalary)}
            icon={Wallet}
            color="from-orange-500 to-amber-600"
          />
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="relative max-w-xl">
            <Search
              size={18}
              className="absolute left-4 top-4 text-slate-400"
            />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search staff..."
              className="w-full bg-slate-100 dark:bg-slate-800 dark:text-white rounded-2xl pl-12 pr-4 py-4 outline-none focus:ring-2 focus:ring-[#0E7490]"
            />
          </div>
        </div>

        {loading ? (
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-14 text-center border border-slate-100 dark:border-slate-800">
            <div className="w-12 h-12 mx-auto rounded-full border-4 border-[#0E7490] border-t-transparent animate-spin" />
            <p className="mt-4 text-slate-500">Loading staff...</p>
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filtered.map((item) => (
              <div
                key={item._id}
                className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800 hover:-translate-y-1 hover:shadow-xl transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#0B2545] to-[#0E7490] text-white flex items-center justify-center shadow-xl shrink-0">
                      <span className="text-3xl font-black">
                        {item.name?.charAt(0)?.toUpperCase() || "S"}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <h2 className="text-xl font-black text-slate-900 dark:text-white truncate">
                        {item.name}
                      </h2>

                      <span
                        className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${getRoleColor(
                          item.role
                        )}`}
                      >
                        {item.role}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mt-6">
                  <Info icon={Mail} text={item.email} />
                  <Info icon={Phone} text={item.phone} />
                  <Info
                    icon={Briefcase}
                    text={item.department || "No Department"}
                  />
                  <Info
                    icon={KeyRound}
                    text={`${item.permissions?.length || 0} Permissions`}
                  />
                  <Info
                    icon={CalendarDays}
                    text={`Joined: ${
                      item.createdAt ? item.createdAt.slice(0, 10) : "N/A"
                    }`}
                  />

                  <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-4 flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 text-sm font-bold">
                      Salary
                    </span>

                    <span className="font-black text-emerald-600">
                      {money(item.salary)}
                    </span>
                  </div>

                  <div className="rounded-2xl bg-indigo-50 dark:bg-slate-800 p-4 flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 text-sm font-bold">
                      Login
                    </span>

                    <span className="font-black text-indigo-600">
                      Enabled
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        item.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {item.status}
                    </span>

                    <div className="flex gap-2">
                      <Link
                        to={`/staff/${item._id}`}
                        className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition"
                      >
                        <Eye size={16} />
                      </Link>

                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteStaff(item._id)}
                        className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {Array.isArray(item.permissions) && item.permissions.length > 0 && (
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-black text-slate-400 mb-3">
                        Permissions
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {item.permissions.slice(0, 5).map((permission) => (
                          <span
                            key={permission}
                            className="px-3 py-1 rounded-full bg-[#0E7490]/10 text-[#0E7490] text-xs font-bold"
                          >
                            {permissionLabels[permission] || permission}
                          </span>
                        ))}

                        {item.permissions.length > 5 && (
                          <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold">
                            +{item.permissions.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-14 text-center border border-slate-100 dark:border-slate-800">
            <Users size={60} className="mx-auto text-slate-300" />
            <h2 className="text-2xl font-black text-slate-800 dark:text-white mt-5">
              No Staff Found
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2">
              Click Add Staff to create your first team member.
            </p>
          </div>
        )}

        {open && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <form
              onSubmit={saveStaff}
              className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-[2rem] p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-7">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white">
                    {editingId ? "Update Staff" : "Add Staff"}
                  </h2>

                  <p className="text-slate-500 dark:text-slate-400 mt-2">
                    Staff email and password will be used for login.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  className="text-slate-400 hover:text-red-500"
                >
                  <X size={28} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input
                  label="Full Name"
                  value={form.name}
                  onChange={(v) => setForm({ ...form, name: v })}
                />

                <Input
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(v) => setForm({ ...form, email: v })}
                />

                <Input
                  label="Phone"
                  value={form.phone}
                  onChange={(v) => setForm({ ...form, phone: v })}
                />

                <Input
                  label={editingId ? "New Password (optional)" : "Login Password"}
                  type="password"
                  value={form.password}
                  onChange={(v) => setForm({ ...form, password: v })}
                  required={!editingId}
                />

                <Input
                  label="Department"
                  value={form.department}
                  onChange={(v) => setForm({ ...form, department: v })}
                />

                <Input
                  label="Salary"
                  type="number"
                  value={form.salary}
                  onChange={(v) => setForm({ ...form, salary: v })}
                />

                <Select
                  label="Role"
                  value={form.role}
                  onChange={(v) => setForm({ ...form, role: v })}
                  options={[
                    "Admin",
                    "Manager",
                    "Cashier",
                    "Accountant",
                    "Store Keeper",
                    "Sales Officer",
                    "Inventory Officer"
                  ]}
                />

                <Select
                  label="Status"
                  value={form.status}
                  onChange={(v) => setForm({ ...form, status: v })}
                  options={["Active", "Inactive"]}
                />

                <div className="md:col-span-2">
                  <label className="text-sm font-bold text-slate-600 dark:text-slate-300">
                    User Permissions
                  </label>

                  <p className="text-xs text-slate-400 mt-1">
                    These permission keys match your backend routes.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 mt-3">
                    {permissionOptions.map((permission) => (
                      <button
                        key={permission}
                        type="button"
                        onClick={() => togglePermission(permission)}
                        className={`px-4 py-3 rounded-2xl text-sm font-bold text-left border transition flex items-center gap-2 ${
                          form.permissions.includes(permission)
                            ? "bg-[#0E7490] text-white border-[#0E7490]"
                            : "bg-slate-100 dark:bg-slate-800 dark:text-white border-transparent hover:border-[#0E7490]"
                        }`}
                      >
                        {form.permissions.includes(permission) && (
                          <CheckCircle2 size={16} />
                        )}

                        <span>
                          {permissionLabels[permission] || permission}
                          <small className="block opacity-60 font-medium">
                            {permission}
                          </small>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 dark:text-white font-bold"
                >
                  Cancel
                </button>

                <button
                  disabled={saving}
                  type="submit"
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#0B2545] to-[#0E7490] text-white font-bold disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Staff"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function Info({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
      <Icon size={18} className="text-slate-400" />
      <span className="text-sm font-medium truncate">{text}</span>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {title}
          </p>

          <h2 className="text-3xl font-black text-slate-900 dark:text-white mt-2">
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

function Input({
  label,
  value,
  onChange,
  type = "text",
  required = true
}) {
  return (
    <div>
      <label className="text-sm font-bold text-slate-600 dark:text-slate-300">
        {label}
      </label>

      <input
        required={required}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-2 px-4 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-[#0E7490]"
      />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="text-sm font-bold text-slate-600 dark:text-slate-300">
        {label}
      </label>

      <select
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-2 px-4 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-[#0E7490]"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}