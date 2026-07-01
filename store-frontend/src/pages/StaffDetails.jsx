import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  ArrowLeft,
  UserRound,
  Mail,
  Phone,
  Shield,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Loader2,
  KeyRound,
  ShoppingCart,
  Package,
  BarChart3,
  Settings,
  Users,
  ReceiptText,
  Lock,
  Check,
  DollarSign
} from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";
import api from "../api/client";

const rolePermissions = {
  Admin: [
    "Full Dashboard Access",
    "Manage Products",
    "Manage Categories",
    "Manage Customers",
    "Manage Suppliers",
    "Create Bills",
    "View Reports",
    "Manage Staff",
    "Manage Settings"
  ],
  Manager: [
    "Dashboard Access",
    "Manage Products",
    "Manage Customers",
    "Manage Suppliers",
    "View Reports",
    "Manage Staff"
  ],
  Cashier: [
    "POS Access",
    "Create Bills",
    "View Customers",
    "View Products"
  ],
  Accountant: [
    "View Finance",
    "Manage Expenses",
    "Cashbook Access",
    "Account Access",
    "View Reports"
  ],
  "Store Keeper": [
    "Manage Stock",
    "View Products",
    "Stock History",
    "Inventory Reports"
  ],
  "Sales Officer": [
    "Create Bills",
    "Manage Customers",
    "View Products",
    "Sales Reports"
  ],
  "Inventory Officer": [
    "Manage Products",
    "Manage Categories",
    "Stock History",
    "Inventory Reports"
  ]
};

const permissionCards = [
  {
    title: "Sales Access",
    description: "Can create bills and manage POS transactions.",
    icon: ShoppingCart,
    permissions: ["POS Access", "Create Bills", "Manage Sales"],
    roles: ["Admin", "Manager", "Cashier", "Sales Officer"],
    color: "green"
  },
  {
    title: "Inventory Access",
    description:
      "Can manage stock, products, categories and stock movement history.",
    icon: Package,
    permissions: ["Manage Products", "Manage Categories", "Manage Stock"],
    roles: ["Admin", "Manager", "Store Keeper", "Inventory Officer"],
    color: "blue"
  },
  {
    title: "Reports Access",
    description:
      "Can view analytics, business performance and financial reports.",
    icon: BarChart3,
    permissions: ["View Reports", "Sales Reports", "Inventory Reports"],
    roles: ["Admin", "Manager", "Accountant", "Sales Officer", "Inventory Officer"],
    color: "orange"
  },
  {
    title: "Settings Access",
    description:
      "Can manage store profile, system configuration and advanced settings.",
    icon: Settings,
    permissions: ["Manage Settings"],
    roles: ["Admin"],
    color: "red"
  },
  {
    title: "Customer Access",
    description:
      "Can view or manage customer accounts and customer profiles.",
    icon: Users,
    permissions: ["View Customers", "Manage Customers"],
    roles: ["Admin", "Manager", "Cashier", "Sales Officer"],
    color: "cyan"
  },
  {
    title: "Finance Access",
    description:
      "Can manage expenses, cashbook, accounts and finance records.",
    icon: ReceiptText,
    permissions: ["View Finance", "Manage Expenses", "Cashbook Access", "Account Access"],
    roles: ["Admin", "Accountant"],
    color: "purple"
  }
];

