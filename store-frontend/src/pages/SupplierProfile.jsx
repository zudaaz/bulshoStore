import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Bell,
  Download,
  FileText,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  ReceiptText,
  Truck,
  Wallet
} from "lucide-react";
import DashboardLayout from "../layouts/DashboardLayout";
import api from "../api/client";

function getAppSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem("store_settings") || "{}");
    return {
      currency: saved.currency || localStorage.getItem("app_currency") || "USD",
      storeName: saved.storeName || "Bulsho Store"
    };
  } catch {
    return { currency: "USD", storeName: "Bulsho Store" };
  }
}

function cleanPhone(phone = "") {
  let value = String(phone).replace(/\D/g, "");
  if (value.startsWith("0")) value = value.slice(1);
  if (value && !value.startsWith("252")) value = `252${value}`;
  return value;
}

export default function SupplierProfile() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appSettings, setAppSettings] = useState(getAppSettings);

  const supplier = data?.supplier || null;
  const purchases = Array.isArray(data?.purchases) ? data.purchases : [];
  const summary = data?.summary || {};
  const currency = appSettings.currency;

  async function loadSupplier() {
    try {
      setLoading(true);
      const response = await api.get(`/suppliers/${id}/statement`);
      setData(response.data?.data || null);
    } catch (error) {
      setData(null);
      toast.error(error.response?.data?.message || "Failed to load supplier profile");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSupplier();
    function handleSettingsUpdated() {
      setAppSettings(getAppSettings());
    }
    window.addEventListener("settings-updated", handleSettingsUpdated);
    return () => window.removeEventListener("settings-updated", handleSettingsUpdated);
  }, [id]);

  function money(value) {
    return `${currency} ${Number(value || 0).toLocaleString()}`;
  }

  function callSupplier() {
    if (!supplier?.phone) return toast.error("Supplier phone not found");
    window.location.href = `tel:${supplier.phone}`;
  }

  function whatsappSupplier() {
    const phone = cleanPhone(supplier?.phone);
    if (!phone) return toast.error("Supplier phone not found");
    const message = encodeURIComponent(`Hello ${supplier.name}, this is ${appSettings.storeName}.`);
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank", "noopener,noreferrer");
  }

  function exportCSV() {
    const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const rows = [
      ["Supplier Statement"],
      ["Store", appSettings.storeName],
      ["Supplier", supplier?.name || ""],
      ["Phone", supplier?.phone || ""],
      [],
      ["Date", "Invoice", "Total", "Paid", "Balance", "Status"],
      ...purchases.map((item) => [
        new Date(item.createdAt).toLocaleDateString(),
        item.invoiceNumber || "-",
        Number(item.subtotal || 0),
        Number(item.paidAmount || 0),
        Number(item.balance || 0),
        item.status || "completed"
      ])
    ];
    const blob = new Blob([rows.map((row) => row.map(escape).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${supplier?.name || "supplier"}-statement.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Supplier statement exported");
  }

  if (loading) {
    return <DashboardLayout><div className="flex min-h-[70vh] items-center justify-center"><Loader2 size={46} className="animate-spin text-[#0E7490]" /></div></DashboardLayout>;
  }

  if (!supplier) {
    return <DashboardLayout><div className="rounded-[2rem] bg-white p-10 text-center text-slate-500 dark:bg-slate-900">Supplier not found.</div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-7">
        <Link to="/suppliers" className="inline-flex items-center gap-2 font-black text-slate-500 hover:text-indigo-600"><ArrowLeft size={18} /> Back to suppliers</Link>

        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#071B34] via-[#0E7490] to-[#7C3AED] p-7 text-white shadow-2xl">
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-5">
              <div className="flex h-20 w-20 items-center justify-center rounded-[1.8rem] bg-white/20 text-4xl font-black">{supplier.name?.charAt(0)?.toUpperCase() || "S"}</div>
              <div><h1 className="text-4xl font-black">{supplier.name}</h1><p className="mt-1 text-white/75">Supplier Account</p><div className="mt-4 flex flex-wrap gap-4 text-sm text-white/80"><Info icon={Phone} value={supplier.phone || "No phone"} /><Info icon={Mail} value={supplier.email || "No email"} /><Info icon={MapPin} value={supplier.address || "No address"} /></div></div>
            </div>
            <div className="min-w-[260px] rounded-[1.7rem] border border-white/15 bg-white/15 p-5"><div className="flex items-center gap-3 text-white/80"><Wallet size={23} /><span className="font-bold">Supplier Payable</span></div><h2 className="mt-3 text-4xl font-black">{money(summary.balance)}</h2></div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4 md:grid-cols-5"><Action icon={Phone} label="Call" onClick={callSupplier} color="text-blue-600" /><Action icon={MessageSquare} label="WhatsApp" onClick={whatsappSupplier} color="text-green-600" /><Action icon={FileText} label="Print" onClick={() => window.print()} color="text-slate-600" /><Action icon={Download} label="Export CSV" onClick={exportCSV} color="text-indigo-600" /><Action icon={Bell} label="Reminder" onClick={() => toast("Use the payment module to record or follow up supplier balances.")} color="text-orange-600" /></section>

        <section className="grid gap-5 md:grid-cols-3"><Stat title="Total Purchases" value={money(summary.totalPurchases)} /><Stat title="Total Paid" value={money(summary.totalPaid)} /><Stat title="Payable" value={money(summary.balance)} /></section>

        <section className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <header className="flex items-center gap-3 border-b border-slate-100 p-6 dark:border-slate-800"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600"><ReceiptText size={24} /></div><div><h2 className="text-xl font-black text-slate-900 dark:text-white">Supplier Statement</h2><p className="text-sm text-slate-500">Purchase invoices and balances</p></div></header>
          <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead className="bg-slate-50 dark:bg-slate-800"><tr><Th>Date</Th><Th>Invoice</Th><Th>Total</Th><Th>Paid</Th><Th>Balance</Th><Th>Status</Th></tr></thead><tbody>{purchases.map((item) => <Row key={item._id} item={item} money={money} />)}{purchases.length === 0 && <tr><td colSpan="6" className="p-10 text-center text-slate-500"><Truck size={45} className="mx-auto mb-3 text-slate-300" />No purchase records found</td></tr>}</tbody></table></div>
        </section>
      </div>
    </DashboardLayout>
  );
}

function Row({ item, money }) {
  return <tr className="border-t border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"><td className="p-5 text-slate-600 dark:text-slate-300">{new Date(item.createdAt).toLocaleDateString()}</td><td className="p-5 font-black text-slate-800 dark:text-white">{item.invoiceNumber || "-"}</td><td className="p-5 text-slate-600 dark:text-slate-300">{money(item.subtotal)}</td><td className="p-5 font-black text-emerald-600">{money(item.paidAmount)}</td><td className="p-5 font-black text-red-500">{money(item.balance)}</td><td className="p-5"><span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-600">{item.status || "completed"}</span></td></tr>;
}
function Th({ children }) { return <th className="p-5 font-black text-slate-600 dark:text-slate-300">{children}</th>; }
function Info({ icon: Icon, value }) { return <div className="flex items-center gap-2"><Icon size={16} /><span>{value}</span></div>; }
function Stat({ title, value }) { return <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="font-medium text-slate-500">{title}</p><h3 className="mt-3 text-3xl font-black text-slate-900 dark:text-white">{value}</h3></div>; }
function Action({ icon: Icon, label, onClick, color }) { return <button type="button" onClick={onClick} className="flex flex-col items-center gap-3 rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"><Icon size={28} className={color} /><span className="font-black text-slate-700 dark:text-slate-300">{label}</span></button>; }
