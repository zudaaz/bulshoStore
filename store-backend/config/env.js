function validateEnvironment() {
  const missing = [];

  if (!process.env.SUPABASE_DB_URL && !process.env.DATABASE_URL) {
    missing.push("SUPABASE_DB_URL (or DATABASE_URL)");
  }
  if (!process.env.JWT_SECRET) missing.push("JWT_SECRET");
  if (!process.env.REFRESH_TOKEN_SECRET) missing.push("REFRESH_TOKEN_SECRET");

  if (missing.length) {
    const message = `Missing required environment variables: ${missing.join(", ")}`;
    if (process.env.NODE_ENV === "production") throw new Error(message);
    console.warn(`⚠️ ${message}`);
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn("⚠️ JWT_SECRET should be at least 32 characters.");
  }
  if (process.env.REFRESH_TOKEN_SECRET && process.env.REFRESH_TOKEN_SECRET.length < 32) {
    console.warn("⚠️ REFRESH_TOKEN_SECRET should be at least 32 characters.");
  }
}

function getAllowedOrigins() {
  const configured = String(process.env.CORS_ORIGINS || "")
    .split(",")
    .map((value) => value.trim().replace(/\/$/, ""))
    .filter(Boolean);

  return configured.length
    ? configured
    : [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174"
      ];
}

module.exports = { validateEnvironment, getAllowedOrigins };
