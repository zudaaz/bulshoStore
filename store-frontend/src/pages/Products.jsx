import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Plus,
  Search,
  Package,
  Trash2,
  Pencil,
  X,
  Boxes,
  AlertTriangle,
  DollarSign,
  Barcode,
  Save,
  ImagePlus
} from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";
import api, { getAssetUrl } from "../api/client";


const emptyForm = {
  name: "",
  category: "",
  sku: "",
  barcode: "",
  brand: "",
  unit: "pcs",
  buyingPrice: "",
  sellingPrice: "",
  wholesalePrice: "",
  taxRate: 0,
  discountRate: 0,
  quantityInStock: "",
  minimumStockLevel: 5,
  shelfLocation: "",
  batchNumber: "",
  manufacturingDate: "",
  expiryDate: "",
  description: "",
  image: null,
  imagePreview: ""
};

const translations = {
  English: {
    title: "Products Inventory",
    subtitle: "Manage stock, images, categories, barcodes, prices, and product levels.",
    addProduct: "Add Product",
    totalProducts: "Total Products",
    lowStock: "Low Stock",
    outOfStock: "Out of Stock",
    inventoryValue: "Inventory Value",
    search: "Search products by name, barcode, category...",
    product: "Product",
    category: "Category",
    barcode: "Barcode",
    buy: "Buy",
    sell: "Sell",
    stock: "Stock",
    status: "Status",
    action: "Action",
    noProducts: "No products found",
    inventoryProduct: "Inventory Product",
    unit: "unit",
    updateProduct: "Update Product",
    addProductTitle: "Add Product",
    editInfo: "Edit inventory product information",
    createInfo: "Create a new inventory product",
    productImage: "Product Image",
    uploadImage: "Upload product image",
    imageSupport: "PNG, JPG, JPEG supported",
    productName: "Product Name",
    selectCategory: "Select Category",
    noCategories: "No categories found. Create category first.",
    minimumStock: "Minimum Stock",
    description: "Description",
    cancel: "Cancel",
    saveProduct: "Save Product",
    saving: "Saving...",
    active: "active",
    low: "Low",
    out: "Out of stock"
  },
  Somali: {
    title: "Alaabta Bakhaarka",
    subtitle: "Maamul bakhaarka, sawirrada, qaybaha, barcode-ka, qiimaha, iyo heerka alaabta.",
    addProduct: "Ku dar Alaab",
    totalProducts: "Alaabta Guud",
    lowStock: "Bakhaar Yar",
    outOfStock: "Bakhaar Dhamaaday",
    inventoryValue: "Qiimaha Bakhaarka",
    search: "Raadi alaab magaca, barcode, ama qaybta...",
    product: "Alaab",
    category: "Qayb",
    barcode: "Barcode",
    buy: "Iibsi",
    sell: "Iibin",
    stock: "Bakhaar",
    status: "Xaalad",
    action: "Ficil",
    noProducts: "Alaab lama helin",
    inventoryProduct: "Alaab Bakhaar",
    unit: "unit",
    updateProduct: "Cusbooneysii Alaab",
    addProductTitle: "Ku dar Alaab",
    editInfo: "Wax ka beddel xogta alaabta",
    createInfo: "Samee alaab cusub",
    productImage: "Sawirka Alaabta",
    uploadImage: "Soo geli sawirka alaabta",
    imageSupport: "PNG, JPG, JPEG waa la taageeraa",
    productName: "Magaca Alaabta",
    selectCategory: "Dooro Qayb",
    noCategories: "Qaybo lama helin. Marka hore samee qayb.",
    minimumStock: "Bakhaar Ugu Yar",
    description: "Faahfaahin",
    cancel: "Ka noqo",
    saveProduct: "Keydi Alaab",
    saving: "Waa la keydinayaa...",
    active: "active",
    low: "Yar",
    out: "Bakhaar ma jiro"
  },
  Arabic: {
    title: "مخزون المنتجات",
    subtitle: "إدارة المخزون والصور والأقسام والباركود والأسعار ومستويات المنتجات.",
    addProduct: "إضافة منتج",
    totalProducts: "إجمالي المنتجات",
    lowStock: "مخزون منخفض",
    outOfStock: "نفد المخزون",
    inventoryValue: "قيمة المخزون",
    search: "ابحث باسم المنتج أو الباركود أو القسم...",
    product: "المنتج",
    category: "القسم",
    barcode: "الباركود",
    buy: "شراء",
    sell: "بيع",
    stock: "المخزون",
    status: "الحالة",
    action: "الإجراء",
    noProducts: "لا توجد منتجات",
    inventoryProduct: "منتج مخزون",
    unit: "وحدة",
    updateProduct: "تحديث المنتج",
    addProductTitle: "إضافة منتج",
    editInfo: "تعديل معلومات المنتج",
    createInfo: "إنشاء منتج جديد",
    productImage: "صورة المنتج",
    uploadImage: "رفع صورة المنتج",
    imageSupport: "يدعم PNG و JPG و JPEG",
    productName: "اسم المنتج",
    selectCategory: "اختر القسم",
    noCategories: "لا توجد أقسام. أنشئ قسمًا أولاً.",
    minimumStock: "الحد الأدنى للمخزون",
    description: "الوصف",
    cancel: "إلغاء",
    saveProduct: "حفظ المنتج",
    saving: "جارٍ الحفظ...",
    active: "نشط",
    low: "منخفض",
    out: "نفد المخزون"
  }
};

