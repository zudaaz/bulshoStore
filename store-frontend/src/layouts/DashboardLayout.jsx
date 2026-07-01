import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getAssetUrl } from "../api/client";
import { clearAuthStorage } from "../utils/authStorage";

import {
  Menu,
  X,
  Search,
  LayoutDashboard,
  BarChart3,
  ChevronDown,
  Users,
  Bell,
  MessageCircle,
  Settings,
  LogOut,
  ShoppingBag,
  Truck,
  Package,
  ReceiptText,
  BookOpen,
  Landmark,
  UserCircle,
  Store,
  UserCog,
  CreditCard,
  History,
  Receipt,
  FolderTree,
  Layers3,
  CalendarCheck,
  WalletCards
} from "lucide-react";


const translations = {
  English: {
    dashboard: "Dashboard",
    stock: "Stock",
    categories: "Categories",
    stockHistory: "Stock History",
    bills: "Bills",
    quotations: "Quotations",
    customers: "Customers",
    purchases: "Purchases",
    suppliers: "Suppliers",
    expense: "Expense",
    cashbook: "Cashbook",
    account: "Account",
    reporting: "Reporting",
    salesReports: "Sales Reports",
    profile: "Profile",
    storeProfile: "Store Profile",
    staff: "Staff",
    attendance: "Attendance",
    payroll: "Payroll",
    subscriptions: "Subscriptions",
    settings: "Settings",
    signOut: "Sign out",
    notifications: "Notifications",
    support: "Support",
    mainMenu: "Main Menu",
    search: "Search anything...",
    smartPos: "Smart POS Dashboard",
    smartPosMobile: "Smart POS System"
  },

  Somali: {
    dashboard: "Dashboard",
    stock: "Bakhaar",
    categories: "Qaybaha",
    stockHistory: "Taariikhda Bakhaarka",
    bills: "Biilasha",
    quotations: "Qiimeyn",
    customers: "Macaamiil",
    purchases: "Iibsasho",
    suppliers: "Alaab-qeybiyeyaal",
    expense: "Kharash",
    cashbook: "Buugga Lacagta",
    account: "Akoon",
    reporting: "Warbixin",
    salesReports: "Warbixinta Iibka",
    profile: "Profile",
    storeProfile: "Profile-ka Dukaanka",
    staff: "Shaqaale",
    attendance: "Xaadirinta",
    payroll: "Mushaharka",
    subscriptions: "Rukumo",
    settings: "Settings",
    signOut: "Ka bax",
    notifications: "Ogeysiisyo",
    support: "Taageero",
    mainMenu: "Menu-ga Weyn",
    search: "Raadi wax kasta...",
    smartPos: "Smart POS Dashboard",
    smartPosMobile: "Smart POS System"
  },

  Arabic: {
    dashboard: "لوحة التحكم",
    stock: "المخزون",
    categories: "الأقسام",
    stockHistory: "سجل المخزون",
    bills: "الفواتير",
    quotations: "عروض الأسعار",
    customers: "العملاء",
    purchases: "المشتريات",
    suppliers: "الموردون",
    expense: "المصروفات",
    cashbook: "دفتر النقد",
    account: "الحساب",
    reporting: "التقارير",
    salesReports: "تقارير المبيعات",
    profile: "الملف الشخصي",
    storeProfile: "ملف المتجر",
    staff: "الموظفون",
    attendance: "الحضور",
    payroll: "الرواتب",
    subscriptions: "الاشتراكات",
    settings: "الإعدادات",
    signOut: "تسجيل الخروج",
    notifications: "الإشعارات",
    support: "الدعم",
    mainMenu: "القائمة الرئيسية",
    search: "ابحث عن أي شيء...",
    smartPos: "لوحة نظام البيع",
    smartPosMobile: "نظام البيع الذكي"
  }
};

const mainMenuItems = [
  { to: "/", key: "dashboard", icon: LayoutDashboard, permission: "view_dashboard" },
  { to: "/products", key: "stock", icon: Package, permission: "view_products" },
  { to: "/categories", key: "categories", icon: FolderTree, permission: "view_categories" },
  { to: "/stock-movements", key: "stockHistory", icon: History, permission: "view_stock_report" },
  { to: "/sales", key: "bills", icon: Receipt, permission: "view_sales" },
  { to: "/quotations", key: "quotations", icon: Layers3, permission: "create_sale" },
  { to: "/customers", key: "customers", icon: Users, permission: "view_customers" },
  { to: "/purchases", key: "purchases", icon: ShoppingBag, permission: "view_purchases" },
  { to: "/suppliers", key: "suppliers", icon: Truck, permission: "view_suppliers" },
  { to: "/expenses", key: "expense", icon: ReceiptText, permission: "view_expenses" },
  { to: "/cashbook", key: "cashbook", icon: BookOpen, permission: "manage_accounts" },
  { to: "/account", key: "account", icon: Landmark, permission: "manage_accounts" }
];

