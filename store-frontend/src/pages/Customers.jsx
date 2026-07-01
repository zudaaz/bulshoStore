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
  X,
  Users,
  TrendingUp,
  BadgeDollarSign,
  UserRound,
  Eye
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

const translations = {
  English: {
    title: "Customers",
    subtitle: "Manage customers, balances, and credit accounts",
    addCustomer: "Add Customer",
    search: "Search customers...",
    customerAccount: "Customer Account",
    noPhone: "No phone",
    noEmail: "No email",
    noAddress: "No address",
    balance: "Balance",
    viewProfile: "View Profile",
    noCustomers: "No customers found",
    updateCustomer: "Update Customer",
    editInfo: "Edit customer information",
    createInfo: "Create a new customer account",
    customerName: "Customer Name",
    phone: "Phone",
    email: "Email",
    openingBalance: "Opening Balance",
    address: "Address",
    cancel: "Cancel",
    saving: "Saving...",
    saveCustomer: "Save Customer",
    totalCustomers: "Total Customers",
    activeCustomers: "Active Customers",
    totalBalance: "Customer Balance",
    topCustomers: "Top Customers"
  }
};

function getAppSettings() {
  const saved = JSON.parse(localStorage.getItem("store_settings") || "{}");

  return {
    currency:
      saved.currency ||
      localStorage.getItem("app_currency") ||
      "USD",

    language:
      saved.language ||
      localStorage.getItem("app_language") ||
      "English"
  };
}

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);

  const [appSettings, setAppSettings] =
    useState(getAppSettings);

  const currency = appSettings.currency;

  const t =
    translations[appSettings.language] ||
    translations.English;

  useEffect(() => {
    loadCustomers();

    function handleSettingsUpdated() {
      setAppSettings(getAppSettings());
    }

    window.addEventListener(
      "settings-updated",
      handleSettingsUpdated
    );

    return () => {
      window.removeEventListener(
        "settings-updated",
        handleSettingsUpdated
      );
    };
  }, []);

  function money(value) {
    return `${currency} ${Number(
      value || 0
    ).toLocaleString()}`;
  }

  async function loadCustomers() {
    try {
      setLoading(true);

      const res = await api.get("/customers");

      const data =
        res.data?.data?.customers ||
        res.data?.data ||
        res.data?.customers ||
        [];

      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          "Failed to load customers"
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const text = `
        ${customer.name || ""}
        ${customer.phone || ""}
        ${customer.email || ""}
      `.toLowerCase();

      return text.includes(search.toLowerCase());
    });
  }, [customers, search]);

  const totalBalance = customers.reduce(
    (sum, c) =>
      sum + Number(c.currentBalance || 0),
    0
  );

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(customer) {
    setEditingId(customer._id);

    setForm({
      name: customer.name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
      openingBalance:
        customer.openingBalance || 0
    });

    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function saveCustomer(e) {
    e.preventDefault();

    setSaving(true);

    try {
      const payload = {
        ...form,
        openingBalance: Number(
          form.openingBalance || 0
        ),
        currentBalance: Number(
          form.openingBalance || 0
        )
      };

      if (editingId) {
        await api.put(
          `/customers/${editingId}`,
          payload
        );

        toast.success(
          "Customer updated successfully"
        );
      } else {
        await api.post("/customers", payload);

        toast.success(
          "Customer created successfully"
        );
      }

      closeModal();

      await loadCustomers();
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          "Failed to save customer"
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteCustomer(id) {
    if (!confirm("Delete this customer?"))
      return;

    try {
      await api.delete(`/customers/${id}`);

      toast.success(
        "Customer deleted successfully"
      );

      await loadCustomers();
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          "Failed to delete customer"
      );
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="w-14 h-14 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-7">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#071B34] via-[#0E7490] to-[#4F46E5] p-7 text-white shadow-2xl">
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10 blur-3xl" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div>
              <h1 className="text-4xl font-black">
                {t.title}
              </h1>

              <p className="text-white/80 mt-2">
                {t.subtitle}
              </p>
            </div>

            <button
              onClick={openCreate}
              className="bg-white text-[#071B34] hover:bg-slate-100 px-6 py-4 rounded-2xl font-black flex items-center gap-2 shadow-xl"
            >
              <Plus size={18} />
              {t.addCustomer}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          <StatCard
            title={t.totalCustomers}
            value={customers.length}
            icon={Users}
            color="from-indigo-500 to-violet-600"
          />

          <StatCard
            title={t.activeCustomers}
            value={
              customers.filter(
                (c) =>
                  Number(c.currentBalance || 0) >=
                  0
              ).length
            }
            icon={UserRound}
            color="from-cyan-500 to-blue-600"
          />

          <StatCard
            title={t.totalBalance}
            value={money(totalBalance)}
            icon={Wallet}
            color="from-emerald-500 to-green-600"
          />

          <StatCard
            title={t.topCustomers}
            value={filteredCustomers.length}
            icon={TrendingUp}
            color="from-orange-500 to-amber-500"
          />
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="relative max-w-xl">
            <Search
              size={18}
              className="absolute left-4 top-4 text-slate-400"
            />

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder={t.search}
              className="w-full bg-slate-100 dark:bg-slate-800 dark:text-white rounded-2xl pl-12 pr-4 py-4 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {filteredCustomers.map((customer) => (
            <div
              key={customer._id}
              className="group bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-2xl transition-all duration-300"
            >
              <div className="flex items-start justify-between gap-4">
                <Link
                  to={`/customers/${customer._id}`}
                  className="flex items-center gap-4"
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center text-2xl font-black shadow-lg">
                    {customer.name
                      ?.charAt(0)
                      ?.toUpperCase() || "C"}
                  </div>

                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">
                      {customer.name}
                    </h2>

                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {t.customerAccount}
                    </p>
                  </div>
                </Link>

                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      openEdit(customer)
                    }
                    className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center hover:scale-105 transition"
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    onClick={() =>
                      deleteCustomer(customer._id)
                    }
                    className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center hover:scale-105 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <Info
                  icon={Phone}
                  value={
                    customer.phone ||
                    t.noPhone
                  }
                />

                <Info
                  icon={Mail}
                  value={
                    customer.email ||
                    t.noEmail
                  }
                />

                <Info
                  icon={MapPin}
                  value={
                    customer.address ||
                    t.noAddress
                  }
                />
              </div>

              <div className="mt-6 rounded-2xl bg-slate-50 dark:bg-slate-800 p-5 border border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                      <BadgeDollarSign size={20} />
                    </div>

                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {t.balance}
                      </p>

                      <h3
                        className={`text-2xl font-black ${
                          Number(
                            customer.currentBalance ||
                              0
                          ) > 0
                            ? "text-red-500"
                            : "text-emerald-600"
                        }`}
                      >
                        {money(
                          customer.currentBalance
                        )}
                      </h3>
                    </div>
                  </div>
                </div>
              </div>

              <Link
                to={`/customers/${customer._id}`}
                className="mt-5 w-full bg-slate-950 hover:bg-indigo-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition"
              >
                <Eye size={18} />
                {t.viewProfile}
              </Link>
            </div>
          ))}

          {filteredCustomers.length === 0 && (
            <div className="xl:col-span-3 bg-white dark:bg-slate-900 rounded-[2rem] p-14 text-center border border-slate-100 dark:border-slate-800">
              <Users
                size={55}
                className="mx-auto text-slate-300"
              />

              <p className="mt-5 text-slate-500">
                {t.noCustomers}
              </p>
            </div>
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <form
              onSubmit={saveCustomer}
              className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2rem] shadow-2xl p-6 md:p-8"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white">
                    {editingId
                      ? t.updateCustomer
                      : t.addCustomer}
                  </h2>

                  <p className="text-slate-500 dark:text-slate-400 mt-1">
                    {editingId
                      ? t.editInfo
                      : t.createInfo}
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
                  label={t.customerName}
                  value={form.name}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      name: value
                    })
                  }
                />

                <Input
                  label={t.phone}
                  required={false}
                  value={form.phone}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      phone: value
                    })
                  }
                />

                <Input
                  label={t.email}
                  type="email"
                  required={false}
                  value={form.email}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      email: value
                    })
                  }
                />

                <Input
                  label={t.openingBalance}
                  type="number"
                  required={false}
                  value={form.openingBalance}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      openingBalance: value
                    })
                  }
                />

                <div className="md:col-span-2">
                  <Input
                    label={t.address}
                    required={false}
                    value={form.address}
                    onChange={(value) =>
                      setForm({
                        ...form,
                        address: value
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 dark:text-white font-bold"
                >
                  {t.cancel}
                </button>

                <button
                  disabled={saving}
                  className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-60"
                >
                  {saving
                    ? t.saving
                    : editingId
                    ? t.updateCustomer
                    : t.saveCustomer}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {title}
          </p>

          <h2 className="text-3xl font-black text-slate-900 dark:text-white mt-2">
            {value}
          </h2>
        </div>

        <div
          className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${color} text-white flex items-center justify-center shadow-lg`}
        >
          <Icon size={30} />
        </div>
      </div>
    </div>
  );
}

function Info({ icon: Icon, value }) {
  return (
    <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
      <Icon size={17} />
      <span className="text-sm">
        {value}
      </span>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required = true
}) {
  return (
    <div>
      <label className="text-sm font-bold text-slate-600 dark:text-slate-300">
        {label}
      </label>

      <input
        required={required}
        type={type}
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="w-full mt-2 px-4 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}