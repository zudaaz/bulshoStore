const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const hpp = require("hpp");
const cookieParser = require("cookie-parser");
const path = require("path");

const errorHandler = require("./middleware/errorMiddleware");
const sanitizeInput = require("./middleware/sanitizeInput");
const { getAllowedOrigins } = require("./config/env");

const app = express();
const allowedOrigins = getAllowedOrigins();

if (process.env.TRUST_PROXY) app.set("trust proxy", Number(process.env.TRUST_PROXY) || 1);
app.disable("x-powered-by");

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204
  })
);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: process.env.NODE_ENV === "production" ? undefined : false
  })
);

app.use(express.json({ limit: process.env.BODY_LIMIT || "5mb" }));
app.use(express.urlencoded({ extended: true, limit: process.env.BODY_LIMIT || "5mb" }));
app.use(cookieParser());
app.use(sanitizeInput);
app.use(hpp());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.API_RATE_LIMIT || 500),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please try again later." }
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT || 30),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many authentication attempts. Please try again later." }
});
app.use("/api", apiLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    fallthrough: false,
    maxAge: process.env.NODE_ENV === "production" ? "7d" : 0
  })
);

if (process.env.NODE_ENV === "development") app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.json({ success: true, message: "Store Management API is running", environment: process.env.NODE_ENV || "development" });
});
app.get("/api/health", (req, res) => {
  res.json({ success: true, status: "healthy", uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/audit-logs", require("./routes/auditRoutes"));
app.use("/api/categories", require("./routes/categoryRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/customers", require("./routes/customerRoutes"));
app.use("/api/suppliers", require("./routes/supplierRoutes"));
app.use("/api/sales", require("./routes/saleRoutes"));
app.use("/api/quotations", require("./routes/quotationRoutes"));
app.use("/api/purchases", require("./routes/purchaseRoutes"));
app.use("/api/expenses", require("./routes/expenseRoutes"));
app.use("/api/payments", require("./routes/paymentRoutes"));
app.use("/api/reports", require("./routes/reportRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/settings", require("./routes/settingRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/subscriptions", require("./routes/subscriptionRoutes"));
app.use("/api/staff", require("./routes/staffRoutes"));
app.use("/api/staff-attendance", require("./routes/staffAttendanceRoutes"));
app.use("/api/staff-payroll", require("./routes/staffPayrollRoutes"));
app.use("/api/accounts", require("./routes/accountRoutes"));
app.use("/api/sms", require("./routes/smsRoutes"));

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});
app.use(errorHandler);

module.exports = app;
