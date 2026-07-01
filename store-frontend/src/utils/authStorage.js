const AUTH_KEYS = [
  "token",
  "accessToken",
  "refreshToken",
  "auth",
  "user",
  "login_email",
  "login_password"
];

export function clearAuthStorage() {
  AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
  sessionStorage.removeItem("auth");
}

export function saveAuthSession({ accessToken, refreshToken, user }) {
  if (accessToken) {
    localStorage.setItem("token", accessToken);
    localStorage.setItem("accessToken", accessToken);
  }
  if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
  if (user) localStorage.setItem("user", JSON.stringify(user));
  window.dispatchEvent(new Event("profile-updated"));
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}
