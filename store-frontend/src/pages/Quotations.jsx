import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  FileCheck2,
  FilePlus2,
  Pencil,
  Plus,
  Printer,
  Search,
  Send,
  Trash2,
  X
} from "lucide-react";
import DashboardLayout from "../layouts/DashboardLayout";
import api from "../api/client";

const emptyItem = { product: "", quantity: 1, unitPrice: "" };
const emptyForm = {
  customer: "",
  customerName: "",
  customerPhone: "",
  discount: "0",
  tax: "0",
  validUntil: "",
  status: "draft",
  notes: "",
  items: [{ ...emptyItem }]
};

function listFrom(response, key) {
  const data = response?.data?.data;
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.[key]) ? data[key] : [];
}

function currencyCode() {
  try {
    return JSON.parse(localStorage.getItem("store_settings") || "{}").currency || "USD";
  } catch {
    return "USD";
  }
}

export default function Quotations() {
  const currency = currencyCode();
  const [quotations, setQuotations] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const money = (value) => `${currency} ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  const subtotal = useMemo(() => form.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0), [form.items]);
  const total = Math.max(subtotal - Number(form.discount || 0) + Number(form.tax || 0), 0);

  const filtered = useMemo(() => {
    const needle = search.toLowerCase().trim();
    if (!needle) return quotations;
    return quotations.filter((item) => `${item.quotationNumber} ${item.customerName} ${item.customerPhone} ${item.status}`.toLowerCase().includes(needle));
  }, [quotations, search]);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [quotationRes, productRes, customerRes] = await Promise.all([
        api.get("/quotations", { params: { limit: 200 } }),
        api.get("/products", { params: { limit: 500, status: "active" } }),
        api.get("/customers")
      ]);
      setQuotations(listFrom(quotationRes, "quotations"));
      setProducts(listFrom(productRes, "products"));
      setCustomers(listFrom(customerRes, "customers"));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load quotations");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setEditingId(null);
    setForm({ ...emptyForm, items: [{ ...emptyItem }] });
    setShowForm(false);
  }

  function openEdit(quotation) {
    setEditingId(quotation._id);
    setForm({
      customer: quotation.customer?._id || quotation.customer || "",
      customerName: quotation.customerName || "",
      customerPhone: quotation.customerPhone || "",
      discount: String(quotation.discount || 0),
      tax: String(quotation.tax || 0),
      validUntil: quotation.validUntil ? new Date(quotation.validUntil).toISOString().slice(0, 10) : "",
      status: quotation.status || "draft",
      notes: quotation.notes || "",
      items: quotation.items.map((item) => ({
        product: item.product?._id || item.product,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      }))
    });
    setShowForm(true);
  }

  function selectCustomer(value) {
    const customer = customers.find((entry) => entry._id === value);
    setForm((current) => ({
      ...current,
      customer: value,
      customerName: customer?.name || current.customerName,
      customerPhone: customer?.phone || current.customerPhone
    }));
  }

  function updateItem(index, field, value) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => {
        if (index !== itemIndex) return item;
        if (field !== "product") return { ...item, [field]: value };
        const product = products.find((entry) => entry._id === value);
        return { ...item, product: value, unitPrice: product ? Number(product.sellingPrice || 0) : "" };
      })
    }));
  }

  async function saveQuotation(event) {
    event.preventDefault();
    if (form.items.some((item) => !item.product || Number(item.quantity) <= 0 || Number(item.unitPrice) < 0)) return toast.error("Complete every quotation item");
    if (Number(form.discount) > subtotal) return toast.error("Discount cannot exceed subtotal");

    setSaving(true);
    try {
      const payload = {
        ...form,
        customer: form.customer || null,
        discount: Number(form.discount || 0),
        tax: Number(form.tax || 0),
        validUntil: form.validUntil || null,
        items: form.items.map((item) => ({ product: item.product, quantity: Number(item.quantity), unitPrice: Number(item.unitPrice) }))
      };
      if (editingId) {
        await api.put(`/quotations/${editingId}`, payload);
        toast.success("Quotation updated");
      } else {
        await api.post("/quotations", payload);
        toast.success("Quotation created");
      }
      resetForm();
      await loadAll();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save quotation");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(quotation, status) {
    try {
      await api.put(`/quotations/${quotation._id}`, {
        customer: quotation.customer?._id || quotation.customer || null,
        customerName: quotation.customerName,
        customerPhone: quotation.customerPhone,
        discount: quotation.discount,
        tax: quotation.tax,
        validUntil: quotation.validUntil,
        notes: quotation.notes,
        status,
        items: quotation.items.map((item) => ({ product: item.product?._id || item.product, quantity: item.quantity, unitPrice: item.unitPrice }))
      });
      toast.success(`Quotation marked ${status}`);
      await loadAll();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  }

  async function deleteQuotation() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await api.delete(`/quotations/${deleteTarget._id}`);
      toast.success("Quotation deleted");
      setDeleteTarget(null);
      await loadAll();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete quotation");
    } finally {
      setSaving(false);
    }
  }

  function printQuotation(quotation) {
    const popup = window.open("", "_blank", "width=900,height=800");
    if (!popup) return toast.error("Allow pop-ups to print quotations");
    popup.document.write(`<!doctype html><html><head><title>${quotation.quotationNumber}</title><style>body{font-family:Arial,sans-serif;padding:36px;color:#0f172a}h1{margin:0}.meta{display:flex;justify-content:space-between;margin:24px 0}table{width:100%;border-collapse:collapse}th,td{padding:12px;border-bottom:1px solid #ddd;text-align:left}.totals{margin-left:auto;width:320px;margin-top:24px}.totals div{display:flex;justify-content:space-between;padding:7px 0}.grand{font-size:20px;font-weight:800;border-top:2px solid #111}</style></head><body><h1>Quotation</h1><p>${quotation.quotationNumber}</p><div class="meta"><div><strong>Customer</strong><br>${quotation.customerName || "Walk-in Customer"}<br>${quotation.customerPhone || ""}</div><div><strong>Date</strong><br>${new Date(quotation.createdAt).toLocaleDateString()}<br><strong>Valid until</strong><br>${quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString() : "Not specified"}</div></div><table><thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${quotation.items.map((item) => `<tr><td>${item.productName}</td><td>${item.quantity}</td><td>${money(item.unitPrice)}</td><td>${money(item.total)}</td></tr>`).join("")}</tbody></table><div class="totals"><div><span>Subtotal</span><strong>${money(quotation.subtotal)}</strong></div><div><span>Discount</span><strong>${money(quotation.discount)}</strong></div><div><span>Tax</span><strong>${money(quotation.tax)}</strong></div><div class="grand"><span>Total</span><strong>${money(quotation.total)}</strong></div></div><p><strong>Notes:</strong> ${quotation.notes || "-"}</p></body></html>`);
    popup.document.close();
    popup.focus();
    popup.print();
  }

  const stats = {
    total: quotations.length,
    draft: quotations.filter((item) => item.status === "draft").length,
    accepted: quotations.filter((item) => item.status === "accepted").length,
    value: quotations.filter((item) => !["rejected", "expired"].includes(item.status)).reduce((sum, item) => sum + Number(item.total || 0), 0)
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <section className="rounded-[2rem] bg-gradient-to-br from-[#071B34] via-[#0B5D7A] to-[#0E7490] p-6 text-white shadow-xl md:p-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center"><div><p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-200">Pre-sale Documents</p><h1 className="mt-2 text-3xl font-black md:text-4xl">Quotations</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-cyan-50/80">Prepare professional quotations without reducing stock, then track whether each offer is sent, accepted, rejected, or expired.</p></div><button onClick={() => setShowForm(true)} className="flex items-center gap-2 self-start rounded-2xl bg-white px-5 py-3 font-black text-[#071B34]"><Plus size={18} /> New Quotation</button></div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat title="All Quotations" value={stats.total} icon={FilePlus2} /><Stat title="Draft" value={stats.draft} icon={Pencil} /><Stat title="Accepted" value={stats.accepted} icon={FileCheck2} /><Stat title="Active Value" value={money(stats.value)} icon={Send} /></section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="relative max-w-xl"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} className="input-class pl-12" placeholder="Search quotation or customer..." /></div></section>

        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="overflow-x-auto"><table className="w-full min-w-[1050px]"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-800"><tr>{["Quotation", "Customer", "Created", "Valid Until", "Total", "Status", "Actions"].map((head) => <th key={head} className="px-5 py-4 font-black">{head}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{filtered.map((quotation) => <tr key={quotation._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60"><td className="px-5 py-4 font-black text-cyan-700">{quotation.quotationNumber}</td><td className="px-5 py-4"><p className="font-black">{quotation.customerName}</p><p className="text-xs text-slate-500">{quotation.customerPhone || "No phone"}</p></td><td className="px-5 py-4">{new Date(quotation.createdAt).toLocaleDateString()}</td><td className="px-5 py-4">{quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString() : "—"}</td><td className="px-5 py-4 font-black">{money(quotation.total)}</td><td className="px-5 py-4"><Status status={quotation.status} /></td><td className="px-5 py-4"><div className="flex gap-2"><button title="Print" onClick={() => printQuotation(quotation)} className="action-neutral"><Printer size={16} /></button><button title="Edit" onClick={() => openEdit(quotation)} className="action-edit"><Pencil size={16} /></button>{quotation.status === "draft" && <button title="Mark sent" onClick={() => updateStatus(quotation, "sent")} className="action-neutral"><Send size={16} /></button>}<button title="Delete" onClick={() => setDeleteTarget(quotation)} className="action-delete"><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div>{(loading || filtered.length === 0) && <div className="p-12 text-center text-slate-500"><FilePlus2 className="mx-auto mb-3 text-slate-300" size={42} /><p className="font-bold">{loading ? "Loading quotations..." : "No quotations found"}</p></div>}</section>
      </div>

      {showForm && <Modal title={editingId ? "Update Quotation" : "New Quotation"} onClose={resetForm}><form onSubmit={saveQuotation} className="space-y-5"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Field label="Existing customer"><select value={form.customer} onChange={(event) => selectCustomer(event.target.value)} className="input-class"><option value="">Walk-in / manual</option>{customers.map((customer) => <option key={customer._id} value={customer._id}>{customer.name}</option>)}</select></Field><Field label="Customer name"><input value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })} className="input-class" /></Field><Field label="Customer phone"><input value={form.customerPhone} onChange={(event) => setForm({ ...form, customerPhone: event.target.value })} className="input-class" /></Field><Field label="Valid until"><input type="date" value={form.validUntil} onChange={(event) => setForm({ ...form, validUntil: event.target.value })} className="input-class" /></Field></div><div className="space-y-3"><div className="flex items-center justify-between"><h3 className="font-black">Items</h3><button type="button" onClick={() => setForm((current) => ({ ...current, items: [...current.items, { ...emptyItem }] }))} className="rounded-xl bg-cyan-100 px-4 py-2 text-sm font-black text-cyan-800">+ Add item</button></div>{form.items.map((item, index) => <div key={index} className="grid gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700 md:grid-cols-[2fr_0.7fr_1fr_auto]"><select required value={item.product} onChange={(event) => updateItem(index, "product", event.target.value)} className="input-class"><option value="">Select product</option>{products.map((product) => <option key={product._id} value={product._id}>{product.name}</option>)}</select><input required type="number" min="1" value={item.quantity} onChange={(event) => updateItem(index, "quantity", event.target.value)} className="input-class" /><input required type="number" min="0" step="0.01" value={item.unitPrice} onChange={(event) => updateItem(index, "unitPrice", event.target.value)} className="input-class" /><button type="button" onClick={() => setForm((current) => ({ ...current, items: current.items.length === 1 ? current.items : current.items.filter((_, itemIndex) => itemIndex !== index) }))} className="action-delete"><X size={16} /></button></div>)}</div><div className="grid gap-4 md:grid-cols-3"><Field label="Discount"><input type="number" min="0" step="0.01" value={form.discount} onChange={(event) => setForm({ ...form, discount: event.target.value })} className="input-class" /></Field><Field label="Tax amount"><input type="number" min="0" step="0.01" value={form.tax} onChange={(event) => setForm({ ...form, tax: event.target.value })} className="input-class" /></Field><Field label="Status"><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="input-class"><option value="draft">Draft</option><option value="sent">Sent</option><option value="accepted">Accepted</option><option value="rejected">Rejected</option><option value="expired">Expired</option></select></Field></div><Field label="Notes"><textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="input-class min-h-24" /></Field><div className="flex flex-col justify-between gap-4 rounded-2xl bg-slate-100 p-5 dark:bg-slate-800 sm:flex-row sm:items-center"><div><p className="text-sm text-slate-500">Quotation total</p><p className="text-2xl font-black">{money(total)}</p></div><div className="flex gap-3"><button type="button" onClick={resetForm} className="btn-secondary">Cancel</button><button disabled={saving} className="btn-primary">{saving ? "Saving..." : "Save Quotation"}</button></div></div></form></Modal>}

      {deleteTarget && <Modal title="Delete Quotation" onClose={() => setDeleteTarget(null)}><p className="rounded-2xl bg-rose-50 p-4 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">Delete {deleteTarget.quotationNumber}? The record will remain available in audit logs.</p><div className="mt-5 flex justify-end gap-3"><button onClick={() => setDeleteTarget(null)} className="btn-secondary">Cancel</button><button disabled={saving} onClick={deleteQuotation} className="rounded-2xl bg-rose-600 px-5 py-3 font-black text-white">Delete</button></div></Modal>}
    </DashboardLayout>
  );
}

function Stat({ title, value, icon: Icon }) { return <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between"><div><p className="text-sm font-bold text-slate-500">{title}</p><p className="mt-2 text-2xl font-black">{value}</p></div><div className="rounded-2xl bg-cyan-100 p-3 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300"><Icon size={22} /></div></div></div>; }
function Status({ status }) { const styles = { draft: "bg-slate-100 text-slate-700", sent: "bg-blue-100 text-blue-700", accepted: "bg-emerald-100 text-emerald-700", rejected: "bg-rose-100 text-rose-700", expired: "bg-amber-100 text-amber-700", converted: "bg-violet-100 text-violet-700" }; return <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${styles[status] || styles.draft}`}>{status}</span>; }
function Field({ label, children }) { return <label className="block"><span className="mb-2 block text-sm font-black text-slate-600 dark:text-slate-300">{label}</span>{children}</label>; }
function Modal({ title, children, onClose }) { return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"><div className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl dark:bg-slate-900 md:p-8"><div className="mb-6 flex items-center justify-between"><h2 className="text-2xl font-black">{title}</h2><button onClick={onClose} className="rounded-xl bg-slate-100 p-2 dark:bg-slate-800"><X size={20} /></button></div>{children}</div></div>; }
