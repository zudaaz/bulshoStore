import { useEffect, useState } from "react";
import { CheckCircle2, CircleHelp, Database, ExternalLink, RefreshCw, Server, Settings, ShieldCheck, WifiOff } from "lucide-react";
import { Link } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import api, { API_BASE_URL } from "../api/client";

export default function Support() {
  const [health, setHealth] = useState({ loading: true, online: false, data: null });

  async function checkHealth() {
    setHealth({ loading: true, online: false, data: null });
    try {
      const response = await api.get("/health");
      setHealth({ loading: false, online: true, data: response.data });
    } catch {
      setHealth({ loading: false, online: false, data: null });
    }
  }

  useEffect(() => { checkHealth(); }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <section className="rounded-[2rem] bg-gradient-to-br from-[#071B34] via-[#0B5D7A] to-[#0E7490] p-7 text-white shadow-xl md:p-9">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-200">Help & Diagnostics</p>
          <h1 className="mt-2 text-3xl font-black md:text-4xl">System Support</h1>
          <p className="mt-3 max-w-2xl leading-7 text-cyan-50/80">Check API connectivity, review setup guidance, and find the main administrative controls for this inventory system.</p>
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
            <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-bold text-slate-500">Backend status</p><h2 className="mt-1 text-2xl font-black">API Health Check</h2></div><button onClick={checkHealth} disabled={health.loading} className="btn-secondary flex items-center gap-2"><RefreshCw className={health.loading ? "animate-spin" : ""} size={17} /> Recheck</button></div>
            <div className={`mt-6 flex items-start gap-4 rounded-2xl p-5 ${health.online ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/35 dark:text-emerald-200" : "bg-rose-50 text-rose-800 dark:bg-rose-950/35 dark:text-rose-200"}`}>{health.online ? <CheckCircle2 size={28} /> : <WifiOff size={28} />}<div><p className="font-black">{health.loading ? "Checking connection..." : health.online ? "API is online" : "API is unavailable"}</p><p className="mt-1 text-sm opacity-80">{health.online ? `Uptime: ${Math.round(Number(health.data?.uptime || 0))} seconds` : `Verify that the backend is running and VITE_API_URL points to ${API_BASE_URL}.`}</p></div></div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300"><ShieldCheck /></div><h2 className="mt-5 text-xl font-black">Security reminder</h2><p className="mt-2 text-sm leading-6 text-slate-500">Use unique production secrets, restrict CORS origins, create least-privilege staff roles, and never commit a real .env file.</p></div>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <SupportCard icon={Server} title="Start the applications" text="Run npm install and npm run dev in both backend and frontend folders. Supabase PostgreSQL must be configured before starting the API." />
          <SupportCard icon={Database} title="Database and backups" text="Use the provided seed command for the initial administrator. Use Supabase backups and recovery settings appropriate for your deployment plan." />
          <SupportCard icon={Settings} title="Business settings" text="Configure store identity, currency, tax, receipt information, language, and appearance from the settings page." link="/settings" linkText="Open Settings" />
          <SupportCard icon={CircleHelp} title="Authentication problems" text="Confirm the API URL, account status, access token, refresh token, and assigned permissions. Re-login after changing a role." link="/profile" linkText="Open Profile" />
          <SupportCard icon={ExternalLink} title="External integrations" text="SMS and production password-reset delivery require provider credentials. The core system works without them and returns a clear configuration error." />
        </section>
      </div>
    </DashboardLayout>
  );
}

function SupportCard({ icon: Icon, title, text, link, linkText }) {
  return <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"><Icon size={22} /></div><h2 className="mt-5 text-xl font-black">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>{link && <Link to={link} className="mt-5 inline-flex items-center gap-2 font-black text-cyan-700 hover:text-cyan-900">{linkText} <ExternalLink size={15} /></Link>}</article>;
}
