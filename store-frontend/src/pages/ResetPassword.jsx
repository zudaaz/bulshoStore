import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { LockKeyhole } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api/client";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (form.password !== form.confirmPassword) return toast.error("Passwords do not match");
    try {
      setLoading(true);
      await api.post(`/auth/reset-password/${token}`, { password: form.password });
      toast.success("Password reset successfully");
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to reset password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-12 flex items-center justify-center">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700"><LockKeyhole size={30} /></div>
        <h1 className="mt-5 text-center text-3xl font-black text-slate-900">Choose a new password</h1>
        <p className="mt-2 text-center text-sm text-slate-500">Use at least eight characters with uppercase, lowercase, and a number.</p>
        <div className="mt-7 space-y-4">
          <input type="password" required minLength="8" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="h-13 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-cyan-600" placeholder="New password" />
          <input type="password" required minLength="8" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} className="h-13 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-cyan-600" placeholder="Confirm password" />
        </div>
        <button disabled={loading} className="mt-6 w-full rounded-2xl bg-[#0E7490] py-3.5 font-black text-white disabled:opacity-60">{loading ? "Saving..." : "Save new password"}</button>
        <Link to="/login" className="mt-5 block text-center text-sm font-bold text-cyan-700">Back to login</Link>
      </form>
    </div>
  );
}
