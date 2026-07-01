import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import {
  UserCircle,
  Phone,
  ShieldCheck,
  Store,
  Camera,
  Save,
  LogOut,
  UserCog,
  MapPin,
  Globe,
  Clock3,
  Mail,
  Building2,
  Sparkles,
  LockKeyhole,
  CheckCircle2
} from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";
import api from "../api/client";

const roles = ["admin", "manager", "cashier", "accountant", "store_keeper"];

const defaultUser = {
  _id: "",
  name: "Admin User",
  email: "admin@bulsho.store",
  phone: "",
  role: "admin",
  storeName: "Bulsho Store",
  address: "",
  country: "Somalia",
  timezone: "Africa/Mogadishu",
  avatar: ""
};

function getAvatarKey(email) {
  return `profile_avatar_${email}`;
}

export default function Profile() {
  const [user, setUser] = useState(defaultUser);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);

      const savedUser = JSON.parse(localStorage.getItem("user") || "{}");

      const res = await api.get("/auth/me");

      const profile =
        res.data?.data?.user ||
        res.data?.data ||
        res.data?.user ||
        {};

      const email = profile.email || savedUser.email || "admin@bulsho.store";
      const avatarKey = getAvatarKey(email);
      const savedAvatar = localStorage.getItem(avatarKey) || "";

      const formattedUser = {
        ...defaultUser,
        _id: profile._id || profile.id || savedUser._id || "",
        name: profile.name || savedUser.name || "Admin User",
        email,
        phone: profile.phone || savedUser.phone || "",
        role: profile.role || savedUser.role || "admin",
        storeName: profile.storeName || savedUser.storeName || "Bulsho Store",
        address: profile.address || savedUser.address || "",
        country: profile.country || savedUser.country || "Somalia",
        timezone: profile.timezone || savedUser.timezone || "Africa/Mogadishu",
        avatar: profile.avatar || profile.image || savedAvatar || ""
      };

      setUser(formattedUser);
      localStorage.setItem("user", JSON.stringify(formattedUser));

      if (formattedUser.avatar) {
        localStorage.setItem(avatarKey, formattedUser.avatar);
      }

      window.dispatchEvent(new Event("profile-updated"));
    } catch (err) {
      console.log(err);

      const savedUser = JSON.parse(localStorage.getItem("user") || "{}");
      const email = savedUser.email || "admin@bulsho.store";
      const avatarKey = getAvatarKey(email);
      const savedAvatar = localStorage.getItem(avatarKey) || "";

      setUser({
        ...defaultUser,
        ...savedUser,
        email,
        avatar: savedUser.avatar || savedAvatar || ""
      });

      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile(e) {
    e.preventDefault();

    try {
      setSavingProfile(true);

      const oldEmail = user.email;
      const oldAvatarKey = getAvatarKey(oldEmail);

      const payload = {
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        storeName: user.storeName,
        address: user.address,
        country: user.country,
        timezone: user.timezone,
        avatar: user.avatar
      };

      const res = await api.put("/auth/profile", payload);

      const updated =
        res.data?.data?.user ||
        res.data?.data ||
        res.data?.user ||
        payload;

      const updatedEmail = updated.email || user.email;
      const updatedAvatarKey = getAvatarKey(updatedEmail);

      const updatedUser = {
        ...user,
        ...updated,
        email: updatedEmail,
        avatar: updated.avatar || user.avatar || ""
      };

      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));

      if (updatedUser.avatar) {
        localStorage.setItem(updatedAvatarKey, updatedUser.avatar);
        localStorage.removeItem(oldAvatarKey);
      }

      localStorage.setItem("login_email", updatedUser.email);
      window.dispatchEvent(new Event("profile-updated"));

      toast.success("Profile updated successfully");
    } catch (err) {
      console.log(err);
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  }

  function changeAvatar(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      const avatarKey = getAvatarKey(user.email);

      const updatedUser = {
        ...user,
        avatar: reader.result
      };

      setUser(updatedUser);

      localStorage.setItem("user", JSON.stringify(updatedUser));
      localStorage.setItem(avatarKey, reader.result);

      window.dispatchEvent(new Event("profile-updated"));

      toast.success("Profile photo updated");
    };

    reader.readAsDataURL(file);
  }

  async function changePassword(e) {
    e.preventDefault();

    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      toast.error("Please fill all password fields");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      setSavingPassword(true);

      await api.put("/auth/change-password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });

      toast.success("Password updated successfully");
    } catch (err) {
      console.log(err);
      toast.error(err.response?.data?.message || "Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    toast.success("Logged out");

    setTimeout(() => {
      window.location.href = "/login";
    }, 500);
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-7">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#0F172A] via-[#1E3A8A] to-[#4F46E5] p-7 text-white shadow-2xl">
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl" />

          <div className="relative z-10 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
            <div className="flex items-center gap-5">
              <Avatar user={user} onChange={changeAvatar} large />

              <div>
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-yellow-300" />
                  <span className="text-sm font-bold text-white/70 uppercase tracking-widest">
                    Admin Profile
                  </span>
                </div>

                <h1 className="text-4xl font-black mt-2">{user.name}</h1>
                <p className="text-white/70 mt-2">{user.email}</p>

                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="px-4 py-1 rounded-full bg-white/10 border border-white/10 text-sm font-bold">
                    {user.role}
                  </span>

                  <span className="px-4 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/20 text-sm font-bold text-emerald-200">
                    Active Account
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              className="bg-red-500 hover:bg-red-600 px-6 py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-xl transition"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          <StatCard
            title="Role"
            value={user.role}
            icon={ShieldCheck}
            color="from-violet-500 to-indigo-600"
          />

          <StatCard
            title="Store"
            value={user.storeName}
            icon={Store}
            color="from-cyan-500 to-blue-600"
          />

          <StatCard
            title="Status"
            value="Verified"
            icon={CheckCircle2}
            color="from-emerald-500 to-green-600"
          />

          <StatCard
            title="Timezone"
            value="GMT +3"
            icon={Clock3}
            color="from-orange-500 to-red-500"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm">
            <div className="flex flex-col items-center text-center mb-6">
              <Avatar user={user} onChange={changeAvatar} />

              <h2 className="text-3xl font-black text-slate-900 mt-5">
                {user.name}
              </h2>

              <p className="text-slate-500 mt-1">{user.email}</p>
            </div>

            <h3 className="text-2xl font-black text-slate-900 mb-5">
              Account Overview
            </h3>

            <div className="space-y-4">
              <InfoRow icon={UserCircle} label="Full Name" value={user.name} />
              <InfoRow icon={Mail} label="Email" value={user.email} />
              <InfoRow
                icon={Phone}
                label="Phone"
                value={user.phone || "Not added"}
              />
              <InfoRow icon={ShieldCheck} label="Role" value={user.role} />
              <InfoRow icon={Building2} label="Store" value={user.storeName} />
              <InfoRow
                icon={MapPin}
                label="Address"
                value={user.address || "Not added"}
              />
              <InfoRow icon={Globe} label="Country" value={user.country} />
            </div>
          </div>

          <form
            onSubmit={updateProfile}
            className="xl:col-span-2 bg-white rounded-[2rem] p-6 md:p-8 border border-slate-200 shadow-sm"
          >
            <div className="mb-8">
              <h2 className="text-3xl font-black text-slate-900">
                Edit Profile
              </h2>

              <p className="text-slate-500 mt-2">
                Update profile and store information
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input
                label="Full Name"
                value={user.name}
                onChange={(v) => setUser({ ...user, name: v })}
              />

              <Input
                label="Email Address"
                type="email"
                value={user.email}
                onChange={(v) => setUser({ ...user, email: v })}
              />

              <Input
                label="Phone Number"
                value={user.phone}
                onChange={(v) => setUser({ ...user, phone: v })}
              />

              <div>
                <label className="text-sm font-bold text-slate-600">
                  Role
                </label>

                <select
                  value={user.role}
                  onChange={(e) =>
                    setUser({ ...user, role: e.target.value })
                  }
                  className="w-full mt-2 px-4 py-4 rounded-2xl bg-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Store Name"
                value={user.storeName}
                onChange={(v) => setUser({ ...user, storeName: v })}
              />

              <Input
                label="Country"
                value={user.country}
                onChange={(v) => setUser({ ...user, country: v })}
              />

              <div className="md:col-span-2">
                <label className="text-sm font-bold text-slate-600">
                  Store Address
                </label>

                <textarea
                  rows="4"
                  value={user.address}
                  onChange={(e) =>
                    setUser({ ...user, address: e.target.value })
                  }
                  className="w-full mt-2 px-4 py-4 rounded-2xl bg-slate-100 outline-none resize-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end mt-8">
              <button
                disabled={savingProfile}
                className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-90 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 shadow-xl disabled:opacity-60"
              >
                <Save size={18} />
                {savingProfile ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </form>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <form
            onSubmit={changePassword}
            className="xl:col-span-2 bg-white rounded-[2rem] p-6 md:p-8 border border-slate-200 shadow-sm"
          >
            <div className="mb-8">
              <h2 className="text-3xl font-black text-slate-900">
                Security Settings
              </h2>

              <p className="text-slate-500 mt-2">
                Update password and account security
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Input
                label="Current Password"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(v) =>
                  setPasswordForm({
                    ...passwordForm,
                    currentPassword: v
                  })
                }
              />

              <Input
                label="New Password"
                type="password"
                value={passwordForm.newPassword}
                onChange={(v) =>
                  setPasswordForm({
                    ...passwordForm,
                    newPassword: v
                  })
                }
              />

              <Input
                label="Confirm Password"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(v) =>
                  setPasswordForm({
                    ...passwordForm,
                    confirmPassword: v
                  })
                }
              />
            </div>

            <div className="flex justify-end mt-8">
              <button
                disabled={savingPassword}
                className="bg-slate-950 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 shadow-xl disabled:opacity-60"
              >
                <LockKeyhole size={18} />
                {savingPassword ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>

          <div className="bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#312E81] text-white rounded-[2rem] p-6 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-xl">
              <UserCog size={32} />
            </div>

            <h2 className="text-3xl font-black mt-6">Permissions</h2>

            <p className="text-white/70 mt-4 leading-7">
              This account has full administrative access to the POS system and
              inventory management platform.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {[
                "Dashboard",
                "POS",
                "Sales",
                "Products",
                "Customers",
                "Suppliers",
                "Reports",
                "Expenses",
                "Settings",
                "Analytics"
              ].map((item) => (
                <span
                  key={item}
                  className="px-3 py-2 rounded-full bg-white/10 border border-white/10 text-xs font-black"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function Avatar({ user, onChange, large = false }) {
  return (
    <div className="relative">
      <div
        className={`rounded-full overflow-hidden flex items-center justify-center ${
          large
            ? "w-28 h-28 bg-white/10 border-4 border-white/20 backdrop-blur-xl"
            : "w-36 h-36 bg-gradient-to-br from-indigo-100 to-violet-100"
        }`}
      >
        {user.avatar ? (
          <img
            src={user.avatar}
            alt="avatar"
            className="w-full h-full object-cover"
          />
        ) : (
          <UserCircle
            size={large ? 90 : 100}
            className={large ? "text-white" : "text-indigo-600"}
          />
        )}
      </div>

      <label
        className={`absolute bottom-0 right-0 rounded-full flex items-center justify-center cursor-pointer shadow-xl ${
          large
            ? "w-11 h-11 bg-white text-indigo-700"
            : "w-12 h-12 bg-indigo-600 text-white"
        }`}
      >
        <Camera size={18} />

        <input
          type="file"
          accept="image/*"
          onChange={onChange}
          className="hidden"
        />
      </label>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 bg-slate-50 rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
          <Icon size={18} />
        </div>

        <span className="font-bold text-slate-500">{label}</span>
      </div>

      <span className="font-black text-slate-800 text-sm text-right">
        {value}
      </span>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-slate-500 text-sm">{title}</p>

          <h2 className="text-2xl font-black text-slate-900 mt-2 truncate">
            {value}
          </h2>
        </div>

        <div
          className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${color} text-white flex items-center justify-center shadow-lg`}
        >
          <Icon size={28} />
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="text-sm font-bold text-slate-600">{label}</label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-2 px-4 py-4 rounded-2xl bg-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}