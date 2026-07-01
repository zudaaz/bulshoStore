import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Save,
  Store,
  Upload,
  DollarSign,
  Receipt,
  Globe,
  Moon,
  ShieldCheck,
  Database,
  Percent,
  MapPin,
  Phone,
  Mail,
  Loader2,
  Activity
} from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";
import api, { getAssetUrl } from "../api/client";

const MAX_LOGO_SIZE = 5 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = ["image/jpeg", "image/png", "image/webp"];

const defaultSettings = {
  storeName: "Bulsho Store",
  logo: "",
  email: "admin@bulsho.store",
  phone: "",
  address: "",
  currency: "USD",
  taxRate: 0,
  language: "English",
  darkMode: false,
  maintenanceMode: false,
  receiptFooter: "Thank you for shopping with us.",
  backupEnabled: true
};

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return String(value).toLowerCase() === "true";
}

function getLogoUrl(logo) {
  if (!logo) return "";

  if (
    logo.startsWith("data:") ||
    logo.startsWith("blob:") ||
    logo.startsWith("http://") ||
    logo.startsWith("https://")
  ) {
    return logo;
  }

  return getAssetUrl(logo);
}

function normalizeSettings(data = {}) {
  const parsedTaxRate = Number(data.taxRate ?? data.tax ?? 0);

  return {
    ...defaultSettings,
    ...data,
    storeName:
      data.storeName ??
      data.businessName ??
      defaultSettings.storeName,
    logo:
      data.storeLogo ??
      data.logo ??
      data.businessLogo ??
      defaultSettings.logo,
    email:
      data.storeEmail ??
      data.email ??
      defaultSettings.email,
    phone:
      data.storePhone ??
      data.phone ??
      defaultSettings.phone,
    address:
      data.storeAddress ??
      data.address ??
      defaultSettings.address,
    currency:
      data.currency ??
      defaultSettings.currency,
    taxRate: Number.isFinite(parsedTaxRate) ? parsedTaxRate : 0,
    language:
      data.language ??
      defaultSettings.language,
    darkMode: toBoolean(
      data.darkMode,
      defaultSettings.darkMode
    ),
    maintenanceMode: toBoolean(
      data.maintenanceMode,
      defaultSettings.maintenanceMode
    ),
    receiptFooter:
      data.receiptFooter ??
      defaultSettings.receiptFooter,
    backupEnabled:
      data.backupEnabled === undefined
        ? defaultSettings.backupEnabled
        : toBoolean(data.backupEnabled, true)
  };
}

function getSettingsData(response) {
  return (
    response?.data?.data ??
    response?.data?.settings ??
    response?.data ??
    {}
  );
}

function applyGlobalSettings(finalSettings) {
  localStorage.setItem(
    "store_settings",
    JSON.stringify(finalSettings)
  );

  localStorage.setItem(
    "app_currency",
    finalSettings.currency || "USD"
  );

  localStorage.setItem(
    "app_language",
    finalSettings.language || "English"
  );

  if (finalSettings.darkMode === true) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }

  window.dispatchEvent(
    new CustomEvent("settings-updated", {
      detail: finalSettings
    })
  );
}

