import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  BookOpen,
  Download,
  Landmark,
  Search,
  Smartphone,
  Wallet
} from "lucide-react";
import DashboardLayout from "../layouts/DashboardLayout";
import api from "../api/client";

function getCurrency() {
  try {
    return JSON.parse(localStorage.getItem("store_settings") || "{}").currency || "USD";
  } catch {
    return "USD";
  }
}

export default function Cashbook() {
  const currency = getCurrency();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [account, setAccount] = useState("");

  useEffect(() => { loadCashbook(); }, []);

  async function loadCashbook() {
    setLoading(true);
    try {
      const response = await api.get("/accounts", { params: { limit: 500 } });
      setTransactions(response.data?.data?.accounts || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load cashbook");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return transactions.filter((item) => {
      const matchesSearch = !needle || `${item.title} ${item.note} ${item.referenceNumber} ${item.sourceType}`.toLowerCase().includes(needle);
      return matchesSearch && (!account || item.account === account);
    });
  }, [transactions, search, account]);

  const totals = useMemo(() => {
    const income = filtered.filter((item) => item.type === "income").reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const expense = filtered.filter((item) => item.type === "expense").reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const byAccount = (name) => filtered.filter((item) => item.account === name).reduce((sum, item) => sum + (item.type === "income" ? Number(item.amount || 0) : -Number(item.amount || 0)), 0);
    return { income, expense, balance: income - expense, cash: byAccount("cash"), bank: byAccount("bank"), mobile: byAccount("mobile_money") };
  }, [filtered]);

  const money = (value) => `${currency} ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  function exportCSV() {
    const rows = [
      ["Date", "Reference", "Title", "Source", "Type", "Account", "Amount", "Note"],
      ...filtered.map((item) => [new Date(item.date).toLocaleDateString(), item.referenceNumber, item.title, item.sourceType, item.type, item.account, item.amount, item.note])
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `cashbook-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <section className="rounded-[2rem] bg-gradient-to-br from-[#064E3B] via-[#0E7490] to-[#4F46E5] p-7 text-white shadow-xl md:p-9">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div><p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-100">Automatic Ledger</p><h1 className="mt-2 text-3xl font-black md:text-4xl">Cashbook</h1><p className="mt-3 max-w-2xl text-white/75">A unified, database-backed cashflow ledger generated from sales, purchases, refunds, approved expenses, and manual account entries.</p></div>
            <button onClick={exportCSV} className="flex items-center gap-2 self-start rounded-2xl bg-white/15 px-5 py-3 font-black hover:bg-white/25"><Download size={18} /> Export CSV</button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat title="Cash In" value={money(totals.income)} icon={ArrowDownCircle} tone="green" />
          <Stat title="Cash Out" value={money(totals.expense)} icon={ArrowUpCircle} tone="red" />
          <Stat title="Net Balance" value={money(totals.balance)} icon={Wallet} tone="blue" />
          <Stat title="Entries" value={filtered.length} icon={BookOpen} tone="slate" />
        </section>

        <section className="grid gap-4 md:grid-cols-3"><Balance title="Cash" value={money(totals.cash)} icon={Wallet} /><Balance title="Bank" value={money(totals.bank)} icon={Landmark} /><Balance title="Mobile Money" value={money(totals.mobile)} icon={Smartphone} /></section>

        <section className="grid gap-3 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-[1fr_220px]">
          <div className="relative"><Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="input-class pl-12" placeholder="Search title, reference, source..." /></div>
          <select value={account} onChange={(event) => setAccount(event.target.value)} className="input-class"><option value="">All accounts</option><option value="cash">Cash</option><option value="bank">Bank</option><option value="mobile_money">Mobile money</option></select>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto"><table className="w-full min-w-[1050px]"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-800"><tr>{["Date", "Reference", "Transaction", "Source", "Account", "In", "Out", "Running Type"].map((head) => <th key={head} className="px-5 py-4 font-black">{head}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{filtered.map((item) => <tr key={item._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60"><td className="px-5 py-4">{new Date(item.date).toLocaleDateString()}</td><td className="px-5 py-4 text-xs font-black text-cyan-700">{item.referenceNumber || "—"}</td><td className="px-5 py-4"><p className="font-black">{item.title}</p><p className="max-w-sm truncate text-xs text-slate-500">{item.note || "No note"}</p></td><td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase dark:bg-slate-800">{item.sourceType || "manual"}</span></td><td className="px-5 py-4 capitalize">{item.account?.replace("_", " ")}</td><td className="px-5 py-4 font-black text-emerald-600">{item.type === "income" ? money(item.amount) : "—"}</td><td className="px-5 py-4 font-black text-rose-600">{item.type === "expense" ? money(item.amount) : "—"}</td><td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${item.type === "income" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{item.type}</span></td></tr>)}</tbody></table></div>
          {(loading || filtered.length === 0) && <div className="p-12 text-center text-slate-500"><BookOpen className="mx-auto mb-3 text-slate-300" size={42} /><p className="font-bold">{loading ? "Loading cashbook..." : "No cashbook entries found"}</p></div>}
        </section>
      </div>
    </DashboardLayout>
  );
}

function Stat({ title, value, icon: Icon, tone }) { const style = { green: "bg-emerald-100 text-emerald-700", red: "bg-rose-100 text-rose-700", blue: "bg-blue-100 text-blue-700", slate: "bg-slate-100 text-slate-700" }[tone]; return <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between"><div><p className="text-sm font-bold text-slate-500">{title}</p><p className="mt-2 text-2xl font-black">{value}</p></div><div className={`rounded-2xl p-3 ${style}`}><Icon size={22} /></div></div></div>; }
function Balance({ title, value, icon: Icon }) { return <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center gap-4"><div className="rounded-2xl bg-cyan-100 p-3 text-cyan-800"><Icon size={21} /></div><div><p className="text-sm font-bold text-slate-500">{title}</p><p className="text-xl font-black">{value}</p></div></div></div>; }
