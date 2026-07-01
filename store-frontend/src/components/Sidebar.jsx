import { Link, useLocation } from "react-router-dom";
import {
  Home,
  LayoutDashboard,
  Receipt,
  Users,
  ShoppingBag,
  Truck,
  History,
  Package,
  FolderTree,
  ReceiptText,
  BookOpen,
  Landmark,
  BarChart3,
  UserCircle,
  Store,
  UserCog,
  CreditCard,
  Settings,
  LogOut,
  Search,
} from "lucide-react";

const menuItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/", label: "Dashboard", icon: LayoutDashboard },

  { to: "/products", label: "Stock", icon: Package },
  { to: "/categories", label: "Categories", icon: FolderTree },
  { to: "/stock-movements", label: "Stock History", icon: History },

  { to: "/sales", label: "Bills", icon: Receipt },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/purchases", label: "Purchases", icon: ShoppingBag },
  { to: "/suppliers", label: "Suppliers", icon: Truck },
  { to: "/expenses", label: "Expense", icon: ReceiptText },
  { to: "/cashbook", label: "Cashbook", icon: BookOpen },
  { to: "/account", label: "Account", icon: Landmark },
  { to: "/reports", label: "Overview", icon: BarChart3 },

  { to: "/profile", label: "Profile", icon: UserCircle },
  { to: "/settings", label: "Store Profile", icon: Store },
  { to: "/staff", label: "Staff", icon: UserCog },

// {
//   to: "/staff-attendance",
//   label: "Staff Attendance",
//   icon: CalendarCheck
// },

// {
//   to: "/staff-payroll",
//   label: "Staff Payroll",
//   icon: Wallet
// },

  { to: "/subscriptions", label: "Subscriptions", icon: CreditCard }
];

export default function Sidebar() {
  const location = useLocation();

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  }

  return (
    <aside className="hidden lg:flex w-[300px] h-screen sticky top-0 p-4">
      <div className="w-full rounded-[2.2rem] bg-gradient-to-b from-[#0B2545] via-[#0E7490] to-[#F4B740] text-white shadow-2xl flex flex-col overflow-hidden">
        {/* BRAND */}
        <div className="px-6 pt-7 pb-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center shadow-lg">
              <img
                src="/logo.png"
                alt="Bulsho Store"
                className="w-12 h-12 object-contain"
              />
            </div>

            <div>
              <h1 className="text-2xl font-black leading-tight">
                Bulsho Store
              </h1>
              <p className="text-sm text-white/70">Smart POS System</p>
            </div>
          </div>

          <div className="relative mt-6">
            <Search
              size={18}
              className="absolute left-4 top-3.5 text-white/60"
            />

            <input
              placeholder="Search menu..."
              className="w-full bg-white/15 border border-white/15 rounded-2xl pl-11 pr-4 py-3 text-sm outline-none placeholder:text-white/55 focus:bg-white/20"
            />
          </div>
        </div>

        {/* MENU */}
        <nav className="flex-1 overflow-y-auto px-4 pb-4 space-y-1">
          {menuItems.map((item) => (
            <MenuItem
              key={`${item.label}-${item.to}`}
              item={item}
              active={isActive(location.pathname, item.to)}
            />
          ))}
        </nav>

        {/* FOOTER */}
        <div className="p-4 border-t border-white/15">
          <div className="bg-white/18 backdrop-blur-xl rounded-3xl p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-[#F4B740] text-[#0B2545] flex items-center justify-center font-black">
                A
              </div>

              <div className="min-w-0">
                <p className="font-black truncate">Admin User</p>
                <p className="text-xs text-white/65 truncate">
                  admin@bulsho.store
                </p>
              </div>
            </div>

            <Link
              to="/settings"
              className="flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-white/15 transition text-sm font-bold"
            >
              <Settings size={18} />
              Settings
            </Link>

            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-red-500/25 transition text-sm font-bold text-left text-red-100"
            >
              <LogOut size={18} />
              Log out
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function MenuItem({ item, active }) {
  const Icon = item.icon;

  return (
    <Link
      to={item.to}
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-black transition-all duration-200 ${
        active
          ? "bg-white/22 text-white shadow-lg"
          : "text-white/82 hover:bg-white/13 hover:text-white"
      }`}
    >
      <Icon size={19} />
      <span>{item.label}</span>
    </Link>
  );
}

function isActive(pathname, to) {
  if (to === "/") return pathname === "/";
  return pathname.startsWith(to);
}