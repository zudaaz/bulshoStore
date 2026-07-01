import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Search,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  CreditCard,
  Landmark,
  Pencil,
  Trash2,
  X,
  CalendarDays,
  Download,
  FileText
} from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";
import api from "../api/client";

const emptyForm = {
  title: "",
  type: "income",
  account: "cash",
  amount: "",
  date: "",
  note: ""
};

function getCurrentCurrency() {
  try {
    const saved = JSON.parse(localStorage.getItem("store_settings") || "{}");
    return saved.currency || localStorage.getItem("app_currency") || "USD";
  } catch {
    return localStorage.getItem("app_currency") || "USD";
  }
}

export default function Account() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState(getCurrentCurrency);

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    loadTransactions();

    function refreshCurrency() {
      setCurrency(getCurrentCurrency());
    }

    window.addEventListener("settings-updated", refreshCurrency);
    window.addEventListener("storage", refreshCurrency);

    refreshCurrency();

    return () => {
      window.removeEventListener("settings-updated", refreshCurrency);
      window.removeEventListener("storage", refreshCurrency);
    };
  }, []);

  async function loadTransactions() {
    try {
      setLoading(true);
      const res = await api.get("/accounts");
      setTransactions(res.data?.data?.accounts || res.data?.data || []);
    } catch (error) {
      console.log(error);
      toast.error("Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }

  function money(value) {
    return `${currency} ${Number(value || 0).toLocaleString()}`;
  }

  const income = transactions
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const expense = transactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const balance = income - expense;

  const filtered = useMemo(() => {
    return transactions.filter((item) => {
      const text = `${item.title || ""} ${item.type || ""} ${
        item.account || ""
      } ${item.note || ""}`.toLowerCase();

      return text.includes(search.toLowerCase());
    });
  }, [transactions, search]);

  function getAccountBalance(accountName) {
    const accountIncome = transactions
      .filter((item) => item.account === accountName && item.type === "income")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const accountExpense = transactions
      .filter((item) => item.account === accountName && item.type === "expense")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return accountIncome - accountExpense;
  }

  function openCreate(type = "income") {
    setEditingId(null);
    setForm({
      ...emptyForm,
      type,
      date: new Date().toISOString().slice(0, 10)
    });
    setOpen(true);
  }

  function openEdit(item) {
    if (item.isSystemGenerated) {
      toast.error("System entries must be changed from their source transaction");
      return;
    }
    setEditingId(item._id);

    setForm({
      title: item.title || "",
      type: item.type || "income",
      account: item.account || "cash",
      amount: item.amount || "",
      date: item.date?.slice(0, 10) || "",
      note: item.note || ""
    });

    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function saveTransaction(e) {
    e.preventDefault();

    if (!form.title || !form.amount || !form.date) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const payload = {
        ...form,
        amount: Number(form.amount)
      };

      if (editingId) {
        await api.put(`/accounts/${editingId}`, payload);
        toast.success("Transaction updated");
      } else {
        await api.post("/accounts", payload);
        toast.success("Transaction added");
      }

      closeModal();
      await loadTransactions();
      window.dispatchEvent(new Event("dashboard-updated"));
    } catch (error) {
      console.log(error);
      toast.error(error.response?.data?.message || "Failed to save transaction");
    }
  }

  async function deleteTransaction(item) {
    if (item.isSystemGenerated) {
      toast.error("System entries must be reversed from their source transaction");
      return;
    }
    if (!confirm("Delete this transaction?")) return;

    try {
      await api.delete(`/accounts/${item._id}`);
      toast.success("Transaction deleted");
      await loadTransactions();
      window.dispatchEvent(new Event("dashboard-updated"));
    } catch (error) {
      console.log(error);
      toast.error("Delete failed");
    }
  }

  function exportCSV() {
    const rows = [
      ["Title", "Type", "Account", "Date", "Amount", "Note"],
      ...transactions.map((item) => [
        item.title,
        item.type,
        item.account,
        item.date,
        item.amount,
        item.note || ""
      ])
    ];

    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "accounts.csv";
    a.click();

    URL.revokeObjectURL(url);
  }

  function formatAccountName(value) {
    if (value === "bank") return "Bank";
    if (value === "mobile_money") return "Mobile Money";
    return "Cash";
  }

  return (
    <DashboardLayout>
      <div className="space-y-7">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#0B2545] via-[#0E7490] to-[#4F46E5] p-7 text-white shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div>
              <h1 className="text-4xl font-black">Account Management</h1>
              <p className="text-white/80 mt-2">
                Manage income, expenses and balances
              </p>
            </div>

            <div className="flex gap-3 flex-wrap">
              <button
                type="button"
                onClick={exportCSV}
                className="bg-white/15 hover:bg-white/25 text-white px-6 py-4 rounded-2xl font-black flex items-center gap-2"
              >
                <Download size={18} />
                Export CSV
              </button>

              <button
                type="button"
                onClick={() => openCreate("income")}
                className="bg-white text-emerald-700 px-6 py-4 rounded-2xl font-black flex items-center gap-2"
              >
                <ArrowDownCircle size={20} />
                Add Income
              </button>

              <button
                type="button"
                onClick={() => openCreate("expense")}
                className="bg-red-600 text-white px-6 py-4 rounded-2xl font-black flex items-center gap-2"
              >
                <ArrowUpCircle size={20} />
                Add Expense
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          <StatCard
            title="Balance"
            value={money(balance)}
            icon={Wallet}
            color="from-indigo-500 to-violet-600"
          />

          <StatCard
            title="Income"
            value={money(income)}
            icon={ArrowDownCircle}
            color="from-green-500 to-emerald-600"
          />

          <StatCard
            title="Expense"
            value={money(expense)}
            icon={ArrowUpCircle}
            color="from-red-500 to-orange-600"
          />

          <StatCard
            title="Accounts"
            value="3"
            icon={Landmark}
            color="from-blue-500 to-cyan-600"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <AccountCard
            title="Cash"
            value={money(getAccountBalance("cash"))}
            icon={Wallet}
          />

          <AccountCard
            title="Bank"
            value={money(getAccountBalance("bank"))}
            icon={Landmark}
          />

          <AccountCard
            title="Mobile Money"
            value={money(getAccountBalance("mobile_money"))}
            icon={CreditCard}
          />
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-5">
          <div className="relative max-w-xl">
            <Search size={18} className="absolute left-4 top-4 text-slate-400" />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search transactions..."
              className="w-full bg-slate-100 dark:bg-slate-800 dark:text-white rounded-2xl pl-12 pr-4 py-4 outline-none"
            />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px]">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <Th text="Transaction" />
                  <Th text="Type" />
                  <Th text="Account" />
                  <Th text="Date" />
                  <Th text="Amount" />
                  <Th text="Action" right />
                </tr>
              </thead>

              <tbody>
                {!loading &&
                  filtered.map((item) => (
                    <tr
                      key={item._id}
                      className="border-b border-slate-100 dark:border-slate-800"
                    >
                      <Td>
                        <div>
                          <p className="font-black">{item.title}</p>
                          <p className="text-xs text-slate-400">
                            {item.note || "No note"}
                          </p>
                        </div>
                      </Td>

                      <Td>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            item.type === "income"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {item.type}
                        </span>
                      </Td>

                      <Td>{formatAccountName(item.account)}</Td>

                      <Td>
                        <div className="flex items-center gap-2">
                          <CalendarDays size={15} />
                          {item.date?.slice(0, 10)}
                        </div>
                      </Td>

                      <Td>
                        <span
                          className={
                            item.type === "income"
                              ? "font-black text-green-600"
                              : "font-black text-red-500"
                          }
                        >
                          {money(item.amount)}
                        </span>
                      </Td>

                      <Td right>
                        <div className="flex justify-end gap-2">
                          {item.isSystemGenerated ? (
                            <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-black text-cyan-700">
                              {item.sourceType || "system"}
                            </span>
                          ) : (
                            <>
                              <button type="button" onClick={() => openEdit(item)} className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                                <Pencil size={16} />
                              </button>
                              <button type="button" onClick={() => deleteTransaction(item)} className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </Td>
                    </tr>
                  ))}

                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-12 text-center text-slate-500">
                      <FileText size={45} className="mx-auto mb-3 text-slate-300" />
                      No transactions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {open && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <form
              onSubmit={saveTransaction}
              className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2rem] p-8"
            >
              <div className="flex justify-between mb-6">
                <h2 className="text-3xl font-black dark:text-white">
                  {editingId ? "Update Transaction" : "Add Transaction"}
                </h2>

                <button type="button" onClick={closeModal}>
                  <X size={26} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input
                  label="Title"
                  value={form.title}
                  onChange={(value) => setForm({ ...form, title: value })}
                />

                <Select
                  label="Type"
                  value={form.type}
                  onChange={(value) => setForm({ ...form, type: value })}
                >
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </Select>

                <Select
                  label="Account"
                  value={form.account}
                  onChange={(value) => setForm({ ...form, account: value })}
                >
                  <option value="cash">Cash</option>
                  <option value="bank">Bank</option>
                  <option value="mobile_money">Mobile Money</option>
                </Select>

                <Input
                  label="Amount"
                  type="number"
                  value={form.amount}
                  onChange={(value) => setForm({ ...form, amount: value })}
                />

                <Input
                  label="Date"
                  type="date"
                  value={form.date}
                  onChange={(value) => setForm({ ...form, date: value })}
                />

                <div className="md:col-span-2">
                  <label className="text-sm font-bold dark:text-white">
                    Note
                  </label>

                  <textarea
                    value={form.note}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        note: e.target.value
                      })
                    }
                    rows="4"
                    className="w-full mt-2 px-4 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 dark:text-white"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-6 py-3 rounded-2xl bg-indigo-600 text-white"
                >
                  Save Transaction
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function AccountCard({ title, value, icon: Icon }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6">
      <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
        <Icon size={25} />
      </div>

      <p className="text-slate-500 dark:text-slate-400 mt-5">{title}</p>

      <h3 className="text-3xl font-black mt-2 dark:text-white">{value}</h3>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{title}</p>
          <h2 className="text-3xl font-black mt-2 dark:text-white">{value}</h2>
        </div>

        <div
          className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${color} text-white flex items-center justify-center`}
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
      className={`px-6 py-4 text-sm font-black dark:text-white ${
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
      className={`px-6 py-4 text-sm dark:text-slate-300 ${
        right ? "text-right" : "text-left"
      }`}
    >
      {children}
    </td>
  );
}

function Input({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="text-sm font-bold dark:text-white">{label}</label>

      <input
        required
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-2 px-4 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 dark:text-white outline-none"
      />
    </div>
  );
}

function Select({ label, value, onChange, children }) {
  return (
    <div>
      <label className="text-sm font-bold dark:text-white">{label}</label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-2 px-4 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 dark:text-white outline-none"
      >
        {children}
      </select>
    </div>
  );
}