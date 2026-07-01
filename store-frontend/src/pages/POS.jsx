import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Smartphone,
  User,
  ReceiptText,
  Printer,
  X,
  RotateCcw,
  Percent,
  ScanBarcode,
  BadgeDollarSign,
  PackageCheck
} from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";
import api from "../api/client";

const translations = {
  English: {
    title: "Modern POS",
    subtitle: "Fast sales, stock control, customer billing, and receipt printing",
    search: "Search product by name, barcode, or category...",
    noProducts: "No products found",
    stock: "Stock",
    noCategory: "No category",
    cart: "Cart",
    itemsSelected: "items selected",
    cartEmpty: "Cart is empty",
    customer: "Customer",
    walkIn: "Walk-in Customer",
    paymentMethod: "Payment Method",
    cash: "Cash",
    mobile: "Mobile",
    bank: "Bank",
    subtotal: "Subtotal",
    discount: "Discount",
    tax: "Tax",
    paid: "Paid",
    balance: "Balance",
    completeSale: "Complete Sale",
    processing: "Processing...",
    saleReceipt: "Sale Receipt",
    invoice: "Invoice",
    date: "Date",
    payment: "Payment",
    item: "Item",
    qty: "Qty",
    total: "Total",
    close: "Close",
    print: "Print",
    paidAmount: "Paid amount",
    clearCart: "Clear Cart",
    products: "Products",
    cartValue: "Cart Value"
  },
  Somali: {
    title: "POS Casri ah",
    subtitle: "Iib degdeg ah, bakhaar xakameyn, biil, iyo rasiid daabacid",
    search: "Raadi alaab magaca, barcode, ama qaybta...",
    noProducts: "Alaab lama helin",
    stock: "Bakhaar",
    noCategory: "Qayb ma leh",
    cart: "Gaari",
    itemsSelected: "alaab ayaa la doortay",
    cartEmpty: "Gaarigu waa madhan yahay",
    customer: "Macmiil",
    walkIn: "Macmiil Socda",
    paymentMethod: "Habka Lacag Bixinta",
    cash: "Cash",
    mobile: "Mobile",
    bank: "Bank",
    subtotal: "Wadar Hoose",
    discount: "Qiimo Dhimis",
    tax: "Canshuur",
    paid: "La bixiyay",
    balance: "Haraaga",
    completeSale: "Dhameystir Iibka",
    processing: "Waa la shaqeynayaa...",
    saleReceipt: "Rasiidka Iibka",
    invoice: "Invoice",
    date: "Taariikh",
    payment: "Lacag Bixin",
    item: "Alaab",
    qty: "Tiro",
    total: "Wadar",
    close: "Xir",
    print: "Daabac",
    paidAmount: "Lacagta la bixiyay",
    clearCart: "Nadiifi Gaariga",
    products: "Alaab",
    cartValue: "Qiimaha Gaariga"
  },
  Arabic: {
    title: "نظام البيع الحديث",
    subtitle: "مبيعات سريعة وتحكم بالمخزون وفوترة وطباعة الإيصالات",
    search: "ابحث باسم المنتج أو الباركود أو القسم...",
    noProducts: "لا توجد منتجات",
    stock: "المخزون",
    noCategory: "بدون قسم",
    cart: "السلة",
    itemsSelected: "عناصر محددة",
    cartEmpty: "السلة فارغة",
    customer: "العميل",
    walkIn: "عميل عادي",
    paymentMethod: "طريقة الدفع",
    cash: "نقدي",
    mobile: "موبايل",
    bank: "بنك",
    subtotal: "المجموع الفرعي",
    discount: "الخصم",
    tax: "الضريبة",
    paid: "المدفوع",
    balance: "المتبقي",
    completeSale: "إتمام البيع",
    processing: "جاري المعالجة...",
    saleReceipt: "إيصال البيع",
    invoice: "الفاتورة",
    date: "التاريخ",
    payment: "الدفع",
    item: "الصنف",
    qty: "الكمية",
    total: "الإجمالي",
    close: "إغلاق",
    print: "طباعة",
    paidAmount: "المبلغ المدفوع",
    clearCart: "تفريغ السلة",
    products: "المنتجات",
    cartValue: "قيمة السلة"
  }
};

function getAppSettings() {
  const saved = JSON.parse(localStorage.getItem("store_settings") || "{}");

  return {
    currency: saved.currency || localStorage.getItem("app_currency") || "USD",
    language: saved.language || localStorage.getItem("app_language") || "English",
    storeName: saved.storeName || "Bulsho Store",
    receiptFooter: saved.receiptFooter || "Thank you for shopping with us.",
    taxRate: Number(saved.taxRate || 0)
  };
}

