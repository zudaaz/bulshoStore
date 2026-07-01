import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, KeyRound } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api/client";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState("");

  async function submit(event) {
    event.preventDefault();
    try {
      setLoading(true);
      const { data } = await api.post("/auth/forgot-password", { email });
      setResetToken(data?.data?.developmentResetToken || "");
      toast.success(data.message || "Reset instructions generated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to request password reset");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-12 flex items-center justify-center">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
          <KeyRound size={30} />
        </div>
        <h1 className="mt-5 text-center text-3xl font-black text-slate-900">Reset password</h1>
        <p className="mt-2 text-center text-sm text-slate-500">Enter your account email to generate a secure reset link.</p>
        <label className="mt-7 block text-sm font-bold text-slate-700">Email address</label>
        <div className="relative mt-2">
          <Mail className="absolute left-4 top-4 text-slate-400" size={18} />
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-13 w-full rounded-2xl border border-slate-200 pl-11 pr-4 outline-none focus:border-cyan-600" placeholder="you@example.com" />
        </div>
        <button disabled={loading} className="mt-6 w-full rounded-2xl bg-[#0E7490] py-3.5 font-black text-white disabled:opacity-60">
          {loading ? "Generating..." : "Generate reset link"}
        </button>
        {resetToken && (
          <Link to={`/reset-password/${resetToken}`} className="mt-4 block rounded-2xl bg-amber-50 p-4 text-center text-sm font-bold text-amber-800">
            Development mode: continue to reset password
          </Link>
        )}
        <Link to="/login" className="mt-6 flex items-center justify-center gap-2 text-sm font-bold text-cyan-700"><ArrowLeft size={16} /> Back to login</Link>
      </form>
    </div>
  );
}