function getImageUrl(image) {
  if (!image) return "";
  if (image.startsWith("blob:")) return image;
  if (image.startsWith("data:")) return image;
  if (image.startsWith("http")) return image;
  return getAssetUrl(image);
}

function getAppSettings() {
  const saved = JSON.parse(localStorage.getItem("store_settings") || "{}");

  return {
    currency: saved.currency || localStorage.getItem("app_currency") || "USD",
    language: saved.language || localStorage.getItem("app_language") || "English"
  };
}

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");

  const [appSettings, setAppSettings] = useState(getAppSettings);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const currency = appSettings.currency;
  const t = translations[appSettings.language] || translations.English;

  useEffect(() => {
    loadProducts();
    loadCategories();

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

  async function loadCategories() {
    try {
      const res = await api.get("/categories");

      const data =
        res.data?.data?.categories ||
        res.data?.data ||
        res.data?.categories ||
        [];

      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load categories");
    }
  }

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const text = `${p.name || ""} ${p.barcode || ""} ${
        p.category?.name || p.category || ""
      }`.toLowerCase();

      return text.includes(search.toLowerCase());
    });
  }, [products, search]);

  const totalProducts = products.length;

  const lowStock = products.filter(
    (p) =>
      Number(p.quantityInStock || 0) > 0 &&
      Number(p.quantityInStock || 0) <= Number(p.minimumStockLevel || 0)
  ).length;

  const outOfStock = products.filter(
    (p) => Number(p.quantityInStock || 0) <= 0
  ).length;

  const inventoryValue = products.reduce(
    (sum, p) =>
      sum + Number(p.quantityInStock || 0) * Number(p.buyingPrice || 0),
    0
  );

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function openCreateModal() {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEditModal(product) {
    setEditingId(product._id);

    setForm({
      name: product.name || "",
      category: product.category?._id || product.category || "",
      sku: product.sku || "",
      barcode: product.barcode || "",
      brand: product.brand || "",
      unit: product.unit || "pcs",
      buyingPrice: product.buyingPrice ?? "",
      sellingPrice: product.sellingPrice ?? "",
      wholesalePrice: product.wholesalePrice ?? "",
      taxRate: product.taxRate ?? 0,
      discountRate: product.discountRate ?? 0,
      quantityInStock: product.quantityInStock ?? "",
      minimumStockLevel: product.minimumStockLevel ?? 5,
      shelfLocation: product.shelfLocation || "",
      batchNumber: product.batchNumber || "",
      manufacturingDate: product.manufacturingDate ? String(product.manufacturingDate).slice(0, 10) : "",
      expiryDate: product.expiryDate ? String(product.expiryDate).slice(0, 10) : "",
      description: product.description || "",
      image: null,
      imagePreview: getImageUrl(product.image)
    });

    setShowModal(true);
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed");
      return;
    }

    setForm((prev) => ({
      ...prev,
      image: file,
      imagePreview: URL.createObjectURL(file)
    }));
  }

  async function saveProduct(e) {
    e.preventDefault();

    if (!form.category) {
      toast.error("Please select category");
      return;
    }

    if (!form.name || !form.buyingPrice || !form.sellingPrice) {
      toast.error("Please fill product name and prices");
      return;
    }

    setSaving(true);

    const formData = new FormData();
    formData.append("name", form.name);
    formData.append("category", form.category);
    formData.append("sku", form.sku || "");
    formData.append("barcode", form.barcode || "");
    formData.append("brand", form.brand || "");
    formData.append("unit", form.unit || "pcs");
    formData.append("buyingPrice", Number(form.buyingPrice || 0));
    formData.append("sellingPrice", Number(form.sellingPrice || 0));
    formData.append("wholesalePrice", Number(form.wholesalePrice || 0));
    formData.append("taxRate", Number(form.taxRate || 0));
    formData.append("discountRate", Number(form.discountRate || 0));
    formData.append("quantityInStock", Number(form.quantityInStock || 0));
    formData.append("minimumStockLevel", Number(form.minimumStockLevel || 0));
    formData.append("shelfLocation", form.shelfLocation || "");
    formData.append("batchNumber", form.batchNumber || "");
    formData.append("manufacturingDate", form.manufacturingDate || "");
    formData.append("expiryDate", form.expiryDate || "");
    formData.append("description", form.description || "");

    if (form.image) {
      formData.append("image", form.image);
    }

    try {
      if (editingId) {
        await api.put(`/products/${editingId}`, formData);
        toast.success("Product updated successfully");
      } else {
        await api.post("/products", formData);
        toast.success("Product saved successfully");
      }

      closeModal();
      await loadProducts();
    } catch (err) {
      console.log("SAVE PRODUCT ERROR:", err.response?.data || err.message);
      toast.error(err.response?.data?.message || "Failed to save product");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(id) {
    if (!window.confirm("Delete this product?")) return;

    try {
      await api.delete(`/products/${id}`);
      toast.success("Product deleted successfully");
      await loadProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete product");
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#0B2545] via-[#0E7490] to-[#F4B740] p-6 md:p-8 text-white shadow-xl">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10" />
          <div className="absolute -bottom-20 left-20 h-56 w-56 rounded-full bg-white/10" />

          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div>
              <h1 className="text-3xl md:text-4xl font-black">{t.title}</h1>
              <p className="text-white/75 mt-2">{t.subtitle}</p>
            </div>

            <button
              onClick={openCreateModal}
              className="flex items-center justify-center gap-2 bg-white text-[#0B2545] px-6 py-3 rounded-2xl font-black shadow-lg hover:scale-[1.02] transition"
            >
              <Plus size={19} />
              {t.addProduct}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          <StatCard title={t.totalProducts} value={totalProducts} icon={Package} />
          <StatCard title={t.lowStock} value={lowStock} icon={AlertTriangle} warning />
          <StatCard title={t.outOfStock} value={outOfStock} icon={Boxes} danger />
          <StatCard
            title={t.inventoryValue}
            value={money(inventoryValue)}
            icon={DollarSign}
            success
          />
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="relative max-w-xl">
            <Search size={18} className="absolute left-4 top-4 text-slate-400" />

            <input
              type="text"
              placeholder={t.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800 dark:text-white rounded-2xl pl-12 pr-4 py-4 outline-none focus:ring-2 focus:ring-[#0E7490]"
            />
          </div>
        </div>

        <div className="hidden lg:block bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <TableHead text={t.product} />
                  <TableHead text={t.category} />
                  <TableHead text={t.barcode} />
                  <TableHead text={t.buy} />
                  <TableHead text={t.sell} />
                  <TableHead text={t.stock} />
                  <TableHead text={t.status} />
                  <TableHead text={t.action} right />
                </tr>
              </thead>

              <tbody>
                {filteredProducts.map((product) => (
                  <tr
                    key={product._id}
                    className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    <td className="p-5">
                      <div className="flex items-center gap-4">
                        <ProductImage product={product} />

                        <div>
                          <h3 className="font-black text-slate-900 dark:text-white">
                            {product.name}
                          </h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {product.unit || "pcs"} {t.unit}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="p-5 dark:text-slate-300">
                      {product.category?.name || product.category || "-"}
                    </td>

                    <td className="p-5 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <Barcode size={15} />
                        {product.barcode || "-"}
                      </div>
                    </td>

                    <td className="p-5 dark:text-slate-300">
                      {money(product.buyingPrice)}
                    </td>

                    <td className="p-5 font-black text-[#0E7490]">
                      {money(product.sellingPrice)}
                    </td>

                    <td className="p-5">
                      <StockBadge product={product} t={t} />
                    </td>

                    <td className="p-5">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                        {product.status || t.active}
                      </span>
                    </td>

                    <td className="p-5">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => openEditModal(product)}
                          className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          onClick={() => deleteProduct(product._id)}
                          className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan="8" className="p-10 text-center text-slate-500">
                      {t.noProducts}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredProducts.map((product) => (
            <div
              key={product._id}
              className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 shadow-sm border border-slate-100 dark:border-slate-800"
            >
              <div className="flex items-start justify-between">
                <ProductImage product={product} large />

                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(product)}
                    className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center"
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    onClick={() => deleteProduct(product._id)}
                    className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <h3 className="font-black text-xl mt-4 text-slate-900 dark:text-white">
                {product.name}
              </h3>
              <p className="text-slate-500 dark:text-slate-400">
                {t.inventoryProduct}
              </p>

              <div className="grid grid-cols-2 gap-3 mt-5 text-sm">
                <Info label={t.category} value={product.category?.name || product.category || "-"} />
                <Info label={t.barcode} value={product.barcode || "-"} />
                <Info label={t.buy} value={money(product.buyingPrice)} />
                <Info label={t.sell} value={money(product.sellingPrice)} />
                <Info label={t.stock} value={product.quantityInStock} />
                <Info label={t.status} value={product.status || t.active} />
              </div>
            </div>
          ))}

          {filteredProducts.length === 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 text-center text-slate-500">
              {t.noProducts}
            </div>
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <form
              onSubmit={saveProduct}
              className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[2rem] shadow-2xl p-6 md:p-8 max-h-[92vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white">
                    {editingId ? t.updateProduct : t.addProductTitle}
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">
                    {editingId ? t.editInfo : t.createInfo}
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

              <div className="mb-6">
                <label className="text-sm font-bold text-slate-600 dark:text-slate-300">
                  {t.productImage}
                </label>

                <label className="mt-2 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[2rem] p-6 cursor-pointer hover:border-[#0E7490] transition">
                  {form.imagePreview ? (
                    <img
                      src={form.imagePreview}
                      alt="Product preview"
                      className="w-32 h-32 object-cover rounded-3xl shadow-md"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-3xl bg-[#0E7490]/10 text-[#0E7490] flex items-center justify-center">
                      <ImagePlus size={36} />
                    </div>
                  )}

                  <p className="font-black text-slate-800 dark:text-white mt-4">
                    {t.uploadImage}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t.imageSupport}
                  </p>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input
                  label={t.productName}
                  value={form.name}
                  onChange={(v) => setForm({ ...form, name: v })}
                />

                <div>
                  <label className="text-sm font-bold text-slate-600 dark:text-slate-300">
                    {t.category}
                  </label>

                  <select
                    required
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                    className="w-full mt-2 px-4 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-[#0E7490]"
                  >
                    <option value="">{t.selectCategory}</option>
                    {categories.map((category) => (
                      <option key={category._id} value={category._id}>
                        {category.name}
                      </option>
                    ))}
                  </select>

                  {categories.length === 0 && (
                    <p className="text-xs text-red-500 mt-2">
                      {t.noCategories}
                    </p>
                  )}
                </div>

                <Input
                  label="SKU"
                  required={false}
                  value={form.sku}
                  onChange={(v) => setForm({ ...form, sku: v.toUpperCase() })}
                />

                <Input
                  label={t.barcode}
                  required={false}
                  value={form.barcode}
                  onChange={(v) => setForm({ ...form, barcode: v })}
                />

                <Input
                  label="Brand"
                  required={false}
                  value={form.brand}
                  onChange={(v) => setForm({ ...form, brand: v })}
                />

                <Input
                  label="Unit"
                  value={form.unit}
                  onChange={(v) => setForm({ ...form, unit: v })}
                />

                <Input
                  label={t.buy}
                  type="number"
                  value={form.buyingPrice}
                  onChange={(v) => setForm({ ...form, buyingPrice: v })}
                />

                <Input
                  label={t.sell}
                  type="number"
                  value={form.sellingPrice}
                  onChange={(v) => setForm({ ...form, sellingPrice: v })}
                />

                <Input
                  label="Wholesale Price"
                  type="number"
                  required={false}
                  value={form.wholesalePrice}
                  onChange={(v) => setForm({ ...form, wholesalePrice: v })}
                />

                <Input
                  label="Tax Rate (%)"
                  type="number"
                  required={false}
                  value={form.taxRate}
                  onChange={(v) => setForm({ ...form, taxRate: v })}
                />

                <Input
                  label="Discount Rate (%)"
                  type="number"
                  required={false}
                  value={form.discountRate}
                  onChange={(v) => setForm({ ...form, discountRate: v })}
                />

                <Input
                  label={t.stock}
                  type="number"
                  value={form.quantityInStock}
                  onChange={(v) => setForm({ ...form, quantityInStock: v })}
                />

                <Input
                  label={t.minimumStock}
                  type="number"
                  value={form.minimumStockLevel}
                  onChange={(v) =>
                    setForm({ ...form, minimumStockLevel: v })
                  }
                />

                <Input
                  label="Shelf Location"
                  required={false}
                  value={form.shelfLocation}
                  onChange={(v) => setForm({ ...form, shelfLocation: v })}
                />

                <Input
                  label="Batch Number"
                  required={false}
                  value={form.batchNumber}
                  onChange={(v) => setForm({ ...form, batchNumber: v })}
                />

                <Input
                  label="Manufacturing Date"
                  type="date"
                  required={false}
                  value={form.manufacturingDate}
                  onChange={(v) => setForm({ ...form, manufacturingDate: v })}
                />

                <Input
                  label="Expiry Date"
                  type="date"
                  required={false}
                  value={form.expiryDate}
                  onChange={(v) => setForm({ ...form, expiryDate: v })}
                />

                <div className="md:col-span-2">
                  <label className="text-sm font-bold text-slate-600 dark:text-slate-300">
                    {t.description}
                  </label>
                  <textarea
                    rows="4"
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    placeholder={t.description}
                    className="w-full mt-2 px-4 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 dark:text-white outline-none resize-none focus:ring-2 focus:ring-[#0E7490]"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 dark:text-white font-bold"
                >
                  {t.cancel}
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#0B2545] to-[#0E7490] hover:opacity-90 text-white font-bold disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <Save size={17} />
                  {saving ? t.saving : editingId ? t.updateProduct : t.saveProduct}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function ProductImage({ product, large = false }) {
  const [error, setError] = useState(false);
  const image = getImageUrl(product.image);

  if (!image || error) {
    return (
      <div
        className={`rounded-2xl overflow-hidden bg-[#0E7490]/10 text-[#0E7490] flex items-center justify-center ${
          large ? "w-16 h-16" : "w-12 h-12"
        }`}
      >
        <Package size={large ? 26 : 20} />
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl overflow-hidden bg-[#0E7490]/10 text-[#0E7490] flex items-center justify-center ${
        large ? "w-16 h-16" : "w-12 h-12"
      }`}
    >
      <img
        src={image}
        alt={product.name}
        onError={() => setError(true)}
        className="w-full h-full object-cover"
      />
    </div>
  );
}

function StockBadge({ product, t }) {
  const qty = Number(product.quantityInStock || 0);
  const min = Number(product.minimumStockLevel || 0);

  if (qty <= 0) {
    return (
      <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-600">
        {t.out}
      </span>
    );
  }

  if (qty <= min) {
    return (
      <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">
        {t.low}: {qty}
      </span>
    );
  }

  return (
    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
      {qty}
    </span>
  );
}

function StatCard({ title, value, icon: Icon, warning, danger, success }) {
  const color = danger
    ? "from-red-500 to-orange-500"
    : warning
    ? "from-yellow-500 to-orange-500"
    : success
    ? "from-emerald-500 to-green-600"
    : "from-[#0B2545] to-[#0E7490]";

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-bold">
            {title}
          </p>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mt-2">
            {value}
          </h2>
        </div>

        <div
          className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} text-white flex items-center justify-center shadow-lg`}
        >
          <Icon size={25} />
        </div>
      </div>
    </div>
  );
}

function TableHead({ text, right }) {
  return (
    <th
      className={`p-5 font-bold text-slate-600 dark:text-slate-300 ${
        right ? "text-right" : "text-left"
      }`}
    >
      {text}
    </th>
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
        className="w-full mt-2 px-4 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-[#0E7490]"
      />
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-3">
      <p className="text-xs text-slate-400 font-bold">{label}</p>
      <p className="font-bold text-slate-800 dark:text-white mt-1">{value}</p>
    </div>
  );
}