import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FileText,
  MessageSquare,
  Phone,
  ChevronDown,
  Table2,
  SlidersHorizontal,
  ArrowLeft,
  Loader2,
  X,
  Wallet,
  User,
  CreditCard,
  Download
} from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";
import api from "../api/client";

function getAppSettings() {
  const saved = JSON.parse(localStorage.getItem("store_settings") || "{}");

  return {
    currency: saved.currency || localStorage.getItem("app_currency") || "USD",
    storeName: saved.storeName || "Bulsho Store"
  };
}

function cleanPhone(phone = "") {
  let p = String(phone).replace(/\D/g, "");

  if (p.startsWith("0")) {
    p = p.slice(1);
  }

  if (p && !p.startsWith("252")) {
    p = `252${p}`;
  }

  return p;
}

export default function CustomerProfile() {
  const { id } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [appSettings, setAppSettings] = useState(getAppSettings);

  const [modal, setModal] = useState({
    open: false,
    type: "",
    amount: "",
    note: ""
  });

  useEffect(() => {
    loadStatement();

    function handleSettingsUpdated() {
      setAppSettings(getAppSettings());
    }

    window.addEventListener("settings-updated", handleSettingsUpdated);

    return () => {
      window.removeEventListener("settings-updated", handleSettingsUpdated);
    };
  }, [id]);

  function money(value) {
    return `${appSettings.currency} ${Number(value || 0).toLocaleString()}`;
  }

  async function loadStatement() {
    try {
      setLoading(true);

      const res = await api.get(`/customers/${id}/statement`);

      setData(res.data?.data || null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load customer profile");
    } finally {
      setLoading(false);
    }
  }

  function openPaymentModal(type) {
    setModal({
      open: true,
      type,
      amount: "",
      note: ""
    });
  }

  function closeModal() {
    setModal({
      open: false,
      type: "",
      amount: "",
      note: ""
    });
  }

  async function savePayment() {
    if (!modal.amount || Number(modal.amount) <= 0) {
      toast.error("Enter valid amount");
      return;
    }

    try {
      setSaving(true);

      if (modal.type === "gave") {
        await api.post("/payments/customer-credit", {
          customerId: id,
          amount: Number(modal.amount),
          note: modal.note || "Customer credit added"
        });
      }

      if (modal.type === "received") {
        await api.post("/payments", {
          type: "customer",
          referenceId: id,
          amount: Number(modal.amount),
          method: "cash",
          note: modal.note || "Payment received from customer"
        });
      }

      toast.success("Transaction saved successfully");

      closeModal();
      await loadStatement();
    } catch (err) {
      toast.error(err.response?.data?.message || "Payment failed");
    } finally {
      setSaving(false);
    }
  }

  function exportCSV() {
    const customer = data?.customer;
    const statement = data?.statement || [];

    const rows = [
      ["Customer Statement"],
      ["Store", appSettings.storeName],
      ["Customer", customer?.name || ""],
      ["Phone", customer?.phone || ""],
      ["Balance", money(customer?.currentBalance || 0)],
      [],
      ["Date", "Invoice", "Total", "Paid", "Balance"]
    ];

    statement.forEach((item) => {
      rows.push([
        new Date(item.date || Date.now()).toLocaleDateString(),
        item.invoice || "-",
        Number(item.total || 0),
        Number(item.paid || 0),
        Number(item.balance || 0)
      ]);
    });

    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${customer?.name || "customer"}-statement.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  function printPDF() {
    const customer = data.customer;
    const statement = data.statement || [];
    const balance = Number(customer.currentBalance || data.summary?.balance || 0);

    const rows = statement
      .map(
        (item) => `
          <tr>
            <td>${new Date(item.date || Date.now()).toLocaleDateString()}</td>
            <td>${item.invoice || "-"}</td>
            <td>${money(item.total)}</td>
            <td>${money(item.paid)}</td>
            <td>${money(item.balance)}</td>
          </tr>
        `
      )
      .join("");

    const win = window.open("", "_blank");

    win.document.write(`
      <html>
        <head>
          <title>Customer Statement</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 30px;
              color: #0f172a;
            }

            .header {
              text-align: center;
              border-bottom: 3px solid #0e7490;
              padding-bottom: 20px;
              margin-bottom: 25px;
            }

            h1 {
              margin: 0;
              font-size: 30px;
              color: #071b34;
            }

            .info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              margin-bottom: 25px;
            }

            .card {
              background: #f1f5f9;
              padding: 15px;
              border-radius: 12px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
            }

            th {
              background: #0e7490;
              color: white;
              padding: 12px;
              text-align: left;
            }

            td {
              padding: 12px;
              border-bottom: 1px solid #e2e8f0;
            }

            .balance {
              font-size: 24px;
              font-weight: bold;
              color: ${balance > 0 ? "#ef4444" : "#10b981"};
            }
          </style>
        </head>

        <body>
          <div class="header">
            <h1>${appSettings.storeName}</h1>
            <p>Customer Credit Statement</p>
          </div>

          <div class="info">
            <div class="card"><strong>Customer:</strong> ${customer.name || "-"}</div>
            <div class="card"><strong>Phone:</strong> ${customer.phone || "-"}</div>
            <div class="card"><strong>Transactions:</strong> ${statement.length}</div>
            <div class="card"><strong>Balance:</strong> <span class="balance">${money(balance)}</span></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Invoice</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              ${rows || `<tr><td colspan="5">No transactions found</td></tr>`}
            </tbody>
          </table>

          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    win.document.close();
  }

  async function sendSMS() {
    try {
      if (!phoneNumber) {
        toast.error("Customer phone number is missing");
        return;
      }

      await api.post("/sms/send", {
        mobile: phoneNumber,
        message: `Hello ${customer.name}, your current balance at ${appSettings.storeName} is ${money(balance)}.`
      });

      toast.success("SMS sent successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "SMS failed");
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-[70vh] flex items-center justify-center">
          <Loader2 size={46} className="animate-spin text-[#0E7490]" />
        </div>
      </DashboardLayout>
    );
  }

  if (!data?.customer) {
    return (
      <DashboardLayout>
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-10 text-center text-slate-500 dark:text-slate-400">
          Customer profile not found.
        </div>
      </DashboardLayout>
    );
  }

  const customer = data.customer;
  const statement = data.statement || [];
  const balance = Number(customer.currentBalance || data.summary?.balance || 0);
  const phoneNumber = cleanPhone(customer.phone);

  const whatsappMessage = encodeURIComponent(
    `Hello ${customer.name}, this is ${appSettings.storeName}. Your current balance is ${money(balance)}.`
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-28">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#071B34] via-[#0E7490] to-[#F4B740] p-6 md:p-8 text-white shadow-2xl">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/10 blur-3xl" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-5">
              <Link
                to="/customers"
                className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center hover:bg-white/25 transition"
              >
                <ArrowLeft size={22} />
              </Link>

              <div className="w-20 h-20 rounded-[1.7rem] bg-white/20 flex items-center justify-center text-4xl font-black shadow-xl">
                {customer.name?.charAt(0)?.toUpperCase() || "C"}
              </div>

              <div>
                <h1 className="text-4xl font-black">{customer.name}</h1>
                <p className="text-white/75 mt-1">{customer.phone || "No phone"}</p>
              </div>
            </div>

            <button
              onClick={exportCSV}
              className="bg-white text-[#071B34] px-5 py-3 rounded-2xl font-black flex items-center justify-center gap-2"
            >
              <Download size={18} />
              Export CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <p className="text-slate-500 dark:text-slate-400 font-bold">
                    Customer Balance
                  </p>

                  <h2
                    className={`text-5xl font-black mt-2 ${
                      balance > 0 ? "text-red-500" : "text-emerald-500"
                    }`}
                  >
                    {money(balance)}
                  </h2>

                  <p className="text-slate-400 mt-3">
                    {balance > 0
                      ? "Amount customer owes you"
                      : "No pending customer balance"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => openPaymentModal("gave")}
                    className="bg-red-500 hover:bg-red-600 text-white px-6 py-4 rounded-2xl font-black shadow-lg"
                  >
                    YOU GAVE
                  </button>

                  <button
                    onClick={() => openPaymentModal("received")}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-4 rounded-2xl font-black shadow-lg"
                  >
                    YOU RECEIVED
                  </button>
                </div>
              </div>
            </div>

            <div
              id="statement-table"
              className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                    Transactions
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400">
                    {statement.length} records found
                  </p>
                </div>

                <button className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 flex items-center justify-center">
                  <SlidersHorizontal size={20} />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                  <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr>
                      <Th>Date</Th>
                      <Th>Invoice</Th>
                      <Th>Total</Th>
                      <Th>Paid</Th>
                      <Th>Balance</Th>
                      <Th right>Details</Th>
                    </tr>
                  </thead>

                  <tbody>
                    {statement.map((item, index) => (
                      <tr
                        key={index}
                        className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      >
                        <Td>{new Date(item.date || Date.now()).toLocaleDateString()}</Td>
                        <Td>{item.invoice || "-"}</Td>
                        <Td>{money(item.total)}</Td>
                        <Td>
                          <span className="font-black text-emerald-600">
                            {money(item.paid)}
                          </span>
                        </Td>
                        <Td>
                          <span
                            className={
                              Number(item.balance || 0) > 0
                                ? "font-black text-red-500"
                                : "font-black text-emerald-600"
                            }
                          >
                            {money(item.balance)}
                          </span>
                        </Td>
                        <Td right>
                          <ChevronDown size={20} className="inline text-slate-400" />
                        </Td>
                      </tr>
                    ))}

                    {statement.length === 0 && (
                      <tr>
                        <td colSpan="6" className="p-10 text-center text-slate-500">
                          No transactions found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6">
              <div className="w-20 h-20 rounded-[1.7rem] bg-[#0E7490]/10 text-[#0E7490] flex items-center justify-center mx-auto">
                <User size={38} />
              </div>

              <h2 className="text-2xl font-black text-center mt-5 text-slate-900 dark:text-white">
                {customer.name}
              </h2>

              <p className="text-center text-slate-500 dark:text-slate-400">
                Customer Account
              </p>

              <div className="mt-6 space-y-3">
                <Info icon={Phone} label="Phone" value={customer.phone || "No phone"} />
                <Info icon={Wallet} label="Balance" value={money(balance)} />
                <Info icon={CreditCard} label="Credit Limit" value="Unlimited" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6">
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-5">
                Quick Actions
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() =>
                    document
                      .getElementById("statement-table")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="rounded-2xl bg-slate-100 dark:bg-slate-800 p-4 text-center font-black text-slate-600 dark:text-slate-300 flex flex-col items-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  <Table2 size={23} />
                  TABLE
                </button>

                <button
                  onClick={printPDF}
                  className="rounded-2xl bg-slate-100 dark:bg-slate-800 p-4 text-center font-black text-slate-600 dark:text-slate-300 flex flex-col items-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  <FileText size={23} />
                  PDF
                </button>

                <button
                  onClick={sendSMS}
                  className="rounded-2xl bg-slate-100 dark:bg-slate-800 p-4 text-center font-black text-slate-600 dark:text-slate-300 flex flex-col items-center gap-2 hover:bg-blue-50 dark:hover:bg-slate-700"
                >
                  <MessageSquare size={23} className="text-blue-500" />
                  SMS
                </button>

                <a
                  href={phoneNumber ? `tel:+${phoneNumber}` : "#"}
                  className="rounded-2xl bg-slate-100 dark:bg-slate-800 p-4 text-center font-black text-slate-600 dark:text-slate-300 flex flex-col items-center gap-2 hover:bg-blue-50 dark:hover:bg-slate-700"
                >
                  <Phone size={23} className="text-blue-500" />
                  CALL
                </a>

                <a
                  href={
                    phoneNumber
                      ? `https://wa.me/${phoneNumber}?text=${whatsappMessage}`
                      : "#"
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="col-span-2 rounded-2xl bg-green-500/10 text-green-600 p-4 text-center font-black flex items-center justify-center gap-2 hover:bg-green-500/20"
                >
                  <MessageSquare size={22} />
                  WHATSAPP
                </a>
              </div>
            </div>
          </div>
        </div>

        {modal.open && (
          <PaymentModal
            modal={modal}
            setModal={setModal}
            saving={saving}
            onClose={closeModal}
            onSave={savePayment}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

function PaymentModal({ modal, setModal, saving, onClose, onSave }) {
  const isGave = modal.type === "gave";

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-800">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">
              {isGave ? "You Gave" : "You Received"}
            </h2>

            <p className="text-slate-500 dark:text-slate-400 mt-1">
              {isGave
                ? "Increase customer credit balance"
                : "Record payment received from customer"}
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center"
          >
            <X size={20} />
          </button>
        </div>

        <input
          type="number"
          value={modal.amount}
          onChange={(e) => setModal({ ...modal, amount: e.target.value })}
          placeholder="Enter amount"
          className="w-full p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0E7490]"
        />

        <textarea
          value={modal.note}
          onChange={(e) => setModal({ ...modal, note: e.target.value })}
          placeholder="Write note"
          rows="4"
          className="w-full mt-4 p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white outline-none resize-none focus:ring-2 focus:ring-[#0E7490]"
        />

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black"
          >
            Cancel
          </button>

          <button
            onClick={onSave}
            disabled={saving}
            className={`px-6 py-3 rounded-2xl text-white font-black disabled:opacity-60 ${
              isGave ? "bg-red-500" : "bg-emerald-600"
            }`}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Info({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-50 dark:bg-slate-800 p-4">
      <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
        <Icon size={18} />
        <span className="font-bold">{label}</span>
      </div>

      <strong className="text-slate-900 dark:text-white text-right">
        {value}
      </strong>
    </div>
  );
}

function Th({ children, right }) {
  return (
    <th
      className={`p-5 text-sm font-black text-slate-600 dark:text-slate-300 ${
        right ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({ children, right }) {
  return (
    <td
      className={`p-5 text-sm text-slate-600 dark:text-slate-300 ${
        right ? "text-right" : "text-left"
      }`}
    >
      {children}
    </td>
  );
}