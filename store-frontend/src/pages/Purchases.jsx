import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowDownToLine,
  CheckCircle2,
  CreditCard,
  PackagePlus,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Truck,
  X
} from "lucide-react";
import DashboardLayout from "../layouts/DashboardLayout";
import api from "../api/client";

const emptyItem = { product: "", quantity: 1, buyingPrice: "" };
const emptyPurchase = {
  supplier: "",
  invoiceNumber: "",
  paidAmount: "",
  paymentMethod: "cash",
  items: [{ ...emptyItem }]
};

function getCurrency() {
  try {
    const settings = JSON.parse(localStorage.getItem("store_settings") || "{}");
    return settings.currency || localStorage.getItem("app_currency") || "USD";
  } catch {
    return "USD";
  }
}

function unwrapList(response, key) {
  const data = response?.data?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  return [];
}

function StatusBadge({ status }) {
  const returned = status === "returned";
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${
        returned
          ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
      }`}
    >
      {status || "completed"}
    </span>
  );
}

function PaymentBadge({ status }) {
  const styles = {
    paid: "bg-emerald-100 text-emerald-700",
    partial: "bg-amber-100 text-amber-700",
    unpaid: "bg-rose-100 text-rose-700"
  };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${styles[status] || styles.unpaid}`}>
      {status || "unpaid"}
    </span>
  );
}