export default function Settings() {
  const [settings, setSettings] = useState(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (!settings.backupEnabled) return undefined;

    const interval = setInterval(() => {
      localStorage.setItem(
        "auto_backup",
        JSON.stringify({
          settings,
          user: JSON.parse(
            localStorage.getItem("user") || "{}"
          ),
          createdAt: new Date().toISOString()
        })
      );
    }, 60000);

    return () => clearInterval(interval);
  }, [settings]);

  useEffect(() => {
    return () => {
      if (logoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [logoPreview]);

  async function loadSettings() {
    try {
      setLoading(true);

      const response = await api.get("/settings");
      const formatted = normalizeSettings(
        getSettingsData(response)
      );

      setSettings(formatted);
      setLogoError(false);
      applyGlobalSettings(formatted);
    } catch (error) {
      console.error("LOAD SETTINGS ERROR:", error);

      const saved = localStorage.getItem("store_settings");

      if (saved) {
        try {
          const localSettings = normalizeSettings(
            JSON.parse(saved)
          );

          setSettings(localSettings);
          applyGlobalSettings(localSettings);
        } catch {
          setSettings(defaultSettings);
          applyGlobalSettings(defaultSettings);
        }
      } else {
        setSettings(defaultSettings);
        applyGlobalSettings(defaultSettings);
      }

      toast.error(
        error.response?.data?.message ||
          "Failed to load settings"
      );
    } finally {
      setLoading(false);
    }
  }

  function updateField(key, value) {
    setSettings((current) => {
      const updated = normalizeSettings({
        ...current,
        [key]: value
      });

      applyGlobalSettings(updated);
      return updated;
    });
  }

  function uploadLogo(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      toast.error(
        "Only JPG, PNG and WebP image files are allowed"
      );
      event.target.value = "";
      return;
    }

    if (file.size > MAX_LOGO_SIZE) {
      toast.error("Logo must be 5 MB or smaller");
      event.target.value = "";
      return;
    }

    if (logoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(logoPreview);
    }

    const previewUrl = URL.createObjectURL(file);

    setLogoFile(file);
    setLogoPreview(previewUrl);
    setLogoError(false);

    toast.success(
      "Logo selected. Click Save Settings to upload it."
    );
  }

  async function saveSettings(event) {
    event.preventDefault();

    if (saving) return;

    try {
      setSaving(true);

      const formData = new FormData();

      formData.append("storeName", settings.storeName || "");
      formData.append("storeEmail", settings.email || "");
      formData.append("storePhone", settings.phone || "");
      formData.append("storeAddress", settings.address || "");

      formData.append("email", settings.email || "");
      formData.append("phone", settings.phone || "");
      formData.append("address", settings.address || "");

      formData.append(
        "currency",
        settings.currency || "USD"
      );

      formData.append(
        "taxRate",
        String(Number(settings.taxRate || 0))
      );

      formData.append(
        "language",
        settings.language || "English"
      );

      formData.append(
        "darkMode",
        String(Boolean(settings.darkMode))
      );

      formData.append(
        "maintenanceMode",
        String(Boolean(settings.maintenanceMode))
      );

      formData.append(
        "receiptFooter",
        settings.receiptFooter || ""
      );

      formData.append(
        "backupEnabled",
        String(Boolean(settings.backupEnabled))
      );

      if (logoFile) {
        formData.append(
          "logo",
          logoFile,
          logoFile.name
        );
      }

      const response = await api.put(
        "/settings",
        formData
      );

      let responseData = getSettingsData(response);

      if (
        logoFile &&
        !responseData.logo &&
        !responseData.storeLogo
      ) {
        const refreshedResponse = await api.get("/settings");
        responseData = getSettingsData(refreshedResponse);
      }

      const savedLogo =
        responseData.storeLogo ??
        responseData.logo ??
        settings.logo;

      const updated = normalizeSettings({
        ...settings,
        ...responseData,
        storeLogo: savedLogo,
        logo: savedLogo
      });

      if (logoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreview);
      }

      setSettings(updated);
      setLogoFile(null);
      setLogoPreview("");
      setLogoError(false);

      applyGlobalSettings(updated);

      toast.success("Settings saved successfully");
    } catch (error) {
      console.error("SAVE SETTINGS ERROR:", error);

      toast.error(
        error.response?.data?.message ||
          "Failed to save settings"
      );
    } finally {
      setSaving(false);
    }
  }

  function backupSystem() {
    const data = {
      settings,
      user: JSON.parse(
        localStorage.getItem("user") || "{}"
      ),
      createdAt: new Date().toISOString()
    };

    const blob = new Blob(
      [JSON.stringify(data, null, 2)],
      {
        type: "application/json"
      }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "bulsho-store-backup.json";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    toast.success("Backup downloaded");
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[70vh]">
          <Loader2
            size={45}
            className="animate-spin text-[#0E7490]"
          />
        </div>
      </DashboardLayout>
    );
  }

  const displayedLogo =
    logoPreview || getLogoUrl(settings.logo);

  return (
    <DashboardLayout>
      <form onSubmit={saveSettings} className="space-y-7">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#071B34] via-[#0E7490] to-[#F4B740] p-7 text-white shadow-2xl">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/10 blur-3xl" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div>
              <h1 className="text-4xl font-black">
                Store Settings
              </h1>

              <p className="text-white/75 mt-2">
                Manage store profile, receipt, currency,
                security, and system preferences.
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="bg-white text-[#071B34] px-7 py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-xl disabled:opacity-60"
            >
              {saving ? (
                <Loader2
                  size={18}
                  className="animate-spin"
                />
              ) : (
                <Save size={18} />
              )}

              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
          <Stat
            title="Currency"
            value={settings.currency}
            icon={DollarSign}
          />

          <Stat
            title="Tax Rate"
            value={`${settings.taxRate}%`}
            icon={Percent}
          />

          <Stat
            title="Language"
            value={settings.language}
            icon={Globe}
          />

          <Stat
            title="System Status"
            value={
              settings.maintenanceMode
                ? "Inactive"
                : "Active"
            }
            icon={Activity}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Panel>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-5">
              Store Logo
            </h2>

            <div className="flex flex-col items-center text-center">
              <div className="w-36 h-36 rounded-[2rem] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                {displayedLogo && !logoError ? (
                  <img
                    src={displayedLogo}
                    alt="Store Logo"
                    className="w-full h-full object-contain p-2"
                    onLoad={() => setLogoError(false)}
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <Store
                    size={60}
                    className="text-[#0E7490]"
                  />
                )}
              </div>

              <label className="mt-5 cursor-pointer bg-[#0E7490] hover:bg-[#0B2545] text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 transition">
                <Upload size={18} />

                {settings.logo || logoFile
                  ? "Replace Logo"
                  : "Upload Logo"}

                <input
                  type="file"
                  name="logo"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  onChange={uploadLogo}
                  className="hidden"
                />
              </label>

              {logoFile && (
                <p className="mt-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {logoFile.name}
                </p>
              )}
            </div>
          </Panel>

          <Panel className="xl:col-span-2">
            <SectionTitle
              icon={Store}
              title="Store Profile"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
              <Input
                icon={Store}
                label="Store Name"
                value={settings.storeName}
                onChange={(value) =>
                  updateField("storeName", value)
                }
              />

              <Input
                icon={Mail}
                label="Email"
                type="email"
                value={settings.email}
                onChange={(value) =>
                  updateField("email", value)
                }
              />

              <Input
                icon={Phone}
                label="Phone"
                value={settings.phone}
                onChange={(value) =>
                  updateField("phone", value)
                }
              />

              <Input
                icon={MapPin}
                label="Address"
                value={settings.address}
                onChange={(value) =>
                  updateField("address", value)
                }
              />
            </div>
          </Panel>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Panel>
            <SectionTitle
              icon={Receipt}
              title="Receipt & Finance"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
              <Select
                label="Currency"
                value={settings.currency}
                onChange={(value) =>
                  updateField("currency", value)
                }
                options={["USD", "SOS", "KES", "ETB"]}
              />

              <Input
                icon={Percent}
                label="Tax Rate (%)"
                type="number"
                value={settings.taxRate}
                onChange={(value) =>
                  updateField("taxRate", value)
                }
              />

              <div className="md:col-span-2">
                <label className="text-sm font-bold text-slate-600 dark:text-slate-300">
                  Receipt Footer
                </label>

                <textarea
                  rows="4"
                  value={settings.receiptFooter}
                  onChange={(event) =>
                    updateField(
                      "receiptFooter",
                      event.target.value
                    )
                  }
                  className="w-full mt-2 px-4 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 border border-transparent dark:border-slate-700 outline-none resize-none focus:ring-2 focus:ring-[#0E7490]"
                />
              </div>
            </div>
          </Panel>

          <Panel>
            <SectionTitle
              icon={ShieldCheck}
              title="System Preferences"
            />

            <div className="space-y-4 mt-6">
              <Toggle
                icon={Moon}
                title="Dark Mode"
                desc="Enable dark appearance for the dashboard."
                checked={settings.darkMode}
                onChange={(value) =>
                  updateField("darkMode", value)
                }
              />

              <Select
                label="System Status"
                value={
                  settings.maintenanceMode
                    ? "Inactive"
                    : "Active"
                }
                onChange={(value) =>
                  updateField(
                    "maintenanceMode",
                    value === "Inactive"
                  )
                }
                options={["Active", "Inactive"]}
              />

              <Toggle
                icon={Database}
                title="Automatic Backup"
                desc="Allow automatic local backup configuration."
                checked={settings.backupEnabled}
                onChange={(value) =>
                  updateField("backupEnabled", value)
                }
              />

              <Select
                label="Language"
                value={settings.language}
                onChange={(value) =>
                  updateField("language", value)
                }
                options={["English", "Somali", "Arabic"]}
              />

              <button
                type="button"
                onClick={backupSystem}
                className="w-full mt-4 bg-slate-950 dark:bg-[#0E7490] hover:bg-[#0E7490] text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition"
              >
                <Database size={18} />
                Download Backup
              </button>
            </div>
          </Panel>
        </div>
      </form>
    </DashboardLayout>
  );
}

