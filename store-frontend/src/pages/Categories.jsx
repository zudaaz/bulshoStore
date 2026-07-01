import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Search, FolderTree, Trash2, Pencil } from "lucide-react";
import DashboardLayout from "../layouts/DashboardLayout";
import api from "../api/client";

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: "", description: "" });

  async function fetchCategories() {
    try {
      const res = await api.get("/categories");
      setCategories(res.data.data || []);
    } catch {
      toast.error("Failed to load categories");
    }
  }

  useEffect(() => {
    fetchCategories();
  }, []);

  function openCreate() {
    setEditingId(null);
    setFormData({ name: "", description: "" });
    setShowModal(true);
  }

  function openEdit(category) {
    setEditingId(category._id);
    setFormData({
      name: category.name || "",
      description: category.description || ""
    });
    setShowModal(true);
  }

  async function saveCategory(e) {
    e.preventDefault();

    try {
      if (editingId) {
        await api.put(`/categories/${editingId}`, formData);
        toast.success("Category updated successfully");
      } else {
        await api.post("/categories", formData);
        toast.success("Category created successfully");
      }

      setShowModal(false);
      setEditingId(null);
      setFormData({ name: "", description: "" });
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save category");
    }
  }

  async function deleteCategory(id) {
    try {
      await api.delete(`/categories/${id}`);
      toast.success("Category deleted");
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete category");
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900">Categories</h1>
            <p className="text-slate-500 mt-1">Manage product categories</p>
          </div>

          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl font-bold shadow-lg"
          >
            <Plus size={18} />
            Add Category
          </button>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search categories..."
              className="w-full bg-slate-100 rounded-2xl pl-12 pr-4 py-4 outline-none"
            />
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-5 font-bold text-slate-600">Category</th>
                <th className="text-left p-5 font-bold text-slate-600">Description</th>
                <th className="text-right p-5 font-bold text-slate-600">Actions</th>
              </tr>
            </thead>

            <tbody>
              {categories.map((category) => (
                <tr key={category._id} className="border-t border-slate-100">
                  <td className="p-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center">
                        <FolderTree size={20} className="text-indigo-600" />
                      </div>
                      <h3 className="font-bold text-slate-800">{category.name}</h3>
                    </div>
                  </td>

                  <td className="p-5 text-slate-500">
                    {category.description || "No description"}
                  </td>

                  <td className="p-5">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => openEdit(category)}
                        className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        onClick={() => deleteCategory(category._id)}
                        className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {categories.length === 0 && (
                <tr>
                  <td colSpan="3" className="text-center py-10 text-slate-500">
                    No categories found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <form onSubmit={saveCategory} className="bg-white rounded-3xl w-full max-w-lg p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-black">
                    {editingId ? "Update Category" : "Add Category"}
                  </h2>
                  <p className="text-slate-500 mt-1">
                    {editingId ? "Edit category details" : "Create a new category"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-slate-400 text-2xl"
                >
                  ×
                </button>
              </div>

              <input
                type="text"
                placeholder="Category name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-100 rounded-2xl px-5 py-4 outline-none mb-4"
              />

              <textarea
                placeholder="Description"
                rows="4"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full bg-slate-100 rounded-2xl px-5 py-4 outline-none resize-none"
              />

              <div className="flex justify-end gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 rounded-2xl bg-slate-100 font-bold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  {editingId ? "Update Category" : "Save Category"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}