export default function Purchases() {
  const currency = getCurrency();
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyPurchase);
  const [paymentPurchase, setPaymentPurchase] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [reverseDialog, setReverseDialog] = useState(null);
  const [reverseReason, setReverseReason] = useState("");

  const money = (value) => `${currency} ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  const subtotal = useMemo(
    () =>
      form.items.reduce(
        (sum, item) => sum + Number(item.quantity || 0) * Number(item.buyingPrice || 0),
        0
      ),
    [form.items]
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return purchases;
    return purchases.filter((purchase) =>
      `${purchase.invoiceNumber || ""} ${purchase.supplierName || purchase.supplier?.name || ""} ${purchase.status || ""} ${purchase.paymentStatus || ""}`
        .toLowerCase()
        .includes(needle)
    );
  }, [purchases, search]);

  const summary = useMemo(
    () => ({
      total: purchases
        .filter((item) => item.status === "completed")
        .reduce((sum, item) => sum + Number(item.subtotal || 0), 0),
      balance: purchases
        .filter((item) => item.status === "completed")
        .reduce((sum, item) => sum + Number(item.balance || 0), 0),
      completed: purchases.filter((item) => item.status === "completed").length,
      returned: purchases.filter((item) => item.status === "returned").length
    }),
    [purchases]
  );

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [purchaseRes, supplierRes, productRes] = await Promise.all([
        api.get("/purchases", { params: { limit: 200 } }),
        api.get("/suppliers"),
        api.get("/products", { params: { limit: 500, status: "active" } })
      ]);
      setPurchases(unwrapList(purchaseRes, "purchases"));
      setSuppliers(unwrapList(supplierRes, "suppliers"));
      setProducts(unwrapList(productRes, "products"));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load purchases");
    } finally {
      setLoading(false);
    }
  }

  function resetCreate() {
    setForm({ ...emptyPurchase, items: [{ ...emptyItem }] });
    setShowCreate(false);
  }

  function updateItem(index, field, value) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => {
        if (index !== itemIndex) return item;
        if (field !== "product") return { ...item, [field]: value };
        const product = products.find((entry) => entry._id === value);
        return {
          ...item,
          product: value,
          buyingPrice: product ? Number(product.buyingPrice || 0) : ""
        };
      })
    }));
  }

  function addItem() {
    setForm((current) => ({ ...current, items: [...current.items, { ...emptyItem }] }));
  }

  function removeItem(index) {
    setForm((current) => ({
      ...current,
      items: current.items.length === 1
        ? current.items
        : current.items.filter((_, itemIndex) => itemIndex !== index)
    }));
  }

  async function createPurchase(event) {
    event.preventDefault();
    if (!form.supplier) return toast.error("Select a supplier");
    if (form.items.some((item) => !item.product || Number(item.quantity) <= 0 || Number(item.buyingPrice) < 0)) {
      return toast.error("Complete every purchase item correctly");
    }
    if (Number(form.paidAmount || 0) > subtotal) {
      return toast.error("Paid amount cannot exceed the subtotal");
    }

    setSaving(true);
    try {
      await api.post("/purchases", {
        supplier: form.supplier,
        invoiceNumber: form.invoiceNumber || undefined,
        paidAmount: Number(form.paidAmount || 0),
        paymentMethod: form.paymentMethod,
        items: form.items.map((item) => ({
          product: item.product,
          quantity: Number(item.quantity),
          buyingPrice: Number(item.buyingPrice)
        }))
      });
      toast.success("Purchase recorded and stock increased");
      resetCreate();
      await loadAll();
      window.dispatchEvent(new Event("dashboard-updated"));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create purchase");
    } finally {
      setSaving(false);
    }
  }

  function openPayment(purchase) {
    setPaymentPurchase(purchase);
    setPaymentAmount(String(purchase.paidAmount || 0));
  }

  async function updatePayment(event) {
    event.preventDefault();
    const paid = Number(paymentAmount);
    if (!Number.isFinite(paid) || paid < 0 || paid > Number(paymentPurchase.subtotal || 0)) {
      return toast.error("Enter a valid paid amount");
    }
    setSaving(true);
    try {
      await api.put(`/purchases/${paymentPurchase._id}`, { paidAmount: paid });
      toast.success("Purchase payment updated");
      setPaymentPurchase(null);
      await loadAll();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update payment");
    } finally {
      setSaving(false);
    }
  }

  async function reversePurchase() {
    if (!reverseDialog) return;
    setSaving(true);
    try {
      if (reverseDialog.action === "return") {
        await api.post(`/purchases/${reverseDialog.purchase._id}/return`, {
          reason: reverseReason || "Purchase returned"
        });
        toast.success("Purchase returned and stock reversed");
      } else {
        await api.delete(`/purchases/${reverseDialog.purchase._id}`, {
          data: { reason: reverseReason || "Purchase archived" }
        });
        toast.success("Purchase reversed and archived");
      }
      setReverseDialog(null);
      setReverseReason("");
      await loadAll();
      window.dispatchEvent(new Event("dashboard-updated"));
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not reverse purchase");
    } finally {
      setSaving(false);
    }
  }

  function exportCSV() {
    const rows = [
      ["Invoice", "Supplier", "Date", "Subtotal", "Paid", "Balance", "Payment Status", "Status"],
      ...filtered.map((item) => [
        item.invoiceNumber,
        item.supplierName || item.supplier?.name,
        new Date(item.createdAt).toLocaleDateString(),
        item.subtotal,
        item.paidAmount,
        item.balance,
        item.paymentStatus,
        item.status
      ])
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `purchases-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#071B34] via-[#0B5D7A] to-[#0E7490] p-6 text-white shadow-xl md:p-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-200">Inventory Intake</p>
              <h1 className="mt-2 text-3xl font-black md:text-4xl">Purchase Management</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-cyan-50/80">
                Record supplier invoices, increase stock automatically, manage outstanding balances, and safely reverse returned purchases.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={exportCSV} className="flex items-center gap-2 rounded-2xl bg-white/15 px-5 py-3 font-black hover:bg-white/25">
                <ArrowDownToLine size={18} /> Export CSV
              </button>
              <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3 font-black text-[#071B34] hover:bg-cyan-50">
                <Plus size={18} /> New Purchase
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat title="Purchase Value" value={money(summary.total)} icon={PackagePlus} />
          <Stat title="Supplier Balance" value={money(summary.balance)} icon={CreditCard} />
          <Stat title="Completed" value={summary.completed} icon={CheckCircle2} />
          <Stat title="Returned" value={summary.returned} icon={RotateCcw} />
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search invoice, supplier, status..." className="w-full rounded-2xl bg-slate-100 py-4 pl-12 pr-4 outline-none ring-cyan-600 focus:ring-2 dark:bg-slate-800" />
          </div>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="min-w-[1050px] w-full">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-800">
                <tr>
                  {['Invoice', 'Supplier', 'Date', 'Subtotal', 'Paid', 'Balance', 'Payment', 'Status', 'Actions'].map((head) => (
                    <th key={head} className="px-5 py-4 font-black">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((purchase) => (
                  <tr key={purchase._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60">
                    <td className="px-5 py-4 font-black text-slate-900 dark:text-white">{purchase.invoiceNumber}</td>
                    <td className="px-5 py-4">{purchase.supplierName || purchase.supplier?.name}</td>
                    <td className="px-5 py-4 text-slate-500">{new Date(purchase.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-4 font-bold">{money(purchase.subtotal)}</td>
                    <td className="px-5 py-4">{money(purchase.paidAmount)}</td>
                    <td className="px-5 py-4 font-bold text-rose-600">{money(purchase.balance)}</td>
                    <td className="px-5 py-4"><PaymentBadge status={purchase.paymentStatus} /></td>
                    <td className="px-5 py-4"><StatusBadge status={purchase.status} /></td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        {purchase.status === "completed" && (
                          <>
                            <ActionButton label="Payment" icon={Pencil} onClick={() => openPayment(purchase)} />
                            <ActionButton label="Return" icon={RotateCcw} onClick={() => setReverseDialog({ action: "return", purchase })} warning />
                            <ActionButton label="Archive" icon={Trash2} onClick={() => setReverseDialog({ action: "delete", purchase })} danger />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && filtered.length === 0 && <Empty text="No purchases found" />}
          {loading && <Empty text="Loading purchases..." />}
        </section>
      </div>

      {showCreate && (
        <Modal title="New Purchase" subtitle="Each completed purchase immediately increases product stock." onClose={resetCreate} wide>
          <form onSubmit={createPurchase} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Supplier">
                <select required value={form.supplier} onChange={(event) => setForm({ ...form, supplier: event.target.value })} className="input-class">
                  <option value="">Select supplier</option>
                  {suppliers.filter((item) => item.status !== "inactive").map((supplier) => <option key={supplier._id} value={supplier._id}>{supplier.name}</option>)}
                </select>
              </Field>
              <Field label="Supplier Invoice (optional)">
                <input value={form.invoiceNumber} onChange={(event) => setForm({ ...form, invoiceNumber: event.target.value })} className="input-class" placeholder="Auto-generated when empty" />
              </Field>
              <Field label="Paid Amount">
                <input type="number" min="0" step="0.01" value={form.paidAmount} onChange={(event) => setForm({ ...form, paidAmount: event.target.value })} className="input-class" placeholder="0.00" />
              </Field>
              <Field label="Payment Method">
                <select value={form.paymentMethod} onChange={(event) => setForm({ ...form, paymentMethod: event.target.value, paidAmount: event.target.value === "credit" ? "0" : form.paidAmount })} className="input-class">
                  <option value="cash">Cash</option>
                  <option value="mobile_money">Mobile money</option>
                  <option value="bank">Bank</option>
                  <option value="credit">Credit</option>
                </select>
              </Field>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-900 dark:text-white">Purchase Items</h3>
                <button type="button" onClick={addItem} className="rounded-xl bg-cyan-100 px-4 py-2 text-sm font-black text-cyan-800 hover:bg-cyan-200">+ Add item</button>
              </div>
              {form.items.map((item, index) => (
                <div key={index} className="grid gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700 md:grid-cols-[2fr_0.7fr_1fr_auto]">
                  <select required value={item.product} onChange={(event) => updateItem(index, "product", event.target.value)} className="input-class">
                    <option value="">Select product</option>
                    {products.map((product) => <option key={product._id} value={product._id}>{product.name} ({product.quantityInStock || 0} in stock)</option>)}
                  </select>
                  <input required type="number" min="1" step="1" value={item.quantity} onChange={(event) => updateItem(index, "quantity", event.target.value)} className="input-class" placeholder="Qty" />
                  <input required type="number" min="0" step="0.01" value={item.buyingPrice} onChange={(event) => updateItem(index, "buyingPrice", event.target.value)} className="input-class" placeholder="Buying price" />
                  <button type="button" onClick={() => removeItem(index)} className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 text-rose-700 hover:bg-rose-600 hover:text-white"><X size={18} /></button>
                </div>
              ))}
            </div>

            <div className="flex flex-col justify-between gap-4 rounded-2xl bg-slate-100 p-5 dark:bg-slate-800 sm:flex-row sm:items-center">
              <div><p className="text-sm text-slate-500">Purchase subtotal</p><p className="text-2xl font-black">{money(subtotal)}</p></div>
              <div className="flex gap-3"><button type="button" onClick={resetCreate} className="btn-secondary">Cancel</button><button disabled={saving} className="btn-primary">{saving ? "Saving..." : "Save Purchase"}</button></div>
            </div>
          </form>
        </Modal>
      )}

      {paymentPurchase && (
        <Modal title="Update Purchase Payment" subtitle={paymentPurchase.invoiceNumber} onClose={() => setPaymentPurchase(null)}>
          <form onSubmit={updatePayment} className="space-y-5">
            <div className="grid grid-cols-2 gap-4 rounded-2xl bg-slate-100 p-4 dark:bg-slate-800">
              <div><p className="text-xs uppercase text-slate-500">Subtotal</p><p className="font-black">{money(paymentPurchase.subtotal)}</p></div>
              <div><p className="text-xs uppercase text-slate-500">Current balance</p><p className="font-black text-rose-600">{money(paymentPurchase.balance)}</p></div>
            </div>
            <Field label="Total Paid Amount">
              <input autoFocus required type="number" min="0" max={paymentPurchase.subtotal} step="0.01" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} className="input-class" />
            </Field>
            <div className="flex justify-end gap-3"><button type="button" onClick={() => setPaymentPurchase(null)} className="btn-secondary">Cancel</button><button disabled={saving} className="btn-primary">Update Payment</button></div>
          </form>
        </Modal>
      )}

      {reverseDialog && (
        <Modal title={reverseDialog.action === "return" ? "Return Purchase" : "Reverse and Archive Purchase"} subtitle="Stock and supplier balances will be reversed. This action is audited." onClose={() => setReverseDialog(null)}>
          <div className="space-y-5">
            <Field label="Reason">
              <textarea value={reverseReason} onChange={(event) => setReverseReason(event.target.value)} className="input-class min-h-28" placeholder="Explain why this purchase is being reversed" />
            </Field>
            <div className="flex justify-end gap-3"><button onClick={() => setReverseDialog(null)} className="btn-secondary">Cancel</button><button disabled={saving} onClick={reversePurchase} className="rounded-2xl bg-rose-600 px-5 py-3 font-black text-white hover:bg-rose-700">Confirm Reversal</button></div>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}

function Stat({ title, value, icon: Icon }) {
  return <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between"><div><p className="text-sm font-bold text-slate-500">{title}</p><p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{value}</p></div><div className="rounded-2xl bg-cyan-100 p-3 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300"><Icon size={22} /></div></div></div>;
}
function ActionButton({ label, icon: Icon, onClick, danger, warning }) {
  const style = danger ? "bg-rose-100 text-rose-700 hover:bg-rose-600" : warning ? "bg-amber-100 text-amber-700 hover:bg-amber-600" : "bg-blue-100 text-blue-700 hover:bg-blue-600";
  return <button type="button" title={label} onClick={onClick} className={`flex h-10 w-10 items-center justify-center rounded-xl transition hover:text-white ${style}`}><Icon size={16} /></button>;
}
function Field({ label, children }) { return <label className="block"><span className="mb-2 block text-sm font-black text-slate-600 dark:text-slate-300">{label}</span>{children}</label>; }
function Modal({ title, subtitle, children, onClose, wide = false }) {
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"><div className={`max-h-[92vh] w-full overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl dark:bg-slate-900 md:p-8 ${wide ? "max-w-5xl" : "max-w-xl"}`}><div className="mb-6 flex items-start justify-between gap-4"><div><h2 className="text-2xl font-black text-slate-900 dark:text-white">{title}</h2>{subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}</div><button type="button" onClick={onClose} className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-rose-100 hover:text-rose-600 dark:bg-slate-800"><X size={20} /></button></div>{children}</div></div>;
}
function Empty({ text }) { return <div className="p-12 text-center text-slate-500"><Truck className="mx-auto mb-3 text-slate-300" size={42} /><p className="font-bold">{text}</p></div>; }
