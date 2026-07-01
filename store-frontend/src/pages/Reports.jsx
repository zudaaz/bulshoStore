import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Wallet,
  Boxes
} from "lucide-react";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from "recharts";

import DashboardLayout from "../layouts/DashboardLayout";
import api from "../api/client";

const translations = {
  English: {
    loading: "Loading reports...",
    title: "Reports Dashboard",
    subtitle: "Analytics, sales, expenses, and business performance",
    todaySales: "Today's Sales",
    monthlySales: "Monthly Sales",
    expenses: "Expenses",
    purchases: "Purchases",
    customerCredit: "Customer Credit",
    supplierPayables: "Supplier Payables",
    lowStock: "Low Stock",
    outOfStock: "Out of Stock",
    salesOverview: "Sales Overview",
    dailySales: "Daily sales performance",
    paymentMethods: "Payment Methods",
    salesByPayment: "Sales by payment type",
    topProducts: "Top Selling Products",
    bestInventory: "Best performing inventory items",
    salesRevenue: "Sales Revenue",
    monthlyRevenueDesc: "Total monthly sales revenue",
    businessExpenses: "Business Expenses",
    businessExpensesDesc: "Total business operating expenses"
  },
  Somali: {
    loading: "Warbixinada waa la soo rarayaa...",
    title: "Dashboard-ka Warbixinada",
    subtitle: "Falanqayn, iib, kharash, iyo waxqabadka ganacsiga",
    todaySales: "Iibka Maanta",
    monthlySales: "Iibka Bishan",
    expenses: "Kharashaadka",
    purchases: "Iibsashada",
    customerCredit: "Deynta Macaamiisha",
    supplierPayables: "Deynta Alaab-qeybiyaha",
    lowStock: "Bakhaar Yar",
    outOfStock: "Bakhaar Dhamaaday",
    salesOverview: "Guudmarka Iibka",
    dailySales: "Waxqabadka iibka maalinlaha ah",
    paymentMethods: "Hababka Lacag Bixinta",
    salesByPayment: "Iibka hab lacag bixin ahaan",
    topProducts: "Alaabta Ugu Iibka Badan",
    bestInventory: "Alaabta ugu waxqabadka fiican",
    salesRevenue: "Dakhliga Iibka",
    monthlyRevenueDesc: "Dakhliga iibka bisha oo dhan",
    businessExpenses: "Kharashaadka Ganacsiga",
    businessExpensesDesc: "Kharashaadka guud ee ganacsiga"
  },
  Arabic: {
    loading: "جارٍ تحميل التقارير...",
    title: "لوحة التقارير",
    subtitle: "التحليلات والمبيعات والمصروفات وأداء العمل",
    todaySales: "مبيعات اليوم",
    monthlySales: "مبيعات الشهر",
    expenses: "المصروفات",
    purchases: "المشتريات",
    customerCredit: "ديون العملاء",
    supplierPayables: "مستحقات الموردين",
    lowStock: "مخزون منخفض",
    outOfStock: "نفد المخزون",
    salesOverview: "نظرة عامة على المبيعات",
    dailySales: "أداء المبيعات اليومي",
    paymentMethods: "طرق الدفع",
    salesByPayment: "المبيعات حسب نوع الدفع",
    topProducts: "أفضل المنتجات مبيعاً",
    bestInventory: "أفضل عناصر المخزون أداءً",
    salesRevenue: "إيرادات المبيعات",
    monthlyRevenueDesc: "إجمالي إيرادات المبيعات الشهرية",
    businessExpenses: "مصروفات العمل",
    businessExpensesDesc: "إجمالي مصروفات التشغيل"
  }
};

function getAppSettings() {
  const saved = JSON.parse(localStorage.getItem("store_settings") || "{}");

  return {
    currency: saved.currency || localStorage.getItem("app_currency") || "USD",
    language: saved.language || localStorage.getItem("app_language") || "English"
  };
}

