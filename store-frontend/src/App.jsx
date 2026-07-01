import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { getStoredUser } from "./utils/authStorage";
import "./index.css";

const Login = lazy(() => import("./pages/Login.jsx"));
const Signup = lazy(() => import("./pages/Signup.jsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.jsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.jsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const Categories = lazy(() => import("./pages/Categories.jsx"));
const Products = lazy(() => import("./pages/Products.jsx"));
const POS = lazy(() => import("./pages/POS.jsx"));
const Customers = lazy(() => import("./pages/Customers.jsx"));
const CustomerProfile = lazy(() => import("./pages/CustomerProfile.jsx"));
const Suppliers = lazy(() => import("./pages/Suppliers.jsx"));
const SupplierProfile = lazy(() => import("./pages/SupplierProfile.jsx"));
const Reports = lazy(() => import("./pages/Reports.jsx"));
const Purchases = lazy(() => import("./pages/Purchases.jsx"));
const StockMovements = lazy(() => import("./pages/StockMovements.jsx"));
const Expenses = lazy(() => import("./pages/Expenses.jsx"));
const Cashbook = lazy(() => import("./pages/Cashbook.jsx"));
const Account = lazy(() => import("./pages/Account.jsx"));
const Profile = lazy(() => import("./pages/Profile.jsx"));
const Settings = lazy(() => import("./pages/Settings.jsx"));
const Staff = lazy(() => import("./pages/Staff.jsx"));
const StaffDetails = lazy(() => import("./pages/StaffDetails.jsx"));
const StaffAttendance = lazy(() => import("./pages/StaffAttendance.jsx"));
const StaffPayroll = lazy(() => import("./pages/StaffPayroll.jsx"));
const Subscriptions = lazy(() => import("./pages/Subscriptions.jsx"));
const Notifications = lazy(() => import("./pages/Notifications.jsx"));
const Quotations = lazy(() => import("./pages/Quotations.jsx"));
const Support = lazy(() => import("./pages/Support.jsx"));

function hasPermission(permission) {
  const user = getStoredUser();
  if (user?.role === "admin") return true;
  return !permission || (Array.isArray(user?.permissions) && user.permissions.includes(permission));
}

function Protected({ children, permission }) {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;
  if (!hasPermission(permission)) return <Navigate to="/profile" replace />;
  return children;
}

function getUiSettings() {
  try {
    const settings = JSON.parse(localStorage.getItem("store_settings") || "{}");
    return {
      maintenanceMode: settings.maintenanceMode === true,
      darkMode: settings.darkMode === true
    };
  } catch {
    return { maintenanceMode: false, darkMode: false };
  }
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-950">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-300 border-t-cyan-700" />
    </div>
  );
}

function MaintenanceScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-center text-white">
      <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-white/10 text-5xl">🛠️</div>
      <h1 className="text-4xl font-black md:text-5xl">System Under Maintenance</h1>
      <p className="mt-5 max-w-xl leading-8 text-slate-400">The store system is temporarily unavailable. Please come back later.</p>
    </div>
  );
}

function protectedPage(element, permission) {
  return <Protected permission={permission}>{element}</Protected>;
}

export default function App() {
  const [uiSettings, setUiSettings] = useState(getUiSettings);

  useEffect(() => {
    function applySettings() {
      const next = getUiSettings();
      setUiSettings(next);
      document.documentElement.classList.toggle("dark", next.darkMode);
    }
    document.documentElement.classList.toggle("dark", uiSettings.darkMode);
    window.addEventListener("settings-updated", applySettings);
    window.addEventListener("storage", applySettings);
    return () => {
      window.removeEventListener("settings-updated", applySettings);
      window.removeEventListener("storage", applySettings);
    };
  }, [uiSettings.darkMode]);

  if (uiSettings.maintenanceMode) return <MaintenanceScreen />;

  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />

          <Route path="/" element={protectedPage(<Dashboard />, "view_dashboard")} />
          <Route path="/products" element={protectedPage(<Products />, "view_products")} />
          <Route path="/categories" element={protectedPage(<Categories />, "view_categories")} />
          <Route path="/stock-movements" element={protectedPage(<StockMovements />, "view_stock_report")} />
          <Route path="/sales" element={protectedPage(<POS />, "view_sales")} />
          <Route path="/customers" element={protectedPage(<Customers />, "view_customers")} />
          <Route path="/customers/:id" element={protectedPage(<CustomerProfile />, "view_customers")} />
          <Route path="/suppliers" element={protectedPage(<Suppliers />, "view_suppliers")} />
          <Route path="/suppliers/:id" element={protectedPage(<SupplierProfile />, "view_suppliers")} />
          <Route path="/purchases" element={protectedPage(<Purchases />, "view_purchases")} />
          <Route path="/expenses" element={protectedPage(<Expenses />, "view_expenses")} />
          <Route path="/cashbook" element={protectedPage(<Cashbook />, "manage_accounts")} />
          <Route path="/account" element={protectedPage(<Account />, "manage_accounts")} />
          <Route path="/reports" element={protectedPage(<Reports />, "view_reports")} />
          <Route path="/profile" element={protectedPage(<Profile />)} />
          <Route path="/settings" element={protectedPage(<Settings />, "manage_settings")} />
          <Route path="/staff" element={protectedPage(<Staff />, "manage_staff")} />
          <Route path="/staff/:id" element={protectedPage(<StaffDetails />, "manage_staff")} />
          <Route path="/staff-attendance" element={protectedPage(<StaffAttendance />, "manage_attendance")} />
          <Route path="/staff-payroll" element={protectedPage(<StaffPayroll />, "manage_payroll")} />
          <Route path="/subscriptions" element={protectedPage(<Subscriptions />, "manage_settings")} />
          <Route path="/notifications" element={protectedPage(<Notifications />, "view_dashboard")} />
          <Route path="/quotations" element={protectedPage(<Quotations />, "create_sale")} />
          <Route path="/support" element={protectedPage(<Support />)} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