export default function StaffDetails() {
  const { id } = useParams();

  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStaff();
  }, [id]);

  async function loadStaff() {
    try {
      setLoading(true);

      const res = await api.get(`/staff/${id}`);

      setStaff(res.data?.data || null);
    } catch (error) {
      console.log(error);
      setStaff(null);
    } finally {
      setLoading(false);
    }
  }

  const permissions = useMemo(() => {
    if (Array.isArray(staff?.permissions) && staff.permissions.length > 0) {
      return staff.permissions;
    }

    return rolePermissions[staff?.role] || [];
  }, [staff]);

  function hasCardAccess(card) {
    const byRole = card.roles.includes(staff?.role);

    const byPermission = card.permissions.some((permission) =>
      permissions.includes(permission)
    );

    return byRole || byPermission;
  }

  function money(value) {
    const settings = JSON.parse(localStorage.getItem("store_settings") || "{}");
    const currency =
      settings.currency || localStorage.getItem("app_currency") || "USD";

    return `${currency} ${Number(value || 0).toLocaleString()}`;
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-[70vh] flex items-center justify-center">
          <Loader2 size={45} className="animate-spin text-[#0E7490]" />
        </div>
      </DashboardLayout>
    );
  }

  if (!staff) {
    return (
      <DashboardLayout>
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-black text-slate-800 dark:text-white">
              Staff Not Found
            </h1>

            <Link
              to="/staff"
              className="inline-flex mt-6 px-6 py-3 rounded-2xl bg-[#0E7490] text-white font-bold"
            >
              Back
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-7">
        <Link
          to="/staff"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-[#0E7490] font-bold"
        >
          <ArrowLeft size={18} />
          Back to Staff
        </Link>

        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#071B34] via-[#0B2545] to-[#0E7490] p-8 text-white shadow-2xl">
          <div className="absolute top-[-100px] right-[-100px] w-[250px] h-[250px] rounded-full bg-white/10 blur-3xl" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center gap-6">
            <div className="w-28 h-28 rounded-[2rem] bg-white/15 flex items-center justify-center shadow-xl">
              <span className="text-5xl font-black">
                {staff.name?.charAt(0)?.toUpperCase() || "S"}
              </span>
            </div>

            <div>
              <h1 className="text-4xl font-black">{staff.name}</h1>
              <p className="text-white/75 mt-2">Staff ID: {staff._id}</p>

              <div className="flex flex-wrap gap-3 mt-4">
                <span
                  className={`inline-flex px-4 py-2 rounded-full font-black text-sm ${
                    staff.status === "Active"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {staff.status || "Active"}
                </span>

                <span className="inline-flex px-4 py-2 rounded-full bg-white/15 text-white font-black text-sm">
                  {staff.role || "Staff"}
                </span>

                <span className="inline-flex px-4 py-2 rounded-full bg-white/15 text-white font-black text-sm">
                  {permissions.length} Permissions
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-[2rem] p-7 border border-slate-100 dark:border-slate-800 shadow-sm">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              Personal Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-7">
              <InfoCard icon={UserRound} label="Full Name" value={staff.name} />
              <InfoCard icon={Mail} label="Email" value={staff.email} />
              <InfoCard icon={Phone} label="Phone" value={staff.phone} />
              <InfoCard icon={Shield} label="Role" value={staff.role} />
              <InfoCard
                icon={Briefcase}
                label="Department"
                value={staff.department || "Store Department"}
              />
              <InfoCard
                icon={CalendarDays}
                label="Joined Date"
                value={staff.createdAt ? staff.createdAt.slice(0, 10) : "N/A"}
              />
              <InfoCard
                icon={DollarSign}
                label="Salary"
                value={money(staff.salary || 0)}
              />
              <InfoCard
                icon={KeyRound}
                label="Permissions"
                value={`${permissions.length} assigned`}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-7 border border-slate-100 dark:border-slate-800 shadow-sm">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              Quick Status
            </h2>

            <div className="space-y-4 mt-7">
              <StatusItem title="Account Status" value={staff.status || "Active"} />
              <StatusItem title="Access Level" value={staff.role || "Staff"} />
              <StatusItem
                title="Permission Group"
                value={`${permissions.length} Access Rules`}
              />
              <StatusItem title="Security" value="Protected User" />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-slate-900 via-[#0B2545] to-indigo-900 p-7 text-white shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-5">
            <KeyRound size={26} />
          </div>

          <h2 className="text-3xl font-black">Permissions</h2>

          <p className="mt-3 text-white/75 max-w-3xl leading-7">
            This staff account uses dynamic user permissions saved from the
            Staff Management form. If no custom permissions are selected, role
            defaults are used automatically.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {permissionCards.map((permission) => {
            const allowed = hasCardAccess(permission);
            const Icon = permission.icon;

            return (
              <PermissionCard
                key={permission.title}
                title={permission.title}
                description={permission.description}
                status={allowed ? "Allowed" : "Restricted"}
                icon={allowed ? Icon : Lock}
                color={allowed ? permission.color : "red"}
              />
            );
          })}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-7 shadow-sm border border-slate-100 dark:border-slate-800">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            User Permissions
          </h2>

          <p className="text-slate-500 dark:text-slate-400 mt-2">
            These permissions are dynamic. Add or remove them from the Staff edit
            form.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {permissions.length > 0 ? (
              permissions.map((permission) => (
                <span
                  key={permission}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#0E7490]/10 text-[#0E7490] font-bold"
                >
                  <Check size={16} />
                  {permission}
                </span>
              ))
            ) : (
              <span className="text-slate-500">No permissions assigned</span>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function InfoCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-5">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-[#0E7490]/10 text-[#0E7490] flex items-center justify-center">
          <Icon size={20} />
        </div>

        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
          <h3 className="font-black text-slate-900 dark:text-white break-all">
            {value || "N/A"}
          </h3>
        </div>
      </div>
    </div>
  );
}

function StatusItem({ title, value }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-50 dark:bg-slate-800 p-4">
      <div className="flex items-center gap-3">
        <CheckCircle2 size={20} className="text-green-600" />

        <span className="font-bold text-slate-700 dark:text-slate-300">
          {title}
        </span>
      </div>

      <span className="text-sm font-black text-[#0E7490]">{value}</span>
    </div>
  );
}

function PermissionCard({ title, description, status, icon: Icon, color }) {
  const colors = {
    green: "bg-green-100 text-green-700 border-green-200",
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    orange: "bg-orange-100 text-orange-700 border-orange-200",
    red: "bg-red-100 text-red-700 border-red-200",
    cyan: "bg-cyan-100 text-cyan-700 border-cyan-200",
    purple: "bg-purple-100 text-purple-700 border-purple-200"
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm hover:-translate-y-1 hover:shadow-xl transition">
      <div className="flex items-start justify-between gap-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-[#0E7490] flex items-center justify-center">
          <Icon size={22} />
        </div>

        <span
          className={`inline-flex px-3 py-1 rounded-full text-xs font-black border ${colors[color]}`}
        >
          {status}
        </span>
      </div>

      <h3 className="mt-5 text-xl font-black text-slate-900 dark:text-white">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </div>
  );
}