export default function Reports() {
  const [summary, setSummary] = useState({});
  const [charts, setCharts] = useState({});
  const [loading, setLoading] = useState(true);
  const [appSettings, setAppSettings] = useState(getAppSettings);


  const currency = appSettings.currency;
  const t = translations[appSettings.language] || translations.English;

  useEffect(() => {
    loadReports();


    function handleSettingsUpdated() {
      setAppSettings(getAppSettings());
    }

    window.addEventListener("settings-updated", handleSettingsUpdated);
    window.addEventListener("dashboard-updated", loadReports);

    return () => {
      window.removeEventListener("settings-updated", handleSettingsUpdated);
      window.removeEventListener("dashboard-updated", loadReports);
    };
  }, []);

  function money(value) {
    return `${currency} ${Number(value || 0).toLocaleString()}`;
  }

  async function loadReports() {
    try {
      setLoading(true);

      const [summaryRes, chartsRes] = await Promise.all([
        api.get("/dashboard/summary"),
        api.get("/dashboard/charts")
      ]);

      setSummary(summaryRes.data?.data || {});
      setCharts(chartsRes.data?.data || {});
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }

  const totalExpenses = summary?.totalExpenses || 0;
  const totalPurchases = summary?.totalPurchases || 0;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="text-center">
            <div className="w-14 h-14 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-slate-500 dark:text-slate-400 font-medium">
              {t.loading}
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-7">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#071B34] via-[#0E7490] to-[#4F46E5] p-7 text-white shadow-2xl">
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10 blur-3xl" />

          <div className="relative z-10">
            <h1 className="text-4xl font-black">{t.title}</h1>
            <p className="text-white/80 mt-2">{t.subtitle}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          <Card
            title={t.todaySales}
            value={money(summary?.todaySales)}
            icon={DollarSign}
            color="bg-emerald-500"
          />

          <Card
            title={t.monthlySales}
            value={money(summary?.monthlySales)}
            icon={TrendingUp}
            color="bg-indigo-500"
          />

          <Card
            title={t.expenses}
            value={money(totalExpenses)}
            icon={TrendingDown}
            color="bg-red-500"
          />

          <Card
            title={t.purchases}
            value={money(totalPurchases)}
            icon={ShoppingCart}
            color="bg-orange-500"
          />

          <Card
            title={t.customerCredit}
            value={money(summary?.customerCreditBalance)}
            icon={Wallet}
            color="bg-sky-500"
          />

          <Card
            title={t.supplierPayables}
            value={money(summary?.supplierPayableBalance)}
            icon={Wallet}
            color="bg-purple-500"
          />

          <Card
            title={t.lowStock}
            value={summary?.lowStockCount || 0}
            icon={Boxes}
            color="bg-yellow-500"
          />

          <Card
            title={t.outOfStock}
            value={summary?.outOfStockCount || 0}
            icon={Boxes}
            color="bg-slate-900"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800 min-w-0">
            <div className="mb-6">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                {t.salesOverview}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                {t.dailySales}
              </p>
            </div>

            <div className="w-full h-[350px] min-h-[350px]">
              <ResponsiveContainer width="99%" height={350}>
                <AreaChart data={charts?.salesChart || []}>
                  <defs>
                    <linearGradient id="sales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="_id" />
                  <YAxis />
                  <Tooltip formatter={(value) => money(value)} />

                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#6366f1"
                    fillOpacity={1}
                    fill="url(#sales)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800 min-w-0">
            <div className="mb-6">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                {t.paymentMethods}
              </h2>

              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                {t.salesByPayment}
              </p>
            </div>

            <div className="w-full h-[350px] min-h-[350px]">
              <ResponsiveContainer width="99%" height={350}>
                <PieChart>
                  <Pie
                    data={charts?.paymentMethodChart || []}
                    dataKey="total"
                    nameKey="_id"
                    outerRadius={120}
                    label
                  >
                    {(charts?.paymentMethodChart || []).map((_, index) => (
                      <Cell
                        key={index}
                        fill={
                          [
                            "#6366f1",
                            "#10b981",
                            "#f59e0b",
                            "#ef4444",
                            "#8b5cf6"
                          ][index % 5]
                        }
                      />
                    ))}
                  </Pie>

                  <Tooltip formatter={(value) => money(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="mb-6">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              {t.topProducts}
            </h2>

            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              {t.bestInventory}
            </p>
          </div>

          <div className="w-full h-[400px] min-h-[400px]">
            <ResponsiveContainer width="99%" height={400}>
              <BarChart data={charts?.topProducts || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="_id" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="quantity" fill="#6366f1" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <StatCard
            title={t.salesRevenue}
            value={money(summary?.monthlySales)}
            description={t.monthlyRevenueDesc}
            color="bg-emerald-50 text-emerald-600"
          />

          <StatCard
            title={t.businessExpenses}
            value={money(totalExpenses)}
            description={t.businessExpensesDesc}
            color="bg-red-50 text-red-600"
          />
        </div>
      </div>
    </DashboardLayout>
  );
}

function Card({ title, value, icon: Icon, color }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 shadow-sm border border-slate-100 dark:border-slate-800">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
            {title}
          </p>

          <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-3">
            {value}
          </h3>
        </div>

        <div
          className={`w-16 h-16 rounded-2xl ${color} text-white flex items-center justify-center shadow-lg`}
        >
          <Icon size={28} />
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, description, color }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800">
      <div className={`inline-flex px-4 py-2 rounded-2xl ${color}`}>
        <span className="font-bold">{title}</span>
      </div>

      <h3 className="text-4xl font-black text-slate-900 dark:text-white mt-5">
        {value}
      </h3>

      <p className="text-slate-500 dark:text-slate-400 mt-3">
        {description}
      </p>
    </div>
  );
}