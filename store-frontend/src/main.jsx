import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "react-hot-toast";
import App from "./App.jsx";
import "./index.css";

/* LOAD GLOBAL SETTINGS BEFORE APP STARTS */
const savedSettings = JSON.parse(
  localStorage.getItem("store_settings") || "{}"
);

if (savedSettings.darkMode) {
  document.documentElement.classList.add("dark");
} else {
  document.documentElement.classList.remove("dark");
}

if (savedSettings.language) {
  localStorage.setItem("app_language", savedSettings.language);
}

if (savedSettings.currency) {
  localStorage.setItem("app_currency", savedSettings.currency);
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />

    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3000,
        style: {
          borderRadius: "16px",
          background: "#0f172a",
          color: "#fff",
          fontWeight: "600"
        }
      }}
    />
  </React.StrictMode>
);