export default function POS() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [customer, setCustomer] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paidAmount, setPaidAmount] = useState("");
  const [discount, setDiscount] = useState("");
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [appSettings, setAppSettings] = useState(getAppSettings);

  const currency = appSettings.currency;
  const t = translations[appSettings.language] || translations.English;

  useEffect(() => {
    loadProducts();
    loadCustomers();

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

  async function loadProducts() {
    try {
      const res = await api.get("/products");

      const data =
        res.data?.data?.products ||
        res.data?.data ||
        res.data?.products ||
        [];

      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load products");
    }
  }

  async function loadCustomers() {
    try {
      const res = await api.get("/customers");

      const data =
        res.data?.data?.customers ||
        res.data?.data ||
        res.data?.customers ||
        [];

      setCustomers(Array.isArray(data) ? data : []);
    } catch {
      setCustomers([]);
    }
  }

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const text = `${product.name || ""} ${product.barcode || ""} ${
        product.category?.name || product.category || ""
      }`.toLowerCase();

      return text.includes(search.toLowerCase());
    });
  }, [products, search]);

  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item.sellingPrice || 0) * Number(item.qty || 0),
    0
  );

  const discountAmount = Number(discount || 0);
  const taxableAmount = Math.max(subtotal - discountAmount, 0);
  const taxAmount = (taxableAmount * Number(appSettings.taxRate || 0)) / 100;
  const grandTotal = taxableAmount + taxAmount;
  const defaultPaid = paymentMethod === "credit" ? 0 : grandTotal;
  const paid = Number(paidAmount === "" ? defaultPaid : paidAmount);
  const balance = Math.max(grandTotal - paid, 0);

  function addToCart(product) {
    if (Number(product.quantityInStock || 0) <= 0) {
      toast.error("Product is out of stock");
      return;
    }

    setCart((prev) => {
      const exists = prev.find((item) => item._id === product._id);

      if (exists) {
        if (exists.qty + 1 > Number(product.quantityInStock || 0)) {
          toast.error("Not enough stock");
          return prev;
        }

        return prev.map((item) =>
          item._id === product._id ? { ...item, qty: item.qty + 1 } : item
        );
      }

      return [...prev, { ...product, qty: 1 }];
    });
  }

  function increaseQty(id) {
    setCart((prev) =>
      prev.map((item) => {
        if (item._id !== id) return item;

        if (item.qty + 1 > Number(item.quantityInStock || 0)) {
          toast.error("Not enough stock");
          return item;
        }

        return { ...item, qty: item.qty + 1 };
      })
    );
  }

  function decreaseQty(id) {
    setCart((prev) =>
      prev
        .map((item) => (item._id === id ? { ...item, qty: item.qty - 1 } : item))
        .filter((item) => item.qty > 0)
    );
  }

  function removeItem(id) {
    setCart((prev) => prev.filter((item) => item._id !== id));
  }

  function clearCart() {
    if (cart.length === 0) return;

    setCart([]);
    setPaidAmount("");
    setDiscount("");
    toast.success("Cart cleared");
  }

  async function completeSale() {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    if (paid < 0) {
      toast.error("Paid amount cannot be negative");
      return;
    }

    if ((paymentMethod === "credit" || paid < grandTotal) && !customer) {
      toast.error("Select a customer for credit or partial payment");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        customer: customer || null,
        items: cart.map((item) => ({
          product: item._id,
          quantity: item.qty
        })),
        paidAmount: paid,
        paymentMethod,
        discount: discountAmount,
        tax: taxAmount
      };

      const res = await api.post("/sales", payload);
      const sale = res.data?.data || res.data?.sale || {};

      setReceipt({
        ...sale,
        subtotal,
        discount: discountAmount,
        tax: taxAmount,
        total: grandTotal,
        paidAmount: paid,
        balance,
        paymentMethod,
        receiptDate: sale.createdAt || new Date().toISOString(),
        localItems: cart.map((item) => ({
          name: item.name,
          qty: item.qty,
          price: item.sellingPrice,
          total: Number(item.sellingPrice) * Number(item.qty)
        }))
      });

      toast.success("Sale completed successfully");

      setCart([]);
      setCustomer("");
      setPaidAmount("");
      setDiscount("");
      setPaymentMethod("cash");

      await loadProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Sale failed");
    } finally {
      setLoading(false);
    }
  }

  function printReceipt() {
    const printContent = document.getElementById("receipt-print-area");
    const newWindow = window.open("", "_blank");

    newWindow.document.write(`
      <html>
        <head>
          <title>Receipt</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 0;
              background: #fff;
              font-family: Arial, sans-serif;
              color: #000;
            }

            .receipt {
              width: 80mm;
              max-width: 80mm;
              padding: 8mm 5mm;
              margin: 0 auto;
              background: #fff;
              font-size: 12px;
              color: #000;
            }

            .center {
              text-align: center;
            }

            .store-icon {
              width: 34px;
              height: 34px;
              margin: 0 auto 6px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 24px;
            }

            .store-name {
              font-size: 22px;
              font-weight: 900;
              margin: 0;
              line-height: 1.15;
            }

            .subtitle {
              font-size: 12px;
              margin-top: 2px;
            }

            .line {
              border-top: 1px dashed #000;
              margin: 10px 0;
            }

            .info-row,
            .total-row {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 8px;
              margin: 4px 0;
            }

            .info-row span:first-child,
            .total-row span:first-child {
              font-weight: 700;
            }

            .info-row strong,
            .total-row strong {
              text-align: right;
              font-weight: 800;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
            }

            th {
              border-bottom: 1px dashed #000;
              padding-bottom: 5px;
              text-align: left;
              font-weight: 900;
            }

            td {
              padding: 5px 0;
              vertical-align: top;
            }

            th:nth-child(2),
            td:nth-child(2) {
              text-align: center;
              width: 22px;
            }

            th:last-child,
            td:last-child {
              text-align: right;
              width: 78px;
              font-weight: 800;
            }

            .grand-total {
              font-size: 16px;
              font-weight: 900;
              border-top: 1px dashed #000;
              padding-top: 7px;
              margin-top: 7px;
            }

            .footer {
              text-align: center;
              margin-top: 12px;
              font-weight: 700;
            }

            .barcode {
              margin-top: 10px;
              text-align: center;
              font-family: monospace;
              letter-spacing: 2px;
              font-size: 11px;
            }
          </style>
        </head>

        <body>
          ${printContent.innerHTML}

          <script>
            window.onload = function () {
              window.print();
              window.onafterprint = function () {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `);

    newWindow.document.close();
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#071B34] via-[#0E7490] to-[#F4B740] p-6 md:p-8 text-white shadow-2xl">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />

          <div className="relative z-10 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
            <div>
              <h1 className="text-4xl font-black">{t.title}</h1>
              <p className="text-white/75 mt-2">{t.subtitle}</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <MiniStat icon={PackageCheck} label={t.products} value={products.length} />
              <MiniStat icon={ShoppingCart} label={t.cart} value={cart.length} />
              <MiniStat icon={BadgeDollarSign} label={t.cartValue} value={money(grandTotal)} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 shadow-sm border border-slate-100 dark:border-slate-800">
              <div className="relative">
                <Search size={18} className="absolute left-4 top-4 text-slate-400" />

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t.search}
                  className="w-full bg-slate-100 dark:bg-slate-800 dark:text-white rounded-2xl pl-12 pr-4 py-4 outline-none focus:ring-2 focus:ring-[#0E7490]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredProducts.map((product) => (
                <button
                  key={product._id}
                  onClick={() => addToCart(product)}
                  className="group bg-white dark:bg-slate-900 text-left rounded-[2rem] p-5 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                      <ShoppingCart size={24} />
                    </div>

                    <span
                      className={`text-xs font-black px-3 py-1 rounded-full ${
                        Number(product.quantityInStock || 0) <= 0
                          ? "bg-red-100 text-red-600"
                          : Number(product.quantityInStock || 0) <=
                            Number(product.minimumStockLevel || 0)
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {t.stock}: {product.quantityInStock}
                    </span>
                  </div>

                  <h3 className="font-black text-lg mt-5 text-slate-900 dark:text-white">
                    {product.name}
                  </h3>

                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {product.category?.name || product.category || t.noCategory}
                  </p>

                  <div className="flex items-center justify-between mt-5">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                      {money(product.sellingPrice)}
                    </span>

                    <span className="w-10 h-10 rounded-xl bg-slate-950 text-white flex items-center justify-center group-hover:bg-[#0E7490] transition">
                      <Plus size={18} />
                    </span>
                  </div>
                </button>
              ))}

              {filteredProducts.length === 0 && (
                <div className="col-span-full bg-white dark:bg-slate-900 rounded-[2rem] p-10 text-center text-slate-500 border border-slate-100 dark:border-slate-800">
                  <ScanBarcode size={40} className="mx-auto mb-3 text-slate-400" />
                  {t.noProducts}
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-950 text-white rounded-[2rem] shadow-2xl p-5 xl:sticky xl:top-6 h-fit">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-2xl font-black">{t.cart}</h2>
                <p className="text-slate-400 text-sm">
                  {cart.length} {t.itemsSelected}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={clearCart}
                  className="w-11 h-11 rounded-2xl bg-red-500/10 text-red-300 flex items-center justify-center hover:bg-red-500/20"
                >
                  <RotateCcw size={18} />
                </button>

                <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center">
                  <ReceiptText size={20} />
                </div>
              </div>
            </div>

            <div className="space-y-3 max-h-[330px] overflow-y-auto pr-1">
              {cart.map((item) => (
                <div
                  key={item._id}
                  className="bg-white/10 rounded-2xl p-4 border border-white/10"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-black">{item.name}</h3>
                      <p className="text-sm text-slate-400">
                        {money(item.sellingPrice)} × {item.qty}
                      </p>
                    </div>

                    <button
                      onClick={() => removeItem(item._id)}
                      className="text-red-300 hover:text-red-400"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => decreaseQty(item._id)}
                        className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center"
                      >
                        <Minus size={14} />
                      </button>

                      <span className="font-black w-8 text-center">{item.qty}</span>

                      <button
                        onClick={() => increaseQty(item._id)}
                        className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <strong>{money(Number(item.sellingPrice) * Number(item.qty))}</strong>
                  </div>
                </div>
              ))}

              {cart.length === 0 && (
                <div className="text-center text-slate-400 py-16">{t.cartEmpty}</div>
              )}
            </div>

            <div className="border-t border-white/10 mt-5 pt-5 space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-300 flex items-center gap-2 mb-2">
                  <User size={16} />
                  {t.customer}
                </label>

                <select
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  className="w-full bg-white/10 rounded-2xl px-4 py-3 outline-none"
                >
                  <option value="" className="text-black">
                    {t.walkIn}
                  </option>

                  {customers.map((customerItem) => (
                    <option key={customerItem._id} value={customerItem._id} className="text-black">
                      {customerItem.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-300 mb-2 block">
                  {t.paymentMethod}
                </label>

                <div className="grid grid-cols-3 gap-2">
                  <PayButton active={paymentMethod === "cash"} icon={Banknote} label={t.cash} onClick={() => setPaymentMethod("cash")} />
                  <PayButton active={paymentMethod === "mobile_money"} icon={Smartphone} label={t.mobile} onClick={() => setPaymentMethod("mobile_money")} />
                  <PayButton active={paymentMethod === "bank"} icon={CreditCard} label={t.bank} onClick={() => setPaymentMethod("bank")} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <Percent size={16} className="absolute left-3 top-3.5 text-slate-400" />

                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    placeholder={t.discount}
                    className="w-full bg-white/10 rounded-2xl pl-10 pr-4 py-3 outline-none"
                  />
                </div>

                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder={`${t.paidAmount}: ${grandTotal}`}
                  className="w-full bg-white/10 rounded-2xl px-4 py-3 outline-none"
                />
              </div>

              <div className="space-y-2 text-sm">
                <Row label={t.subtotal} value={money(subtotal)} />
                <Row label={t.discount} value={money(discountAmount)} />
                <Row label={t.tax} value={money(taxAmount)} />
                <Row label={t.total} value={money(grandTotal)} bold />
                <Row label={t.paid} value={money(paid)} />
                <Row label={t.balance} value={money(balance)} danger={balance > 0} />
              </div>

              <button
                onClick={completeSale}
                disabled={loading || cart.length === 0}
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-90 disabled:opacity-50 py-4 rounded-2xl font-black shadow-xl"
              >
                {loading ? t.processing : t.completeSale}
              </button>
            </div>
          </div>
        </div>
      </div>

      {receipt && (
        <ReceiptModal
          receipt={receipt}
          t={t}
          money={money}
          appSettings={appSettings}
          printReceipt={printReceipt}
          onClose={() => setReceipt(null)}
        />
      )}
    </DashboardLayout>
  );
}

function ReceiptModal({ receipt, t, money, appSettings, printReceipt, onClose }) {
  const receiptItems = receipt.items || receipt.localItems || [];

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-black text-slate-900">{t.saleReceipt}</h2>
            <p className="text-sm text-slate-500">80mm thermal receipt preview</p>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-red-100 hover:text-red-500"
          >
            <X size={20} />
          </button>
        </div>

        <div className="bg-slate-100 p-5">
          <div id="receipt-print-area">
            <div className="receipt bg-white mx-auto text-black shadow-xl p-5">
              <div className="center text-center">
                <ReceiptText size={34} className="mx-auto" />

                <h1 className="store-name text-3xl font-black mt-2">
                  {appSettings.storeName}
                </h1>

                <p className="subtitle text-sm">Store Management System</p>
              </div>

              <div className="line border-t border-dashed border-black my-3" />

              <div className="text-sm space-y-1">
                <InfoLine label={t.invoice} value={receipt.invoiceNumber || receipt.receiptNumber || "N/A"} />
                <InfoLine label={t.date} value={new Date(receipt.createdAt || receipt.receiptDate).toLocaleString()} />
                <InfoLine label={t.customer} value={receipt.customerName || t.walkIn} />
                <InfoLine label={t.payment} value={receipt.paymentMethod || "cash"} />
              </div>

              <div className="line border-t border-dashed border-black my-3" />

              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left pb-2">{t.item}</th>
                    <th className="text-center pb-2">{t.qty}</th>
                    <th className="text-right pb-2">{t.total}</th>
                  </tr>
                </thead>

                <tbody>
                  {receiptItems.map((item, index) => (
                    <tr key={index}>
                      <td className="py-1 font-medium">{item.productName || item.name}</td>
                      <td className="py-1 text-center">{item.quantity || item.qty}</td>
                      <td className="py-1 text-right font-bold">{money(item.total || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="line border-t border-dashed border-black my-3" />

              <div className="space-y-1 text-sm">
                <ReceiptRow label={t.subtotal} value={money(receipt.subtotal)} />
                <ReceiptRow label={t.discount} value={money(receipt.discount)} />
                <ReceiptRow label={t.tax} value={money(receipt.tax)} />
                <ReceiptRow label={t.paid} value={money(receipt.paidAmount)} />
                <ReceiptRow label={t.balance} value={money(receipt.balance)} />
                <ReceiptRow label={t.total} value={money(receipt.total)} bold />
              </div>

              <div className="line border-t border-dashed border-black my-3" />

              <p className="footer text-center text-sm font-black">
                {appSettings.receiptFooter}
              </p>

              <p className="barcode text-center mt-3 text-xs tracking-widest">
                * {receipt.invoiceNumber || receipt.receiptNumber || "RECEIPT"} *
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-slate-100 flex gap-3 bg-slate-50">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-white text-slate-500 font-black"
          >
            {t.close}
          </button>

          <button
            onClick={printReceipt}
            className="flex-1 py-3 rounded-2xl bg-indigo-600 text-white font-black flex items-center justify-center gap-2"
          >
            <Printer size={18} />
            {t.print}
          </button>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }) {
  return (
    <div className="bg-white/15 backdrop-blur-xl border border-white/15 rounded-2xl px-4 py-3 min-w-[110px]">
      <Icon size={18} />
      <p className="text-xs text-white/70 mt-2">{label}</p>
      <h3 className="font-black text-sm">{value}</h3>
    </div>
  );
}

function PayButton({ active, icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`py-3 rounded-2xl flex flex-col items-center gap-1 text-xs font-bold transition ${
        active
          ? "bg-indigo-600 text-white"
          : "bg-white/10 text-slate-300 hover:bg-white/15"
      }`}
    >
      <Icon size={17} />
      {label}
    </button>
  );
}

function Row({ label, value, danger, bold = false }) {
  return (
    <div
      className={`flex items-center justify-between ${
        bold ? "border-t border-white/10 pt-3 mt-3 text-base" : ""
      }`}
    >
      <span className={bold ? "text-white font-black" : "text-slate-400"}>
        {label}
      </span>

      <strong className={danger ? "text-red-400" : "text-white"}>
        {value}
      </strong>
    </div>
  );
}

function ReceiptRow({ label, value, bold = false }) {
  return (
    <div className={`total-row flex items-center justify-between py-1 ${bold ? "grand-total" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function InfoLine({ label, value }) {
  return (
    <div className="info-row flex items-center justify-between gap-3">
      <span className="font-bold">{label}</span>
      <strong className="text-right">{value}</strong>
    </div>
  );
}