const reportingItems = [
  { to: "/reports", key: "salesReports", permission: "view_reports" }
];

const accountMenuItems = [
  { to: "/profile", key: "profile", icon: UserCircle, publicForLoggedUser: true },
  { to: "/settings", key: "storeProfile", icon: Store, permission: "manage_settings" },
  { to: "/staff", key: "staff", icon: UserCog, permission: "manage_staff" },
  { to: "/staff-attendance", key: "attendance", icon: CalendarCheck, permission: "manage_attendance" },
  { to: "/staff-payroll", key: "payroll", icon: WalletCards, permission: "manage_payroll" },
  { to: "/subscriptions", key: "subscriptions", icon: CreditCard, permission: "manage_settings" },
  { to: "/settings", key: "settings", icon: Settings, permission: "manage_settings" },
  { to: "/logout", key: "signOut", icon: LogOut, isLogout: true, publicForLoggedUser: true }
];

const defaultStoreSettings = {
  storeName: "Bulsho Store",
  logo: "",
  darkMode: false,
  currency: "USD",
  language: "English"
};

function getLogoUrl(logo) {
  if (!logo) return "";
  if (logo.startsWith("data:")) return logo;
  if (logo.startsWith("blob:")) return logo;
  if (logo.startsWith("http")) return logo;
  return getAssetUrl(logo);
}

function getSavedUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

function isAdminUser(user) {
  return user?.role === "admin";
}

function hasPermission(item, user) {
  if (!item) return false;
  if (item.publicForLoggedUser || item.isLogout) return true;
  if (isAdminUser(user)) return true;

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  return permissions.includes(item.permission);
}

function safeLogout() {
  clearAuthStorage();
  sessionStorage.clear();
  window.dispatchEvent(new Event("profile-updated"));
  window.location.href = "/login";
}

export default function DashboardLayout({ children }) {
  const [open, setOpen] = useState(false);
  const [storeSettings, setStoreSettings] = useState(defaultStoreSettings);
  const [currentUser, setCurrentUser] = useState(getSavedUser);

  useEffect(() => {
    loadStoreSettings();
    setCurrentUser(getSavedUser());

    function handleSettingsUpdated() {
      loadStoreSettings();
    }

    function handleProfileUpdated() {
      setCurrentUser(getSavedUser());
    }

    window.addEventListener("settings-updated", handleSettingsUpdated);
    window.addEventListener("profile-updated", handleProfileUpdated);
    window.addEventListener("storage", handleProfileUpdated);

    return () => {
      window.removeEventListener("settings-updated", handleSettingsUpdated);
      window.removeEventListener("profile-updated", handleProfileUpdated);
      window.removeEventListener("storage", handleProfileUpdated);
    };
  }, []);

  function loadStoreSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem("store_settings") || "{}");

      const finalSettings = {
        ...defaultStoreSettings,
        ...saved,
        storeName: saved.storeName || "Bulsho Store",
        logo: saved.logo || "",
        language: saved.language || "English",
        currency: saved.currency || "USD",
        darkMode: saved.darkMode === true
      };

      setStoreSettings(finalSettings);
      localStorage.setItem("app_currency", finalSettings.currency);
      localStorage.setItem("app_language", finalSettings.language);

      document.documentElement.classList.toggle("dark", finalSettings.darkMode);
      document.documentElement.dir =
        finalSettings.language === "Arabic" ? "rtl" : "ltr";
    } catch {
      setStoreSettings(defaultStoreSettings);
      document.documentElement.classList.remove("dark");
      document.documentElement.dir = "ltr";
    }
  }

  const language = storeSettings.language || "English";
  const t = translations[language] || translations.English;
  const logoUrl = getLogoUrl(storeSettings.logo);

  return (
    <div className="min-h-screen bg-[#eef2ff] dark:bg-slate-950 transition-colors">
      <header className="lg:hidden sticky top-0 z-50 bg-gradient-to-r from-[#0B2545] via-[#0E7490] to-[#F4B740] text-white px-4 py-3 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center overflow-hidden shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt={storeSettings.storeName} className="w-full h-full object-cover" />
              ) : (
                <img src="/logo.png" alt={storeSettings.storeName} className="w-9 h-9 object-contain" />
              )}
            </div>

            <div className="min-w-0">
              <h1 className="font-black text-lg truncate">{storeSettings.storeName}</h1>
              <p className="text-xs text-white/70">
                {t.smartPosMobile} • {storeSettings.currency}
              </p>
            </div>
          </div>

          <button
            onClick={() => setOpen(true)}
            className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center"
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden lg:block fixed left-0 top-0 h-screen w-[320px] p-4">
          <Sidebar storeSettings={storeSettings} t={t} currentUser={currentUser} />
        </aside>

        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />

            <aside className="relative w-[320px] max-w-[90%] h-screen p-4">
              <button
                onClick={() => setOpen(false)}
                className="absolute top-6 right-6 z-50 w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center"
              >
                <X size={20} />
              </button>

              <Sidebar
                onNavigate={() => setOpen(false)}
                storeSettings={storeSettings}
                t={t}
                currentUser={currentUser}
              />
            </aside>
          </div>
        )}

        <main className="flex-1 lg:ml-[320px] p-4 md:p-6 overflow-x-hidden text-slate-900 dark:text-white transition-colors">
          {children}
        </main>
      </div>
    </div>
  );
}

