import { Bell, Search, UserCircle } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="h-20 bg-white/80 backdrop-blur-xl border-b border-slate-200 px-6 flex items-center justify-between">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Dashboard</h2>
        <p className="text-sm text-slate-500">Welcome back, System Admin</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-2xl">
          <Search size={18} className="text-slate-400" />
          <input
            className="bg-transparent outline-none text-sm"
            placeholder="Search..."
          />
        </div>

        <button className="p-3 rounded-2xl bg-slate-100 hover:bg-slate-200">
          <Bell size={20} />
        </button>

        <button className="flex items-center gap-2 bg-slate-950 text-white px-4 py-2 rounded-2xl">
          <UserCircle size={20} />
          Admin
        </button>

        <button
          onClick={() => {
            localStorage.removeItem("token");
            window.location.href = "/login";
          }}
          className="bg-red-500 text-white px-4 py-2 rounded-2xl hover:bg-red-600"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}