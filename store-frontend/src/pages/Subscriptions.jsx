import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Ban, Crown, Package, Plus, RefreshCcw, Trash2, UserRound, Users, X } from "lucide-react";
import DashboardLayout from "../layouts/DashboardLayout";
import api from "../api/client";

const initialForm = {
  planName: "Basic",
  durationMonths: 1,
  paymentMethod: "cash",
  transactionReference: "",
  autoRenew: false,
  notes: ""
};

function UsageBar({ icon: Icon, title, used, max }) {
  const percentage = max ? Math.min(Math.round((Number(used || 0) / Number(max)) * 100), 100) : 0;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Icon className="text-indigo-600" size={20} /><span className="font-bold text-slate-700 dark:text-slate-200">{title}</span></div>
        <span className="text-sm font-black text-slate-500">{used || 0} / {max || 0}</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-indigo-600" style={{ width: `${percentage}%` }} /></div>
      <p className="mt-2 text-xs font-bold text-slate-400">{percentage}% used</p>
    </div>
  );
}

export default function Subscriptions() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);

  const active = overview?.activeSubscription;
  const usage = overview?.usage || {};
  const plans = overview?.plans || {};
  const history = overview?.history || [];

  const daysRemaining = useMemo(() => {
    if (!active?.endDate) return 0;
    return Math.max(Math.ceil((new Date(active.endDate) - new Date()) / 86400000), 0);
  }, [active]);

  async function loadOverview() {
    try {
      setLoading(true);
      const response = await api.get("/subscriptions/overview");
      setOverview(response.data?.data || null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load subscription information");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOverview();
  }, []);

  async function createSubscription(event) {
    event.preventDefault();
    try {
      setSaving(true);
      await api.post("/subscriptions", { ...form, durationMonths: Number(form.durationMonths || 1) });
      toast.success("Subscription activated");
      setShowForm(false);
      setForm(initialForm);
      await loadOverview();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create subscription");
    } finally {
      setSaving(false);
    }
  }

  async function performAction(action, id, message) {
    try {
      await api.put(`/subscriptions/${id}/${action}`);
      toast.success(message);
      await loadOverview();
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to ${action} subscription`);
    }
  }

  async function deleteSubscription(id) {
    if (!window.confirm("Delete this subscription history record?")) return;
    try {
      await api.delete(`/subscriptions/${id}`);
      toast.success("Subscription record deleted");
      await loadOverview();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete subscription");
    }
  }

  if (loading) {
    return <DashboardLayout><div className="flex min-h-[65vh] items-center justify-center text-slate-500">Loading subscription...</div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-7">
        <section className="rounded-[2rem] bg-gradient-to-r from-[#071B34] via-[#0E7490] to-[#4F46E5] p-7 text-white shadow-2xl">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div className="flex items-center gap-4"><div className="rounded-2xl bg-white/15 p-4"><Crown size={30} /></div><div><h1 className="text-3xl font-black">Subscription & Usage</h1><p className="mt-1 text-white/75">Manage plan limits, renewal, and billing history.</p></div></div>
            <button type="button" onClick={() => setShowForm(true)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-black text-indigo-700"><Plus size={18} /> Change Plan</button>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-[2rem] border border-slate-100 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><p className="text-sm font-bold uppercase tracking-wider text-indigo-600">Current plan</p><h2 className="mt-2 text-4xl font-black text-slate-900 dark:text-white">{active?.planName || "Free"}</h2><p className="mt-2 text-slate-500">{daysRemaining} days remaining</p></div>
              <span className={`rounded-full px-4 py-2 text-xs font-black uppercase ${active?.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{active?.status || "active"}</span>
            </div>
            <div className="mt-7 grid gap-4 sm:grid-cols-3"><div><p className="text-xs font-bold text-slate-400">START DATE</p><p className="mt-1 font-black dark:text-white">{active?.startDate ? new Date(active.startDate).toLocaleDateString() : "-"}</p></div><div><p className="text-xs font-bold text-slate-400">END DATE</p><p className="mt-1 font-black dark:text-white">{active?.endDate ? new Date(active.endDate).toLocaleDateString() : "-"}</p></div><div><p className="text-xs font-bold text-slate-400">PRICE</p><p className="mt-1 font-black dark:text-white">${Number(active?.price || 0).toLocaleString()}</p></div></div>
            {active && <div className="mt-7 flex flex-wrap gap-3"><button type="button" onClick={() => performAction("renew", active._id, "Subscription renewed")} className="btn-primary"><RefreshCcw size={17} /> Renew</button><button type="button" onClick={() => performAction("cancel", active._id, "Subscription cancelled")} className="btn-secondary"><Ban size={17} /> Cancel</button></div>}
          </div>
          <div className="rounded-[2rem] border border-slate-100 bg-slate-950 p-7 text-white shadow-sm dark:border-slate-800"><h3 className="text-xl font-black">Available Plans</h3><div className="mt-5 space-y-3">{Object.entries(plans).map(([name, plan]) => <div key={name} className="flex items-center justify-between rounded-2xl bg-white/10 p-4"><div><p className="font-black">{name}</p><p className="text-xs text-slate-400">Up to {plan.maxProducts} products</p></div><span className="font-black">${plan.price}/mo</span></div>)}</div></div>
        </section>

        <section className="grid gap-5 md:grid-cols-3"><UsageBar icon={Package} title="Products Used" used={usage.productsUsed} max={active?.maxProducts} /><UsageBar icon={Users} title="Customers Used" used={usage.customersUsed} max={active?.maxCustomers} /><UsageBar icon={UserRound} title="Staff Used" used={usage.staffUsed} max={active?.maxStaff} /></section>

        <section className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="border-b border-slate-100 p-6 dark:border-slate-800"><h2 className="text-xl font-black text-slate-900 dark:text-white">Subscription History</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800"><tr><th className="p-4">Plan</th><th className="p-4">Period</th><th className="p-4">Price</th><th className="p-4">Status</th><th className="p-4 text-right">Action</th></tr></thead><tbody>{history.map((item) => <tr key={item._id} className="border-t border-slate-100 dark:border-slate-800"><td className="p-4 font-black dark:text-white">{item.planName}</td><td className="p-4 text-slate-500">{new Date(item.startDate).toLocaleDateString()} – {new Date(item.endDate).toLocaleDateString()}</td><td className="p-4 font-bold dark:text-white">${Number(item.price || 0).toLocaleString()}</td><td className="p-4"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase text-slate-600">{item.status}</span></td><td className="p-4 text-right"><button type="button" onClick={() => deleteSubscription(item._id)} className="rounded-xl bg-red-50 p-2 text-red-600"><Trash2 size={16} /></button></td></tr>)}{history.length === 0 && <tr><td colSpan="5" className="p-10 text-center text-slate-500">No subscription history.</td></tr>}</tbody></table></div></section>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <form onSubmit={createSubscription} className="w-full max-w-xl rounded-[2rem] bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between"><div><h2 className="text-2xl font-black text-slate-900 dark:text-white">Activate Plan</h2><p className="text-sm text-slate-500">Select plan and payment details.</p></div><button type="button" onClick={() => setShowForm(false)} className="rounded-xl bg-slate-100 p-2 text-slate-500"><X size={20} /></button></div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold text-slate-600">Plan<select value={form.planName} onChange={(event) => setForm({ ...form, planName: event.target.value })} className="input-class mt-2">{Object.keys(plans).filter((name) => name !== "Free").map((name) => <option key={name}>{name}</option>)}</select></label><label className="text-sm font-bold text-slate-600">Duration (months)<input type="number" min="1" max="36" value={form.durationMonths} onChange={(event) => setForm({ ...form, durationMonths: event.target.value })} className="input-class mt-2" /></label><label className="text-sm font-bold text-slate-600">Payment method<select value={form.paymentMethod} onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })} className="input-class mt-2"><option value="cash">Cash</option><option value="mobile_money">Mobile Money</option><option value="bank">Bank</option></select></label><label className="text-sm font-bold text-slate-600">Transaction reference<input value={form.transactionReference} onChange={(event) => setForm({ ...form, transactionReference: event.target.value })} className="input-class mt-2" /></label></div>
            <label className="mt-4 block text-sm font-bold text-slate-600">Notes<textarea rows="3" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="input-class mt-2" /></label>
            <label className="mt-4 flex items-center gap-3 text-sm font-bold text-slate-600"><input type="checkbox" checked={form.autoRenew} onChange={(event) => setForm({ ...form, autoRenew: event.target.checked })} /> Auto renew</label>
            <button disabled={saving} className="btn-primary mt-6 w-full justify-center">{saving ? "Saving..." : "Activate Subscription"}</button>
          </form>
        </div>
      )}
    </DashboardLayout>
  );
}