function Sidebar({ onNavigate, storeSettings, t, currentUser }) {
  const location = useLocation();

  const [profileUser, setProfileUser] = useState({
    name: "User",
    email: "",
    avatar: "",
    permissions: [],
    role: "staff"
  });

  useEffect(() => {
    loadSavedUser();

    function handleProfileUpdated() {
      loadSavedUser();
    }

    window.addEventListener("profile-updated", handleProfileUpdated);
    window.addEventListener("storage", handleProfileUpdated);

    return () => {
      window.removeEventListener("profile-updated", handleProfileUpdated);
      window.removeEventListener("storage", handleProfileUpdated);
    };
  }, []);

  function loadSavedUser() {
    const savedUser = getSavedUser();
    const email = savedUser.email || "";
    const avatarKey = `profile_avatar_${email}`;
    const savedAvatar = localStorage.getItem(avatarKey) || "";

    setProfileUser({
      name: savedUser.name || "User",
      email,
      avatar: savedUser.avatar || savedAvatar || "",
      permissions: Array.isArray(savedUser.permissions) ? savedUser.permissions : [],
      role: savedUser.role || "staff"
    });
  }

  function handleNavigate(item) {
    if (item.isLogout) {
      safeLogout();
      return;
    }

    if (onNavigate) onNavigate();
  }

  const logoUrl = getLogoUrl(storeSettings?.logo || "");

  const allowedMainMenu = useMemo(
    () => mainMenuItems.filter((item) => hasPermission(item, currentUser)),
    [currentUser]
  );

  const allowedReports = useMemo(
    () => reportingItems.filter((item) => hasPermission(item, currentUser)),
    [currentUser]
  );

  const allowedAccountMenu = useMemo(
    () => accountMenuItems.filter((item) => hasPermission(item, currentUser)),
    [currentUser]
  );

  return (
    <div className="h-full rounded-[2.7rem] overflow-hidden bg-gradient-to-br from-[#071B34] via-[#0B2545] to-[#0E7490] shadow-[0_30px_80px_rgba(11,37,69,0.45)] text-white flex flex-col border border-white/10 relative">
      <div className="absolute top-[-120px] right-[-120px] w-[250px] h-[250px] bg-[#F4B740]/20 blur-3xl rounded-full" />
      <div className="absolute bottom-[-100px] left-[-100px] w-[220px] h-[220px] bg-cyan-400/10 blur-3xl rounded-full" />

      <div className="relative z-10 px-6 pt-7 pb-5 border-b border-white/10">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-16 h-16 rounded-[1.7rem] bg-white/15 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-2xl overflow-hidden shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt={storeSettings?.storeName || "Store Logo"} className="w-full h-full object-cover" />
            ) : (
              <img src="/logo.png" alt={storeSettings?.storeName || "Bulsho Store"} className="w-11 h-11 object-contain" />
            )}
          </div>

          <div className="min-w-0">
            <h1 className="text-[1.45rem] font-black tracking-tight truncate">
              {storeSettings?.storeName || "Bulsho Store"}
            </h1>

            <p className="text-sm text-white/60">
              {t.smartPos} • {storeSettings?.currency || "USD"}
            </p>
          </div>
        </div>

        <div className="mt-6 relative">
          <Search size={18} className="absolute left-4 top-3.5 text-white/45" />

          <input
            type="text"
            placeholder={t.search}
            className="w-full h-12 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-xl pl-11 pr-4 text-sm outline-none placeholder:text-white/45 focus:border-[#F4B740] focus:bg-white/15 transition-all duration-300"
          />
        </div>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-4 py-5">
        <div className="mb-6">
          <p className="text-[11px] uppercase tracking-[0.25em] text-white/35 font-black px-3 mb-3">
            {t.mainMenu}
          </p>

          <nav className="space-y-1.5">
            {allowedMainMenu.map((item) => (
              <MenuItem
                key={`${item.key}-${item.to}`}
                item={item}
                label={t[item.key]}
                active={isActive(location.pathname, item.to)}
                onNavigate={() => handleNavigate(item)}
              />
            ))}

            {allowedMainMenu.length === 0 && (
              <p className="px-4 py-3 text-sm text-white/50">
                No menu permissions
              </p>
            )}
          </nav>
        </div>

        {allowedReports.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-white/8 border border-white/5 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#F4B740]/20 flex items-center justify-center">
                  <BarChart3 size={16} className="text-[#F4B740]" />
                </div>

                <span className="text-sm font-black">{t.reporting}</span>
              </div>

              <ChevronDown size={16} className="text-white/50" />
            </div>

            <div className="mt-3 ml-5 border-l border-white/10 pl-5 space-y-3">
              {allowedReports.map((item) => (
                <Link
                  key={item.key}
                  to={item.to}
                  onClick={onNavigate}
                  className="block text-sm text-white/60 hover:text-white transition"
                >
                  {t[item.key]}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-white/35 font-black px-3 mb-3">
            {t.account}
          </p>

          <div className="space-y-1.5">
            {allowedAccountMenu.map((item) => (
              <MenuItem
                key={`${item.key}-${item.to}`}
                item={item}
                label={t[item.key]}
                active={!item.isLogout && isActive(location.pathname, item.to)}
                onNavigate={() => handleNavigate(item)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="relative z-10 p-4 border-t border-white/10 bg-black/10 backdrop-blur-xl">
        <div className="space-y-2 mb-4">
          <MenuItem
            item={{
              to: "/notifications",
              key: "notifications",
              icon: Bell,
              badge: "4",
              publicForLoggedUser: true
            }}
            label={t.notifications}
            active={isActive(location.pathname, "/notifications")}
            onNavigate={onNavigate}
          />

          <MenuItem
            item={{
              to: "/support",
              key: "support",
              icon: MessageCircle,
              publicForLoggedUser: true
            }}
            label={t.support}
            active={isActive(location.pathname, "/support")}
            onNavigate={onNavigate}
          />
        </div>

        <div className="rounded-[1.8rem] bg-white/10 border border-white/10 backdrop-blur-2xl p-4 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-[#F4B740] to-[#ffcf70] flex items-center justify-center text-[#071B34] font-black text-xl shadow-xl shrink-0">
              {profileUser.avatar ? (
                <img src={profileUser.avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                profileUser.name?.charAt(0)?.toUpperCase() || "U"
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-black truncate text-sm">{profileUser.name}</h3>

              <p className="text-xs text-white/55 truncate">{profileUser.email}</p>

              <p className="text-[11px] text-[#F4B740] truncate font-bold mt-1">
                {isAdminUser(profileUser)
                  ? "Full Access"
                  : `${profileUser.permissions?.length || 0} Permissions`}
              </p>
            </div>

            <button
              onClick={safeLogout}
              className="w-11 h-11 rounded-2xl bg-red-500/15 hover:bg-red-500/25 text-red-200 flex items-center justify-center transition-all duration-300 shrink-0"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuItem({ item, label, active, onNavigate }) {
  const Icon = item.icon;

  if (item.isLogout) {
    return (
      <button
        type="button"
        onClick={onNavigate}
        className="w-full group flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 border border-transparent text-red-200 hover:bg-red-500/20 hover:border-red-300/20 hover:text-white"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-500/15 text-red-200 group-hover:bg-red-500/25 group-hover:text-white">
            <Icon size={18} />
          </div>

          <span className="text-sm font-bold tracking-wide">{label}</span>
        </div>
      </button>
    );
  }

  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={`group flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 border ${
        active
          ? "bg-gradient-to-r from-[#F4B740]/20 to-cyan-400/10 border-[#F4B740]/30 text-white shadow-xl"
          : "border-transparent text-white/70 hover:bg-white/10 hover:border-white/10 hover:text-white"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
            active
              ? "bg-[#F4B740]/20 text-[#F4B740]"
              : "bg-white/5 text-white/70 group-hover:bg-white/10 group-hover:text-white"
          }`}
        >
          <Icon size={18} />
        </div>

        <span className="text-sm font-bold tracking-wide">{label}</span>
      </div>

      {item.badge && (
        <div className="min-w-[26px] h-[26px] rounded-full bg-[#F4B740]/20 text-[#F4B740] text-xs font-black flex items-center justify-center px-2">
          {item.badge}
        </div>
      )}
    </Link>
  );
}

function isActive(pathname, to) {
  if (to === "/") return pathname === "/";
  return pathname.startsWith(to);
}