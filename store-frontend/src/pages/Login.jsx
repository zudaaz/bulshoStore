import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Store, Mail, LockKeyhole, ArrowRight } from "lucide-react";
import api from "../api/client";
import { clearAuthStorage, saveAuthSession } from "../utils/authStorage";

function decodeJwt(token) {
  try {
    const payload = token.split(".")[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch {
    return {};
  }
}

export default function Login() {
  const [form, setForm] = useState({
    email: "",
    password: ""
  });

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();

    if (!form.email || !form.password) {
      toast.error("Please enter email and password");
      return;
    }

    try {
      setLoading(true);

      const res = await api.post("/auth/login", form);

      const accessToken =
        res.data?.data?.accessToken ||
        res.data?.data?.token ||
        res.data?.accessToken ||
        res.data?.token;

      const refreshToken =
        res.data?.data?.refreshToken ||
        res.data?.refreshToken ||
        "";

      const apiUser =
        res.data?.data?.user ||
        res.data?.user ||
        {};

      if (!accessToken) {
        toast.error("Login token not found");
        return;
      }

      const tokenData = decodeJwt(accessToken);

      const finalPermissions =
        Array.isArray(apiUser.permissions) && apiUser.permissions.length > 0
          ? apiUser.permissions
          : Array.isArray(tokenData.permissions)
          ? tokenData.permissions
          : [];

      const email = apiUser.email || form.email;
      const avatarKey = `profile_avatar_${email}`;

      const userData = {
        _id: apiUser._id || apiUser.id || tokenData.id || "",
        staffProfile: apiUser.staffProfile || null,
        name: apiUser.name || "User",
        email,
        role: apiUser.role || tokenData.role || "staff",
        permissions: finalPermissions,
        storeName: apiUser.storeName || "Bulsho Store",
        phone: apiUser.phone || "",
        address: apiUser.address || "",
        country: apiUser.country || "Somalia",
        timezone: apiUser.timezone || "Africa/Mogadishu",
        avatar: apiUser.avatar || localStorage.getItem(avatarKey) || ""
      };

      clearAuthStorage();
      saveAuthSession({ accessToken, refreshToken, user: userData });

      if (userData.avatar) {
        localStorage.setItem(avatarKey, userData.avatar);
      }

      toast.success("Login successful");

      if (
        userData.role === "admin" ||
        userData.role === "manager" ||
        userData.permissions.includes("view_dashboard")
      ) {
        navigate("/");
      } else if (userData.permissions.includes("view_sales")) {
        navigate("/sales");
      } else if (userData.permissions.includes("view_products")) {
        navigate("/products");
      } else if (userData.permissions.includes("view_customers")) {
        navigate("/customers");
      } else if (userData.permissions.includes("view_reports")) {
        navigate("/reports");
      } else {
        navigate("/profile");
      }
    } catch (err) {
      console.log(err);
      toast.error(err.response?.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#f8fafc]">
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-[#071B34] via-[#0B2545] to-[#0E7490] items-center justify-center">
        <div className="absolute top-[-120px] left-[-120px] w-[420px] h-[420px] rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-120px] w-[350px] h-[350px] rounded-full bg-[#F4B740]/20 blur-3xl" />

        <div className="relative z-10 max-w-xl px-10 text-white">
          <div className="w-24 h-24 rounded-[2rem] bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-2xl mb-8">
            <Store size={46} className="text-[#F4B740]" />
          </div>

          <h1 className="text-6xl font-black leading-tight">
            Smart Store
            <span className="block text-[#F4B740]">
              Management System
            </span>
          </h1>

          <p className="mt-7 text-lg text-white/75 leading-8">
            Manage inventory, POS, customers, suppliers, analytics, reports,
            and sales professionally from one powerful dashboard.
          </p>

          <div className="flex gap-4 mt-10">
            <div className="px-5 py-3 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-xl">
              <p className="text-sm text-white/60">Inventory</p>
              <h3 className="font-black mt-1">Management</h3>
            </div>

            <div className="px-5 py-3 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-xl">
              <p className="text-sm text-white/60">POS</p>
              <h3 className="font-black mt-1">Sales System</h3>
            </div>

            <div className="px-5 py-3 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-xl">
              <p className="text-sm text-white/60">Reports</p>
              <h3 className="font-black mt-1">Analytics</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-md bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_20px_70px_rgba(15,23,42,0.08)] p-8 md:p-10"
        >
          <div className="text-center">
            <div className="mx-auto w-20 h-20 rounded-[2rem] bg-gradient-to-br from-[#0B2545] to-[#0E7490] flex items-center justify-center shadow-xl">
              <Store size={34} className="text-white" />
            </div>

            <h2 className="text-4xl font-black text-slate-900 mt-6">
              Welcome Back
            </h2>

            <p className="text-slate-500 mt-3">
              Login to your professional dashboard
            </p>
          </div>

          <div className="space-y-5 mt-8">
            <div>
              <label className="text-sm font-bold text-slate-600">
                Email Address
              </label>

              <div className="relative mt-2">
                <Mail
                  size={18}
                  className="absolute left-4 top-4 text-slate-400"
                />

                <input
                  type="email"
                  placeholder="Enter email"
                  required
                  value={form.email}
                  className="w-full h-14 rounded-2xl bg-slate-100 border border-transparent pl-12 pr-4 outline-none focus:ring-2 focus:ring-[#0E7490] focus:border-[#0E7490]"
                  onChange={(e) =>
                    setForm({
                      ...form,
                      email: e.target.value
                    })
                  }
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-600">
                Password
              </label>

              <div className="relative mt-2">
                <LockKeyhole
                  size={18}
                  className="absolute left-4 top-4 text-slate-400"
                />

                <input
                  type="password"
                  placeholder="Enter password"
                  required
                  value={form.password}
                  className="w-full h-14 rounded-2xl bg-slate-100 border border-transparent pl-12 pr-4 outline-none focus:ring-2 focus:ring-[#0E7490] focus:border-[#0E7490]"
                  onChange={(e) =>
                    setForm({
                      ...form,
                      password: e.target.value
                    })
                  }
                />
              </div>
            </div>

            <div className="text-right">
              <Link to="/forgot-password" className="text-sm font-bold text-[#0E7490] hover:underline">
                Forgot password?
              </Link>
            </div>
          </div>

          <button
            disabled={loading}
            className="w-full mt-8 h-14 rounded-2xl bg-gradient-to-r from-[#0B2545] to-[#0E7490] hover:opacity-90 disabled:opacity-60 text-white font-black shadow-xl flex items-center justify-center gap-2 transition"
          >
            {loading ? (
              "Signing in..."
            ) : (
              <>
                Sign In
                <ArrowRight size={18} />
              </>
            )}
          </button>

          <p className="text-center mt-6 text-sm text-slate-600">
            Don&apos;t have an account?{" "}
            <Link
              to="/signup"
              className="font-black text-[#0E7490] hover:underline"
            >
              Create Account
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}