function Panel({ children, className = "" }) {
  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 md:p-8 ${className}`}
    >
      {children}
    </div>
  );
}

function SectionTitle({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-2xl bg-[#0E7490]/10 dark:bg-[#0E7490]/20 text-[#0E7490] flex items-center justify-center">
        <Icon size={22} />
      </div>

      <h2 className="text-2xl font-black text-slate-900 dark:text-white">
        {title}
      </h2>
    </div>
  );
}

function Stat({ title, value, icon: Icon }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
            {title}
          </p>

          <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {value}
          </h3>
        </div>

        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0B2545] to-[#0E7490] text-white flex items-center justify-center shadow-lg">
          <Icon size={25} />
        </div>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  icon: Icon
}) {
  return (
    <div>
      <label className="text-sm font-bold text-slate-600 dark:text-slate-300">
        {label}
      </label>

      <div className="relative mt-2">
        {Icon && (
          <Icon
            size={18}
            className="absolute left-4 top-4 text-slate-400 dark:text-slate-500"
          />
        )}

        <input
          type={type}
          value={value ?? ""}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className={`w-full px-4 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-transparent dark:border-slate-700 outline-none focus:ring-2 focus:ring-[#0E7490] ${
            Icon ? "pl-12" : ""
          }`}
        />
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options
}) {
  return (
    <div>
      <label className="text-sm font-bold text-slate-600 dark:text-slate-300">
        {label}
      </label>

      <select
        value={value ?? ""}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full mt-2 px-4 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-transparent dark:border-slate-700 outline-none focus:ring-2 focus:ring-[#0E7490]"
      >
        {options.map((option) => (
          <option
            key={option}
            value={option}
          >
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function Toggle({
  icon: Icon,
  title,
  desc,
  checked,
  onChange
}) {
  return (
    <div className="flex items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/80 border border-transparent dark:border-slate-700 rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-white dark:bg-slate-900 text-[#0E7490] flex items-center justify-center shadow-sm">
          <Icon size={20} />
        </div>

        <div>
          <h3 className="font-black text-slate-900 dark:text-white">
            {title}
          </h3>

          <p className="text-sm text-slate-500 dark:text-slate-400">
            {desc}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-14 h-8 rounded-full p-1 transition ${
          checked
            ? "bg-[#0E7490]"
            : "bg-slate-300 dark:bg-slate-600"
        }`}
      >
        <span
          className={`block w-6 h-6 rounded-full bg-white shadow transition ${
            checked
              ? "translate-x-6"
              : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
