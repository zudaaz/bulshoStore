import axios from "axios";
import { clearAuthStorage, saveAuthSession } from "../utils/authStorage";

const configuredBase = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000/api";
export const API_BASE_URL = configuredBase.replace(/\/$/, "");
export const API_ORIGIN = API_BASE_URL.replace(/\/api$/, "");

export function getAssetUrl(path) {
  if (!path) return "";
  if (/^(data:|blob:|https?:\/\/)/i.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 20000,
  headers: { "Content-Type": "application/json" }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise = null;

function redirectToLogin() {
  clearAuthStorage();
  if (window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const isAuthRequest = /\/auth\/(login|refresh-token|forgot-password|reset-password)/.test(
      original?.url || ""
    );

    if (status !== 401 || original?._retry || isAuthRequest) {
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
      redirectToLogin();
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      refreshPromise ||= axios
        .post(
          `${API_BASE_URL}/auth/refresh-token`,
          { refreshToken },
          { withCredentials: true, timeout: 20000 }
        )
        .then((response) => response.data?.data)
        .finally(() => {
          refreshPromise = null;
        });

      const session = await refreshPromise;
      if (!session?.accessToken) throw new Error("Token refresh failed");

      saveAuthSession(session);
      original.headers.Authorization = `Bearer ${session.accessToken}`;
      return api(original);
    } catch (refreshError) {
      redirectToLogin();
      return Promise.reject(refreshError);
    }
  }
);

export default api;
