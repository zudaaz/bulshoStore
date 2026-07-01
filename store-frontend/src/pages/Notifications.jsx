import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CheckCircle,
  Filter,
  Inbox,
  Info,
  Search,
  Trash2,
  XCircle
} from "lucide-react";
import DashboardLayout from "../layouts/DashboardLayout";
import api from "../api/client";

const iconMap = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
  info: Info
};

const typeStyles = {
  success: "border-emerald-100 bg-emerald-50 text-emerald-700",
  warning: "border-amber-100 bg-amber-50 text-amber-700",
  error: "border-red-100 bg-red-50 text-red-700",
  info: "border-blue-100 bg-blue-50 text-blue-700"
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  async function loadNotifications() {
    try {
      setLoading(true);
      const response = await api.get("/notifications", { params: { limit: 100 } });
      const payload = response.data?.data || {};
      setNotifications(Array.isArray(payload.notifications) ? payload.notifications : []);
      setUnreadCount(Number(payload.unreadCount || 0));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadNotifications();
  }, []);

  async function markRead(id) {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((items) =>
        items.map((item) =>
          item._id === id ? { ...item, isRead: true, readAt: new Date().toISOString() } : item
        )
      );
      setUnreadCount((count) => Math.max(count - 1, 0));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to mark notification as read");
    }
  }

  async function markAllRead() {
    try {
      await api.put("/notifications/mark-all-read");
      setNotifications((items) =>
        items.map((item) => ({ ...item, isRead: true, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update notifications");
    }
  }

  async function deleteNotification(id) {
    if (!window.confirm("Delete this notification?")) return;
    try {
      const target = notifications.find((item) => item._id === id);
      await api.delete(`/notifications/${id}`);
      setNotifications((items) => items.filter((item) => item._id !== id));
      if (target && !target.isRead) setUnreadCount((count) => Math.max(count - 1, 0));
      toast.success("Notification deleted");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete notification");
    }
  }

  const filteredNotifications = useMemo(() => {
    const query = search.trim().toLowerCase();
    return notifications.filter((item) => {
      const searchable = `${item.title || ""} ${item.message || ""} ${item.module || ""}`.toLowerCase();
      const matchesFilter =
        filter === "all" ||
        (filter === "unread" && !item.isRead) ||
        (filter === "read" && item.isRead) ||
        item.type === filter;
      return searchable.includes(query) && matchesFilter;
    });
  }, [notifications, search, filter]);

  const stats = useMemo(
    () => ({
      total: notifications.length,
      unread: unreadCount,
      read: notifications.filter((item) => item.isRead).length,
      warnings: notifications.filter((item) => item.type === "warning").length
    }),
    [notifications, unreadCount]
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <section className="rounded-[2rem] bg-gradient-to-r from-[#071634] via-[#0b6280] to-[#6157ff] p-7 text-white shadow-xl">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/15 p-3"><Bell size={26} /></div>
              <div>
                <h1 className="text-3xl font-black">Notifications</h1>
                <p className="mt-1 text-sm text-blue-100">Stock alerts, payments, sales, and important system activity.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={markAllRead}
              disabled={unreadCount === 0}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-blue-700 shadow-lg transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CheckCheck size={18} /> Mark All Read
            </button>
          </div>
        </section>

        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Total", stats.total, "text-slate-900 dark:text-white"],
            ["Unread", stats.unread, "text-blue-600"],
            ["Read", stats.read, "text-emerald-600"],
            ["Warnings", stats.warnings, "text-amber-600"]
          ].map(([label, value, className]) => (
            <div key={label} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm text-slate-500">{label}</p>
              <h3 className={`mt-1 text-3xl font-black ${className}`}>{value}</h3>
            </div>
          ))}
        </section>

        <section className="rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 lg:flex-row">
            <label className="flex flex-1 items-center gap-3 rounded-2xl bg-slate-100 px-4 py-3 dark:bg-slate-800">
              <Search size={18} className="text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search notifications..." className="w-full bg-transparent text-sm outline-none dark:text-white" />
            </label>
            <label className="flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 dark:bg-slate-800">
              <Filter size={18} className="text-slate-400" />
              <select value={filter} onChange={(event) => setFilter(event.target.value)} className="bg-transparent text-sm font-semibold outline-none dark:text-white">
                <option value="all">All</option><option value="unread">Unread</option><option value="read">Read</option>
                <option value="info">Info</option><option value="success">Success</option><option value="warning">Warning</option><option value="error">Error</option>
              </select>
            </label>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {loading ? (
            <div className="py-24 text-center text-slate-500">Loading notifications...</div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center py-24 text-center">
              <div className="rounded-full bg-blue-50 p-6 text-blue-600"><Inbox size={42} /></div>
              <h2 className="mt-4 text-xl font-black text-slate-800 dark:text-white">No notifications found</h2>
              <p className="mt-2 max-w-md text-sm text-slate-500">New operational and inventory alerts will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredNotifications.map((item) => {
                const Icon = iconMap[item.type] || Info;
                return (
                  <article key={item._id} className={`flex flex-col justify-between gap-4 rounded-3xl border p-5 lg:flex-row ${item.isRead ? "border-slate-200 dark:border-slate-700" : "border-blue-200 bg-blue-50/70 dark:bg-blue-950/20"}`}>
                    <div className="flex gap-4">
                      <div className="h-fit rounded-2xl bg-white p-3 shadow-sm dark:bg-slate-800"><Icon className="h-5 w-5 text-blue-600" /></div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-black text-slate-900 dark:text-white">{item.title}</h3>
                          {!item.isRead && <span className="rounded-full bg-blue-600 px-2 py-1 text-[10px] font-bold text-white">NEW</span>}
                          <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${typeStyles[item.type] || typeStyles.info}`}>{item.type || "info"}</span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.message}</p>
                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400"><span>{new Date(item.createdAt).toLocaleString()}</span>{item.module && <span>Module: {item.module}</span>}</div>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {!item.isRead && <button type="button" onClick={() => markRead(item._id)} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700">Mark Read</button>}
                      <button type="button" onClick={() => deleteNotification(item._id)} className="rounded-xl bg-red-50 p-2 text-red-600 hover:bg-red-100"><Trash2 size={16} /></button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
