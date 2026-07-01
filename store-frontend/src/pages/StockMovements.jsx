import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Search,
  History,
  Package,
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw
} from "lucide-react";
import DashboardLayout from "../layouts/DashboardLayout";
import api from "../api/client";

export default function StockMovements() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [movements, setMovements] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      loadMovements(selectedProduct);
    }
  }, [selectedProduct]);

  async function loadProducts() {
    try {
      const res = await api.get("/products");
      const list = res.data.data.products || [];
      setProducts(list);

      if (list.length > 0) {
        setSelectedProduct(list[0]._id);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load products");
    }
  }

  async function loadMovements(productId) {
    try {
      setLoading(true);
      const res = await api.get(`/products/${productId}/stock-movements`);
      setMovements(res.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load stock movements");
    } finally {
      setLoading(false);
    }
  }

  const filtered = movements.filter((m) => {
    const text = `${m.type || ""} ${m.reason || ""} ${m.product?.name || ""}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900">
            Stock Movement History
          </h1>
          <p className="text-slate-500 mt-1">
            Track stock in, stock out, sales, returns, and adjustments
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Stat title="Total Movements" value={movements.length} />
          <Stat
            title="Stock In"
            value={movements.filter((m) => ["IN", "RETURN"].includes(m.type)).length}
          />
          <Stat
            title="Stock Out"
            value={movements.filter((m) => ["SALE", "OUT"].includes(m.type)).length}
          />
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-bold text-slate-600">
              Select Product
            </label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full mt-2 bg-slate-100 rounded-2xl px-4 py-4 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select product</option>
              {products.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-bold text-slate-600">
              Search Movement
            </label>
            <div className="relative mt-2">
              <Search size={18} className="absolute left-4 top-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search type or reason..."
                className="w-full bg-slate-100 rounded-2xl pl-12 pr-4 py-4 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <History className="text-indigo-600" />
              <h2 className="text-xl font-black text-slate-900">
                Movement Records
              </h2>
            </div>

            <button
              onClick={() => selectedProduct && loadMovements(selectedProduct)}
              className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-xl font-bold text-slate-600"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-slate-50">
                <tr>
                  <Th text="Product" />
                  <Th text="Type" />
                  <Th text="Quantity" />
                  <Th text="Previous Stock" />
                  <Th text="New Stock" />
                  <Th text="Reason" />
                  <Th text="Date" />
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="p-10 text-center text-slate-500">
                      Loading stock movements...
                    </td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((m) => (
                    <tr key={m._id} className="border-t border-slate-100 hover:bg-slate-50">
                      <Td>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <Package size={18} />
                          </div>
                          <span className="font-bold">
                            {m.product?.name || "Product"}
                          </span>
                        </div>
                      </Td>

                      <Td>
                        <MovementBadge type={m.type} />
                      </Td>

                      <Td>{m.quantity}</Td>
                      <Td>{m.previousStock}</Td>
                      <Td>{m.newStock}</Td>
                      <Td>{m.reason || "-"}</Td>
                      <Td>{new Date(m.createdAt).toLocaleString()}</Td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="p-10 text-center text-slate-500">
                      No stock movements found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function MovementBadge({ type }) {
  const isIn = ["IN", "RETURN"].includes(type);

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black ${
        isIn
          ? "bg-green-100 text-green-700"
          : "bg-red-100 text-red-700"
      }`}
    >
      {isIn ? <ArrowUpCircle size={14} /> : <ArrowDownCircle size={14} />}
      {type}
    </span>
  );
}

function Stat({ title, value }) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
      <p className="text-slate-500 font-bold">{title}</p>
      <h2 className="text-4xl font-black text-slate-900 mt-3">{value}</h2>
    </div>
  );
}

function Th({ text }) {
  return <th className="p-5 font-black text-slate-600">{text}</th>;
}

function Td({ children }) {
  return <td className="p-5 text-slate-700">{children}</td>;
}