import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import {
  Search,
  Bell,
  DollarSign,
  ShoppingCart,
  Package,
  TrendingUp,
  TrendingDown,
  Wallet,
  Truck,
  Boxes,
  ArrowUpRight,
  ShieldCheck
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from "recharts";

import DashboardLayout from "../layouts/DashboardLayout";
import api from "../api/client";

const translations = {
  English: {
    title: "Sales Report",
    subtitle: "Today’s business overview and performance analytics",
    search: "Search...",
    adminStore: "Admin Store",
    todaySales: "Today's Sales",
    monthlySales: "Monthly Sales",
    expenses: "Expenses",
    purchases: "Purchases",
    customerCredit: "Customer Credit",
    supplierPayables: "Supplier Payables",
    lowStock: "Low Stock",
    outOfStock: "Out of Stock",
    totalProducts: "Total Products",
    totalCategories: "Total Categories",
    expiredProducts: "Expired Products",
    expiringProducts: "Expiring Soon",
    customerHabits: "Customer Habits",
    trackSales: "Track sales activity",
    productStatistic: "Product Statistic",
    paymentShare: "Payment method share",
    noPayment: "No payment data",
    topSold: "Top Sold Products",
    bestItems: "Best selling items",
    quantitySold: "Quantity sold",
    noTopProducts: "No top products yet",
    product: "Product",
    limitedAccess: "Limited Access Dashboard"
  },
  Somali: {
    title: "Warbixinta Iibka",
    subtitle: "Guudmarka ganacsiga maanta iyo falanqaynta waxqabadka",
    search: "Raadi...",
    adminStore: "Dukaanka Admin",
    todaySales: "Iibka Maanta",
    monthlySales: "Iibka Bishan",
    expenses: "Kharashaadka",
    purchases: "Iibsashada",
    customerCredit: "Deynta Macaamiisha",
    supplierPayables: "Deynta Alaab-qeybiyaha",
    lowStock: "Bakhaar Yar",
    outOfStock: "Bakhaar Dhamaaday",
    totalProducts: "Wadarta Alaabta",
    totalCategories: "Wadarta Qaybaha",
    expiredProducts: "Alaab Dhacday",
    expiringProducts: "Dhawaan Dhacaysa",
    customerHabits: "Dhaqanka Macaamiisha",
    trackSales: "La soco dhaqdhaqaaqa iibka",
    productStatistic: "Tirakoobka Alaabta",
    paymentShare: "Qaybta hababka lacag bixinta",
    noPayment: "Xog lacag bixin lama hayo",
    topSold: "Alaabta Ugu Iibka Badan",
    bestItems: "Alaabta ugu iibka fiican",
    quantitySold: "Tirada la iibiyay",
    noTopProducts: "Weli alaab sare lama hayo",
    product: "Alaab",
    limitedAccess: "Dashboard Xaddidan"
  },
  Arabic: {
    title: "تقرير المبيعات",
    subtitle: "نظرة عامة على أعمال اليوم وتحليلات الأداء",
    search: "بحث...",
    adminStore: "متجر الإدارة",
    todaySales: "مبيعات اليوم",
    monthlySales: "مبيعات الشهر",
    expenses: "المصروفات",
    purchases: "المشتريات",
    customerCredit: "ديون العملاء",
    supplierPayables: "مستحقات الموردين",
    lowStock: "مخزون منخفض",
    outOfStock: "نفد المخزون",
    totalProducts: "إجمالي المنتجات",
    totalCategories: "إجمالي الفئات",
    expiredProducts: "منتجات منتهية",
    expiringProducts: "تنتهي قريباً",
    customerHabits: "سلوك العملاء",
    trackSales: "تتبع نشاط المبيعات",
    productStatistic: "إحصائيات المنتجات",
    paymentShare: "حصة طرق الدفع",
    noPayment: "لا توجد بيانات دفع",
    topSold: "أفضل المنتجات مبيعاً",
    bestItems: "العناصر الأكثر مبيعاً",
    quantitySold: "الكمية المباعة",
    noTopProducts: "لا توجد منتجات مميزة بعد",
    product: "منتج",
    limitedAccess: "لوحة محدودة الصلاحيات"
  }
};

function getAppSettings() {
  const saved = JSON.parse(localStorage.getItem("store_settings") || "{}");

  return {
    currency: saved.currency || localStorage.getItem("app_currency") || "USD",
    language: saved.language || localStorage.getItem("app_language") || "English",
    storeName: saved.storeName || "Bulsho Store"
  };
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

function isAdmin(user) {
  return user?.role === "admin";
}

function can(permission, user) {
  if (isAdmin(user)) return true;

  const permissions = Array.isArray(user?.permissions)
    ? user.permissions
    : [];

  return permissions.includes(permission);
}

export default function Dashboard() {
  const [summary, setSummary] = useState({});
  const [charts, setCharts] = useState({});
  const [loading, setLoading] = useState(true);
  const [appSettings, setAppSettings] = useState(getAppSettings);
  const [currentUser, setCurrentUser] = useState(getUser);

  const currency = appSettings.currency;
  const t = translations[appSettings.language] || translations.English;

  useEffect(() => {
    loadDashboard();

    function refreshLocalState() {
      setCurrentUser(getUser());
      setAppSettings(getAppSettings());
    }

    window.addEventListener("settings-updated", refreshLocalState);
    window.addEventListener("dashboard-updated", refreshLocalState);
    window.addEventListener("profile-updated", refreshLocalState);
    window.addEventListener("storage", refreshLocalState);

    return () => {
      window.removeEventListener("settings-updated", refreshLocalState);
      window.removeEventListener("dashboard-updated", refreshLocalState);
      window.removeEventListener("profile-updated", refreshLocalState);
      window.removeEventListener("storage", refreshLocalState);
    };
  }, []);

  function money(value = 0) {
    return `${currency} ${Number(value || 0).toLocaleString()}`;
  }

  async function loadDashboard() {
    try {
      setLoading(true);

      const [summaryRes, chartsRes] = await Promise.all([
        api.get("/dashboard/summary"),
        api.get("/dashboard/charts")
      ]);

      setSummary(summaryRes.data?.data || {});
      setCharts(chartsRes.data?.data || {});
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  const cards = useMemo(() => {
    const allCards = [
      {
        title: t.todaySales,
        value: money(summary.todaySales),
        icon: DollarSign,
        color: "from-[#0B2545] to-[#0E7490]",
        permission: "view_sales"
      },
      {
        title: t.monthlySales,
        value: money(summary.monthlySales),
        icon: TrendingUp,
        color: "from-[#0E7490] to-[#14B8A6]",
        permission: "view_reports"
      },
      {
        title: t.expenses,
        value: money(summary.totalExpenses || 0),
        icon: TrendingDown,
        color: "from-[#F4B740] to-[#F97316]",
        permission: "view_expenses"
      },
      {
        title: t.purchases,
        value: money(summary.totalPurchases || 0),
        icon: ShoppingCart,
        color: "from-[#0B2545] to-[#F4B740]",
        permission: "view_purchases"
      }
    ];

    return allCards.filter((card) => can(card.permission, currentUser));
  }, [summary, currentUser, appSettings]);

  const smallStats = useMemo(() => {
    const allStats = [
      {
        title: t.customerCredit,
        value: money(summary.customerCreditBalance),
        icon: Wallet,
        permission: "view_customers"
      },
      {
        title: t.supplierPayables,
        value: money(summary.supplierPayableBalance),
        icon: Truck,
        permission: "view_suppliers"
      },
      {
        title: t.totalProducts,
        value: summary.totalProducts || 0,
        icon: Package,
        permission: "view_products"
      },
      {
        title: t.totalCategories,
        value: summary.totalCategories || 0,
        icon: Boxes,
        permission: "view_categories"
      },
      {
        title: t.lowStock,
        value: summary.lowStockCount || 0,
        icon: Package,
        permission: "view_low_stock"
      },
      {
        title: t.outOfStock,
        value: summary.outOfStockCount || 0,
        icon: Boxes,
        permission: "view_products"
      },
      {
        title: t.expiredProducts,
        value: summary.expiredProductCount || 0,
        icon: TrendingDown,
        permission: "view_products"
      },
      {
        title: t.expiringProducts,
        value: summary.expiringProductCount || 0,
        icon: Bell,
        permission: "view_products"
      }
    ];

    return allStats.filter((stat) => can(stat.permission, currentUser));
  }, [summary, currentUser, appSettings]);

  const paymentData = charts.paymentMethodChart || [];
  const topProducts = charts.topProducts || [];
  const salesChart = charts.salesChart || [];

  const showCharts =
    can("view_reports", currentUser) || can("view_sales", currentUser);

  const showProducts =
    can("view_products", currentUser) || can("view_reports", currentUser);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="w-14 h-14 rounded-full border-4 border-[#0E7490] border-t-transparent animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#f4f7fb] dark:bg-slate-950 space-y-6 transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-[#0B2545] dark:text-white">
              {can("view_reports", currentUser) || isAdmin(currentUser)
                ? t.title
                : t.limitedAccess}
            </h1>

            <p className="text-slate-500 dark:text-slate-400 mt-1">
              {t.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-3 bg-white dark:bg-slate-900 rounded-2xl px-4 py-3 shadow-sm">
              <Search size={18} className="text-slate-400" />
              <input
                placeholder={t.search}
                className="outline-none text-sm bg-transparent dark:text-white"
              />
            </div>

            <button className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 dark:text-white shadow-sm flex items-center justify-center">
              <Bell size={20} />
            </button>

            <div className="bg-white dark:bg-slate-900 rounded-2xl px-4 py-3 shadow-sm">
              <p className="font-black text-[#0B2545] dark:text-white">
                {currentUser.name || t.adminStore}
              </p>

              <p className="text-xs text-slate-400">
                {isAdmin(currentUser)
                  ? "Full Access"
                  : `${currentUser.permissions?.length || 0} Permissions`}
              </p>
            </div>
          </div>
        </div>

        {cards.length === 0 && smallStats.length === 0 && !showCharts ? (
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-10 border border-slate-100 dark:border-slate-800 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[#0E7490]/10 text-[#0E7490] flex items-center justify-center">
              <ShieldCheck size={30} />
            </div>

            <h2 className="text-2xl font-black mt-5 text-slate-900 dark:text-white">
              No dashboard permissions assigned
            </h2>

            <p className="text-slate-500 dark:text-slate-400 mt-2">
              Ask admin to assign dashboard or module permissions.
            </p>
          </div>
        ) : (
          <>
            {cards.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                {cards.map((card) => {
                  const Icon = card.icon;

                  return (
                    <div
                      key={card.title}
                      className={`rounded-[2rem] p-6 text-white bg-gradient-to-br ${card.color} shadow-xl relative overflow-hidden`}
                    >
                      <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full" />

                      <div className="flex justify-between items-start">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                          <Icon size={24} />
                        </div>

                        {card.badge ? (
                          <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold">
                            {card.badge}
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-6 text-white/80 text-sm">
                        {card.title}
                      </p>

                      <h2 className="text-4xl font-black mt-2">
                        {card.value}
                      </h2>

                    </div>
                  );
                })}
              </div>
            )}

            {smallStats.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                {smallStats.map((stat) => {
                  const Icon = stat.icon;

                  return (
                    <div
                      key={stat.title}
                      className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-slate-500 dark:text-slate-400 text-sm">
                            {stat.title}
                          </p>

                          <h3 className="text-3xl font-black text-[#0B2545] dark:text-white mt-3">
                            {stat.value}
                          </h3>
                        </div>

                        <div className="w-14 h-14 rounded-2xl bg-[#0B2545] text-white flex items-center justify-center shadow-lg">
                          <Icon size={24} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {showCharts && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800 min-w-0">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="text-xl font-black text-[#0B2545] dark:text-white">
                        {t.customerHabits}
                      </h2>

                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {t.trackSales}
                      </p>
                    </div>

                    <button className="w-10 h-10 rounded-full bg-[#0B2545] text-white flex items-center justify-center">
                      <ArrowUpRight size={18} />
                    </button>
                  </div>

                  <div className="w-full min-w-0 h-[360px] min-h-[360px]">
                    <ResponsiveContainer width="99%" height={360}>
                      <BarChart data={salesChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="_id" />
                        <YAxis />
                        <Tooltip formatter={(value) => money(value)} />
                        <Bar
                          dataKey="total"
                          fill="#0E7490"
                          radius={[12, 12, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800 min-w-0">
                  <h2 className="text-xl font-black text-[#0B2545] dark:text-white">
                    {t.productStatistic}
                  </h2>

                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t.paymentShare}
                  </p>

                  <div className="w-full min-w-0 h-[270px] min-h-[270px] mt-4">
                    <ResponsiveContainer width="99%" height={270}>
                      <PieChart>
                        <Pie
                          data={paymentData}
                          dataKey="total"
                          nameKey="_id"
                          innerRadius={65}
                          outerRadius={105}
                          paddingAngle={6}
                        >
                          {paymentData.map((_, index) => (
                            <Cell
                              key={index}
                              fill={
                                [
                                  "#0B2545",
                                  "#0E7490",
                                  "#F4B740",
                                  "#14B8A6"
                                ][index % 4]
                              }
                            />
                          ))}
                        </Pie>

                        <Tooltip formatter={(value) => money(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-3">
                    {paymentData.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="font-bold text-slate-600 dark:text-slate-300">
                          {item._id || "Unknown"}
                        </span>

                        <span className="font-black text-[#0B2545] dark:text-white">
                          {money(item.total)}
                        </span>
                      </div>
                    ))}

                    {paymentData.length === 0 && (
                      <p className="text-center text-slate-400 py-5">
                        {t.noPayment}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {showProducts && (
              <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                <h2 className="text-xl font-black text-[#0B2545] dark:text-white">
                  {t.topSold}
                </h2>

                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t.bestItems}
                </p>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  {topProducts.map((product, index) => (
                    <div
                      key={index}
                      className="rounded-3xl bg-[#f4f7fb] dark:bg-slate-800 p-5 border border-slate-100 dark:border-slate-700"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-[#F4B740] text-[#0B2545] flex items-center justify-center mb-4">
                        <Package size={22} />
                      </div>

                      <h3 className="font-black text-[#0B2545] dark:text-white">
                        {product._id || t.product}
                      </h3>

                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {t.quantitySold}: {product.quantity}
                      </p>

                      <p className="text-2xl font-black mt-3 text-[#0E7490]">
                        {money(product.revenue)}
                      </p>
                    </div>
                  ))}

                  {topProducts.length === 0 && (
                    <div className="col-span-full text-center text-slate-400 py-10">
                      {t.noTopProducts}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}