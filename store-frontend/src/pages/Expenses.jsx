import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowDownToLine,
  Banknote,
  CalendarDays,
  CreditCard,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  Wallet,
  X
} from "lucide-react";
import DashboardLayout from "../layouts/DashboardLayout";
import api from "../api/client";

const emptyForm = {
  referenceNumber: "",
  title: "",
  category: "General",
  amount: "",
  paymentMethod: "cash",
  date: new Date().toISOString().slice(0, 10),
  description: "",
  status: "approved"
};

function getCurrency() {
  try {
    const settings = JSON.parse(localStorage.getItem("store_settings") || "{}");
    return settings.currency || localStorage.getItem("app_currency") || "USD";
  } catch {
    return "USD";
  }
}

function unwrapExpenses(response) {
  const data = response?.data?.data;
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.expenses) ? data.expenses : [];
}

export default function Expenses() {
  const currency = getCurrency();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const money = (value) => `${currency} ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  useEffect(() => {
    loadExpenses();
  }, []);

  async function loadExpenses() {
    setLoading(true);
    try {
      const response = await api.get("/expenses", { params: { limit: 200 } });
      setExpenses(unwrapExpenses(response));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return expenses.filter((expense) => {
      const matchesSearch = !needle || `${expense.referenceNumber || ""} ${expense.title || ""} ${expense.category || ""} ${expense.description || ""}`.toLowerCase().includes(needle);
      const matchesMethod = !filterMethod || expense.paymentMethod === filterMethod;
      return matchesSearch && matchesMethod;
    });
  }, [expenses, search, filterMethod]);

  const summary = useMemo(() => ({
    total: expenses.filter((item) => item.status === "approved").reduce((sum, item) => sum + Number(item.amount || 0), 0),
    cash: expenses.filter((item) => item.status === "approved" && item.paymentMethod === "cash").reduce((sum, item) => sum + Number(item.amount || 0), 0),
    digital: expenses.filter((item) => item.status === "approved" && ["bank", "mobile_money"].includes(item.paymentMethod)).reduce((sum, item) => sum + Number(item.amount || 0), 0),
    pending: expenses.filter((item) => item.status === "pending").length
  }), [expenses]);

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm, date: new Date().toISOString().slice(0, 10) });
    setShowForm(true);
  }

  function openEdit(expense) {
    setEditingId(expense._id);
    setForm({
      referenceNumber: expense.referenceNumber || "",
      title: expense.title || "",
      category: expense.category || "General",
      amount: expense.amount ?? "",
      paymentMethod: expense.paymentMethod || "cash",
      date: expense.date ? new Date(expense.date).toISOString().slice(0, 10) : "",
      description: expense.description || "",
      status: expense.status || "approved"
    });
    setShowForm(true);
  }

  async function saveExpense(event) {
    event.preventDefault();
    if (!form.title.trim()) return toast.error("Expense title is required");
    if (Number(form.amount) <= 0) return toast.error("Amount must be greater than zero");

    setSaving(true);
    try {
      const payload = { ...form, amount: Number(form.amount) };
      if (editingId) {
        await api.put(`/expenses/${editingId}`, payload);
        toast.success("Expense updated");
      } else {
        await api.post("/expenses", payload);
        toast.success("Expense recorded");
      }
      setShowForm(false);
      await loadExpenses();
      window.dispatchEvent(new Event("dashboard-updated"));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save expense");
    } finally {
      setSaving(false);
    }
  }

  async function deleteExpense() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await api.delete(`/expenses/${deleteTarget._id}`);
      toast.success("Expense deleted");
      setDeleteTarget(null);
      await loadExpenses();
      window.dispatchEvent(new Event("dashboard-updated"));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete expense");
    } finally {
      setSaving(false);
    }
  }

  function exportCSV() {
    const rows = [
      ["Reference", "Title", "Category", "Date", "Payment Method", "Amount", "Status", "Description"],
      ...filtered.map((expense) => [
        expense.referenceNumber,
        expense.title,
        expense.category,
        new Date(expense.date).toLocaleDateString(),
        expense.paymentMethod,
        expense.amount,
        expense.status,
        expense.description
      ])
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `expenses-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <section className="rounded-[2rem] bg-gradient-to-br from-[#071B34] via-[#0B5D7A] to-[#0E7490] p-6 text-white shadow-xl md:p-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-200">Operating Costs</p>
              <h1 className="mt-2 text-3xl font-black md:text-4xl">Expense Management</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-cyan-50/80">Track business spending with payment channels, references, approvals, and a complete audit trail.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={exportCSV} className="flex items-center gap-2 rounded-2xl bg-white/15 px-5 py-3 font-black hover:bg-white/25"><ArrowDownToLine size={18} /> Export CSV</button>
              <button onClick={openCreate} className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3 font-black text-[#071B34] hover:bg-cyan-50"><Plus size={18} /> Add Expense</button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat title="Approved Expenses" value={money(summary.total)} icon={ReceiptText} />
          <Stat title="Cash Spending" value={money(summary.cash)} icon={Banknote} />
          <Stat title="Bank / Mobile" value={money(summary.digital)} icon={CreditCard} />
          <Stat title="Pending Approval" value={summary.pending} icon={Wallet} />
        </section>

        <section className="grid gap-3 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search expense, reference, category..." className="input-class pl-12" />
          </div>
          <select value={filterMethod} onChange={(event) => setFilterMethod(event.target.value)} className="input-class">
            <option value="">All payment methods</option>
            <option value="cash">Cash</option>
            <option value="mobile_money">Mobile money</option>
            <option value="bank">Bank</option>
            <option value="credit">Credit</option>
          </select>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-800">
                <tr>{["Reference", "Expense", "Category", "Date", "Method", "Amount", "Status", "Actions"].map((head) => <th key={head} className="px-5 py-4 font-black">{head}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((expense) => (
                  <tr key={expense._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60">
                    <td className="px-5 py-4 text-xs font-black text-cyan-700">{expense.referenceNumber}</td>
                    <td className="px-5 py-4"><p className="font-black text-slate-900 dark:text-white">{expense.title}</p><p className="mt-1 max-w-xs truncate text-xs text-slate-500">{expense.description || "No description"}</p></td>
                    <td className="px-5 py-4">{expense.category}</td>
                    <td className="px-5 py-4"><span className="flex items-center gap-2"><CalendarDays size={15} />{new Date(expense.date).toLocaleDateString()}</span></td>
                    <td className="px-5 py-4 capitalize">{expense.paymentMethod?.replace("_", " ")}</td>
                    <td className="px-5 py-4 font-black">{money(expense.amount)}</td>
                    <td className="px-5 py-4"><Status status={expense.status} /></td>
                    <td className="px-5 py-4"><div className="flex gap-2"><button onClick={() => openEdit(expense)} className="action-edit" title="Edit"><Pencil size={16} /></button><button onClick={() => setDeleteTarget(expense)} className="action-delete" title="Delete"><Trash2 size={16} /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(loading || filtered.length === 0) && <div className="p-12 text-center text-slate-500"><ReceiptText className="mx-auto mb-3 text-slate-300" size={42} /><p className="font-bold">{loading ? "Loading expenses..." : "No expenses found"}</p></div>}
        </section>
      </div>

      {showForm && (
        <Modal title={editingId ? "Update Expense" : "Add Expense"} subtitle="Record clear, auditable business spending." onClose={() => setShowForm(false)}>
          <form onSubmit={saveExpense} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Expense title"><input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="input-class" /></Field>
              <Field label="Reference (optional)"><input value={form.referenceNumber} onChange={(event) => setForm({ ...form, referenceNumber: event.target.value })} className="input-class" placeholder="Auto-generated when empty" /></Field>
              <Field label="Category"><input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="input-class" /></Field>
              <Field label="Amount"><input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} className="input-class" /></Field>
              <Field label="Payment method"><select value={form.paymentMethod} onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })} className="input-class"><option value="cash">Cash</option><option value="mobile_money">Mobile money</option><option value="bank">Bank</option><option value="credit">Credit</option></select></Field>
              <Field label="Expense date"><input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="input-class" /></Field>
              <Field label="Approval status"><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="input-class"><option value="approved">Approved</option><option value="pending">Pending</option><option value="rejected">Rejected</option></select></Field>
            </div>
            <Field label="Description"><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="input-class min-h-28" /></Field>
            <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button><button disabled={saving} className="btn-primary">{saving ? "Saving..." : editingId ? "Update Expense" : "Save Expense"}</button></div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Delete Expense" subtitle={`${deleteTarget.referenceNumber} • ${deleteTarget.title}`} onClose={() => setDeleteTarget(null)}>
          <p className="rounded-2xl bg-rose-50 p-4 text-sm leading-6 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">The expense will be soft-deleted and retained in the audit log.</p>
          <div className="mt-5 flex justify-end gap-3"><button onClick={() => setDeleteTarget(null)} className="btn-secondary">Cancel</button><button disabled={saving} onClick={deleteExpense} className="rounded-2xl bg-rose-600 px-5 py-3 font-black text-white hover:bg-rose-700">Delete Expense</button></div>
        </Modal>
      )}
    </DashboardLayout>
  );
}

function Stat({ title, value, icon: Icon }) { return <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between"><div><p className="text-sm font-bold text-slate-500">{title}</p><p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{value}</p></div><div className="rounded-2xl bg-amber-100 p-3 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"><Icon size={22} /></div></div></div>; }
function Status({ status }) { const styles = { approved: "bg-emerald-100 text-emerald-700", pending: "bg-amber-100 text-amber-700", rejected: "bg-rose-100 text-rose-700" }; return <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${styles[status] || styles.pending}`}>{status}</span>; }
function Field({ label, children }) { return <label className="block"><span className="mb-2 block text-sm font-black text-slate-600 dark:text-slate-300">{label}</span>{children}</label>; }
function Modal({ title, subtitle, children, onClose }) { return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"><div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl dark:bg-slate-900 md:p-8"><div className="mb-6 flex items-start justify-between"><div><h2 className="text-2xl font-black">{title}</h2><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div><button onClick={onClose} className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-rose-100 hover:text-rose-600 dark:bg-slate-800"><X size={20} /></button></div>{children}</div></div>; }
