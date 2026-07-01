import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/client";
import { clearAuthStorage, saveAuthSession } from "../utils/authStorage";

export default function Signup() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: ""
  });

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSignup(e) {
    e.preventDefault();

    if (!form.name || !form.email || !form.password) {
      toast.error("Please fill all fields");
      return;
    }

    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    try {
      setLoading(true);

      clearAuthStorage();

      const res = await api.post("/auth/register", form);

      const token =
        res.data?.data?.accessToken ||
        res.data?.data?.token ||
        res.data?.token ||
        "";

      const user =
        res.data?.data?.user ||
        res.data?.user ||
        {
          name: form.name,
          email: form.email,
          role: "admin"
        };

      if (token) {
        const avatarKey = `profile_avatar_${user.email || form.email}`;

        const userData = {
          _id: user._id || user.id || "",
          name: user.name || form.name,
          email: user.email || form.email,
          role: user.role || "admin",
          storeName: user.storeName || "Bulsho Store",
          phone: user.phone || "",
          address: user.address || "",
          country: user.country || "Somalia",
          timezone: user.timezone || "Africa/Mogadishu",
          avatar: user.avatar || localStorage.getItem(avatarKey) || ""
        };

        saveAuthSession({ accessToken: token, user: userData });

        if (userData.avatar) {
          localStorage.setItem(avatarKey, userData.avatar);
        }

        toast.success("Account created successfully");
        navigate("/");
      } else {
        toast.success("Account created successfully");
        navigate("/login");
      }
    } catch (err) {
      console.log(err);
      toast.error(err.response?.data?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-[#0B2545] via-[#0E7490] to-[#F4B740] items-center justify-center relative overflow-hidden">
        <div className="absolute top-[-120px] left-[-120px] w-[420px] h-[420px] rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-120px] w-[350px] h-[350px] rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 text-white max-w-lg text-center px-10">
          <h1 className="text-6xl font-black leading-tight">
            CREATE YOUR STORE
          </h1>

          <p className="mt-6 text-lg text-white/80 leading-8">
            Start managing inventory, POS, customers, reports, suppliers,
            expenses, and analytics professionally.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center bg-[#f8fafc] px-6 py-10">
        <form
          onSubmit={handleSignup}
          className="w-full max-w-md bg-white p-8 md:p-10 rounded-[2rem] shadow-2xl border border-slate-100"
        >
          <div className="text-center mb-8">
            <h2 className="text-4xl font-black text-slate-900">
              Sign Up
            </h2>

            <p className="text-slate-500 mt-3">
              Create your professional store account
            </p>
          </div>

          <div className="space-y-5">
            <input
              type="text"
              placeholder="Full Name"
              required
              value={form.name}
              className="w-full p-4 rounded-2xl bg-slate-100 outline-none focus:ring-2 focus:ring-[#0E7490]"
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value
                })
              }
            />

            <input
              type="email"
              placeholder="Email Address"
              required
              value={form.email}
              className="w-full p-4 rounded-2xl bg-slate-100 outline-none focus:ring-2 focus:ring-[#0E7490]"
              onChange={(e) =>
                setForm({
                  ...form,
                  email: e.target.value
                })
              }
            />

            <input
              type="password"
              placeholder="Password"
              required
              value={form.password}
              className="w-full p-4 rounded-2xl bg-slate-100 outline-none focus:ring-2 focus:ring-[#0E7490]"
              onChange={(e) =>
                setForm({
                  ...form,
                  password: e.target.value
                })
              }
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-7 bg-gradient-to-r from-[#0B2545] to-[#0E7490] hover:opacity-90 disabled:opacity-60 text-white py-4 rounded-2xl font-black shadow-xl transition"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>

          <p className="text-center mt-6 text-sm text-slate-600">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-[#0E7490] font-black hover:underline"
            >
              Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}