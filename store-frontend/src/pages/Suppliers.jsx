import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Wallet,
  X
} from "lucide-react";
import DashboardLayout from "../layouts/DashboardLayout";
import api from "../api/client";

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  address: "",
  openingBalance: 0
};

function getAppSettings() {
  const saved = JSON.parse(localStorage.getItem("store_settings") || "{}");

  return {
    currency: saved.currency || localStorage.getItem("app_currency") || "USD"
  };
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [appSettings, setAppSettings] = useState(getAppSettings);

  const currency = appSettings.currency;

  useEffect(() => {
    loadSuppliers();

    function handleSettingsUpdated() {
      setAppSettings(getAppSettings());
    }

    window.addEventListener("settings-updated", handleSettingsUpdated);

    return () => {
      window.removeEventListener("settings-updated", handleSettingsUpdated);
    };
  }, []);

  function money(value) {
    return `${currency} ${Number(value || 0).toLocaleString()}`;
  }

  async function loadSuppliers() {
    try {
      const res = await api.get("/suppliers");
      const data = res.data?.data?.suppliers || res.data?.data || res.data?.suppliers || [];
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (error) {
      setSuppliers([]);
      toast.error(error.response?.data?.message || "Failed to load suppliers");
    }
  }

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => {
      const text = `${supplier.name || ""} ${supplier.phone || ""} ${
        supplier.email || ""
      }`.toLowerCase();

      return text.includes(search.toLowerCase());
    });
  }, [suppliers, search]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(supplier) {
    setEditingId(supplier._id || supplier.id);

    setForm({
      name: supplier.name || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      openingBalance: supplier.openingBalance || 0
    });

    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function saveSupplier(e) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      ...form,
      openingBalance: Number(form.openingBalance || 0),
      currentBalance: Number(form.openingBalance || 0)
    };

    try {
      if (editingId) {
        await api.put(`/suppliers/${editingId}`, payload);
        toast.success("Supplier updated successfully");
      } else {
        await api.post("/suppliers", payload);
        toast.success("Supplier created successfully");
      }

      closeModal();
      await loadSuppliers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save supplier");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSupplier(id) {
    if (!confirm("Delete this supplier?")) return;

    try {
      await api.delete(`/suppliers/${id}`);
      toast.success("Supplier deleted successfully");
      await loadSuppliers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete supplier");
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">
              Suppliers
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Manage suppliers, payables, and supplier statements
            </p>
          </div>

          <button
            onClick={openCreate}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl font-bold shadow-lg"
          >
            <Plus size={18} />
            Add Supplier
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="relative max-w-xl">
            <Search size={18} className="absolute left-4 top-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search suppliers..."
              className="w-full bg-slate-100 dark:bg-slate-800 dark:text-white rounded-2xl pl-12 pr-4 py-4 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {filteredSuppliers.map((supplier) => (
            <div
              key={supplier._id || supplier.id}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-xl transition"
            >
              <div className="flex items-start justify-between gap-4">
                <Link
                  to={`/suppliers/${supplier._id || supplier.id}`}
                  className="flex items-center gap-4"
                >
                  <div className="w-16 h-16 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-2xl font-black">
                    {supplier.name?.charAt(0)?.toUpperCase() || "S"}
                  </div>

                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">
                      {supplier.name}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Supplier Account
                    </p>
                  </div>
                </Link>

                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(supplier)}
                    className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center"
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    onClick={() => deleteSupplier(supplier._id || supplier.id)}
                    className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <Info icon={Phone} value={supplier.phone || "No phone"} />
                <Info icon={Mail} value={supplier.email || "No email"} />
                <Info icon={MapPin} value={supplier.address || "No address"} />
              </div>

              <div className="mt-6 bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wallet className="text-purple-600" size={22} />
                  <span className="font-bold text-slate-600 dark:text-slate-300">
                    Payable
                  </span>
                </div>

                <strong
                  className={
                    Number(supplier.currentBalance || 0) > 0
                      ? "text-red-500 text-xl"
                      : "text-emerald-600 text-xl"
                  }
                >
                  {money(supplier.currentBalance)}
                </strong>
              </div>

              <Link
                to={`/suppliers/${supplier._id || supplier.id}`}
                className="mt-5 block text-center bg-slate-950 text-white py-3 rounded-2xl font-bold hover:bg-indigo-700 transition"
              >
                View Profile
              </Link>
            </div>
          ))}

          {filteredSuppliers.length === 0 && (
            <div className="xl:col-span-3 bg-white dark:bg-slate-900 rounded-3xl p-10 text-center text-slate-500">
              No suppliers found
            </div>
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <form
              onSubmit={saveSupplier}
              className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl p-6 md:p-8"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white">
                    {editingId ? "Update Supplier" : "Add Supplier"}
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">
                    {editingId
                      ? "Edit supplier information"
                      : "Create a new supplier account"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  className="text-slate-400 hover:text-red-500"
                >
                  <X size={26} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input
                  label="Supplier Name"
                  value={form.name}
                  onChange={(value) => setForm({ ...form, name: value })}
                />

                <Input
                  label="Phone"
                  required={false}
                  value={form.phone}
                  onChange={(value) => setForm({ ...form, phone: value })}
                />

                <Input
                  label="Email"
                  type="email"
                  required={false}
                  value={form.email}
                  onChange={(value) => setForm({ ...form, email: value })}
                />

                <Input
                  label="Opening Balance"
                  type="number"
                  required={false}
                  value={form.openingBalance}
                  onChange={(value) =>
                    setForm({ ...form, openingBalance: value })
                  }
                />

                <div className="md:col-span-2">
                  <Input
                    label="Address"
                    required={false}
                    value={form.address}
                    onChange={(value) => setForm({ ...form, address: value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 dark:text-white font-bold"
                >
                  Cancel
                </button>

                <button
                  disabled={saving}
                  className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Update Supplier"
                    : "Save Supplier"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function Info({ icon: Icon, value }) {
  return (
    <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
      <Icon size={17} />
      <span className="text-sm">{value}</span>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", required = true }) {
  return (
    <div>
      <label className="text-sm font-bold text-slate-600 dark:text-slate-300">
        {label}
      </label>
      <input
        required={required}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-2 px-4 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}