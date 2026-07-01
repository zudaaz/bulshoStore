const bcrypt = require("bcryptjs");
const { createModel } = require("./modelFactory");

function validationError(message) {
  const error = new Error(message);
  error.name = "ValidationError";
  return error;
}

function requireFields(fields) {
  return async function validateRequiredFields() {
    for (const [field, message] of Object.entries(fields)) {
      const value = this[field];
      if (value === undefined || value === null || value === "") throw validationError(message);
    }
  };
}

const User = createModel({
  name: "User",
  table: "users",
  tenantKey: "owner",
  defaults: {
    role: "staff",
    owner: null,
    staffProfile: null,
    phone: "",
    storeName: "Bulsho Store",
    address: "",
    country: "Somalia",
    timezone: "Africa/Mogadishu",
    avatar: "",
    permissions: [],
    refreshToken: null,
    isActive: true,
    isEmailVerified: false,
    emailVerificationToken: "",
    resetPasswordToken: "",
    resetPasswordExpire: null,
    failedLoginAttempts: 0,
    lockUntil: null,
    lastLogin: null,
    loginHistory: []
  },
  hidden: ["password", "refreshToken"],
  relations: { owner: "User", staffProfile: "Staff" },
  virtuals: {
    isLocked() {
      if (!this.lockUntil) return false;
      return new Date(this.lockUntil).getTime() > Date.now();
    }
  },
  methods: {
    async comparePassword(enteredPassword) {
      return bcrypt.compare(enteredPassword, this.password || "");
    }
  },
  async beforeSave() {
    if (this.email) this.email = String(this.email).toLowerCase().trim();
    if (this.name) this.name = String(this.name).trim();
    if (Array.isArray(this.loginHistory)) {
      this.loginHistory = this.loginHistory.map((entry) => ({
        ...entry,
        loginAt: entry?.loginAt || new Date()
      }));
    }
    if (this.isModified("password") && this.password && !/^\$2[aby]\$/.test(this.password)) {
      this.password = await bcrypt.hash(this.password, 12);
    }
  },
  validate: requireFields({ name: "Name is required", email: "Email is required", password: "Password is required" })
});

const Staff = createModel({
  name: "Staff",
  table: "staff",
  tenantKey: "user",
  defaults: {
    phone: "",
    role: "Cashier",
    department: "",
    salary: 0,
    status: "Active",
    permissions: [],
    isActive: true,
    lastLogin: null,
    avatar: "",
    address: "",
    notes: "",
    isDeleted: false
  },
  hidden: ["password"],
  relations: { user: "User" },
  methods: {
    async comparePassword(enteredPassword) {
      return bcrypt.compare(enteredPassword, this.password || "");
    }
  },
  async beforeSave() {
    if (this.email) this.email = String(this.email).toLowerCase().trim();
    if (this.name) this.name = String(this.name).trim();
    if (this.isModified("password") && this.password && !/^\$2[aby]\$/.test(this.password)) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  },
  validate: requireFields({ user: "Store owner is required", name: "Staff name is required", email: "Staff email is required", password: "Staff password is required" })
});

const Category = createModel({
  name: "Category",
  table: "categories",
  defaults: { createdBy: null, description: "", image: "", status: "active", isDeleted: false },
  relations: { owner: "User", createdBy: "User" },
  async beforeSave() {
    if (this.name) this.name = String(this.name).trim();
  },
  validate: requireFields({ owner: "Store owner is required", name: "Category name is required" })
});

const Customer = createModel({
  name: "Customer",
  table: "customers",
  defaults: {
    createdBy: null,
    customerCode: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
    openingBalance: 0,
    currentBalance: 0,
    totalSales: 0,
    totalPaid: 0,
    lastTransactionDate: null,
    status: "active",
    isDeleted: false
  },
  relations: { owner: "User", createdBy: "User" },
  virtuals: { hasBalance() { return Number(this.currentBalance || 0) > 0; } },
  async beforeSave() {
    if (this.name) this.name = String(this.name).trim();
    if (this.email) this.email = String(this.email).toLowerCase().trim();
  },
  validate: requireFields({ owner: "Store owner is required", name: "Customer name is required" })
});

const Supplier = createModel({
  name: "Supplier",
  table: "suppliers",
  defaults: {
    phone: "", email: "", address: "", openingBalance: 0, currentBalance: 0,
    totalPurchases: 0, totalPaid: 0, contactPerson: "", companyName: "", notes: "",
    status: "active", createdBy: null, isDeleted: false
  },
  relations: { owner: "User", createdBy: "User" },
  async beforeSave() {
    if (this.name) this.name = String(this.name).trim();
    if (this.email) this.email = String(this.email).toLowerCase().trim();
  },
  validate: requireFields({ owner: "Store owner is required", name: "Supplier name is required" })
});

const Product = createModel({
  name: "Product",
  table: "products",
  defaults: {
    createdBy: null, sku: "", barcode: "", brand: "", unit: "pcs", supplier: null,
    buyingPrice: 0, sellingPrice: 0, wholesalePrice: 0, taxRate: 0, discountRate: 0,
    quantityInStock: 0, minimumStockLevel: 5, shelfLocation: "", batchNumber: "",
    manufacturingDate: null, expiryDate: null, image: "", description: "",
    status: "active", isDeleted: false
  },
  relations: { owner: "User", createdBy: "User", category: "Category", supplier: "Supplier" },
  async beforeSave() {
    if (this.name) this.name = String(this.name).trim();
    if (this.sku) this.sku = String(this.sku).trim().toUpperCase();
    if (this.barcode) this.barcode = String(this.barcode).trim();
  },
  validate: requireFields({ owner: "Store owner is required", name: "Product name is required", category: "Category is required" })
});

const Sale = createModel({
  name: "Sale",
  table: "sales",
  defaults: {
    createdBy: null, customer: null, customerName: "Walk-in Customer", items: [], subtotal: 0,
    discount: 0, tax: 0, total: 0, totalProfit: 0, cashReceived: 0, changeAmount: 0,
    paidAmount: 0, balance: 0, paymentMethod: "cash", paymentStatus: "paid",
    status: "processing", cashier: null, cashierName: "", note: "", reversalReason: "",
    reversedAt: null, reversedBy: null, isDeleted: false
  },
  relations: { owner: "User", createdBy: "User", customer: "Customer", cashier: "User", reversedBy: "User" },
  validate: requireFields({ owner: "Store owner is required", invoiceNumber: "Invoice number is required", receiptNumber: "Receipt number is required" })
});

const Purchase = createModel({
  name: "Purchase",
  table: "purchases",
  defaults: {
    invoiceNumber: "", supplierName: "", items: [], subtotal: 0, paidAmount: 0, balance: 0,
    paymentMethod: "cash", paymentStatus: "unpaid", status: "completed", returnReason: "",
    returnedAt: null, createdBy: null, isDeleted: false
  },
  relations: { owner: "User", supplier: "Supplier", createdBy: "User", "items.product": "Product" },
  validate: requireFields({ owner: "Store owner is required", supplier: "Supplier is required" })
});

const Quotation = createModel({
  name: "Quotation",
  table: "quotations",
  defaults: {
    createdBy: null, customer: null, customerName: "Walk-in Customer", customerPhone: "",
    items: [], subtotal: 0, discount: 0, tax: 0, total: 0, validUntil: null,
    status: "draft", notes: "", isDeleted: false
  },
  relations: { owner: "User", createdBy: "User", customer: "Customer", "items.product": "Product" },
  validate: requireFields({ owner: "Store owner is required", quotationNumber: "Quotation number is required" })
});

const Expense = createModel({
  name: "Expense",
  table: "expenses",
  defaults: {
    createdBy: null, referenceNumber: "", amount: 0, category: "General", paymentMethod: "cash",
    date: () => new Date(), description: "", attachment: "", status: "approved",
    approvedBy: null, approvedAt: null, isDeleted: false
  },
  relations: { owner: "User", createdBy: "User", approvedBy: "User" },
  validate: requireFields({ owner: "Store owner is required", title: "Expense title is required" })
});

const Payment = createModel({
  name: "Payment",
  table: "payments",
  defaults: {
    paymentNumber: "", method: "cash", note: "", receiptNumber: "", status: "completed",
    createdBy: null, cancelledAt: null, cancelledBy: null, isDeleted: false
  },
  relations: { owner: "User", createdBy: "User", cancelledBy: "User" },
  validate: requireFields({ owner: "Store owner is required", type: "Payment type is required", referenceId: "Reference is required", amount: "Payment amount is required" })
});

const Account = createModel({
  name: "Account",
  table: "accounts",
  tenantKey: "user",
  defaults: {
    createdBy: null, account: "cash", amount: 0, date: () => new Date(), note: "",
    referenceNumber: "", sourceType: "manual", sourceId: null, sourceAction: "PRIMARY",
    sourceKey: "", isSystemGenerated: false, isDeleted: false
  },
  relations: { user: "User", createdBy: "User" },
  validate: requireFields({ user: "Store owner is required", title: "Account title is required", type: "Account type is required" })
});

const AuditLog = createModel({
  name: "AuditLog",
  table: "audit_logs",
  defaults: {
    user: null, userName: "", recordId: null, oldData: null, newData: null,
    ipAddress: "", userAgent: ""
  },
  relations: { owner: "User", user: "User" },
  validate: requireFields({ owner: "Store owner is required", action: "Action is required", module: "Module is required" })
});

const Notification = createModel({
  name: "Notification",
  table: "notifications",
  defaults: {
    user: null, type: "info", module: "", actionUrl: "", sourceKey: "",
    isRead: false, readAt: null
  },
  relations: { owner: "User", user: "User" },
  validate: requireFields({ owner: "Store owner is required", title: "Notification title is required", message: "Notification message is required" })
});

const Setting = createModel({
  name: "Setting",
  table: "settings",
  defaults: {
    storeName: "Bulsho Store", storeLogo: "", storeEmail: "", storePhone: "",
    storeAddress: "", currency: "USD", taxRate: 0, language: "English",
    darkMode: false, maintenanceMode: false, receiptFooter: "Thank you for shopping with us.",
    backupEnabled: true
  },
  relations: { owner: "User" },
  validate: requireFields({ owner: "Store owner is required" })
});

const StockMovement = createModel({
  name: "StockMovement",
  table: "stock_movements",
  defaults: { previousStock: 0, newStock: 0, reason: "", reference: "", createdBy: null },
  relations: { owner: "User", product: "Product", createdBy: "User" },
  validate: requireFields({ owner: "Store owner is required", product: "Product is required", type: "Movement type is required", quantity: "Quantity is required" })
});

const StockAdjustment = createModel({
  name: "StockAdjustment",
  table: "stock_adjustments",
  defaults: { oldStock: 0, newStock: 0, reason: "", isDeleted: false },
  relations: { owner: "User", product: "Product", adjustedBy: "User" },
  validate: requireFields({ owner: "Store owner is required", product: "Product is required", adjustmentType: "Adjustment type is required", quantity: "Quantity is required", adjustedBy: "Adjusted by is required" })
});

const StaffAttendance = createModel({
  name: "StaffAttendance",
  table: "staff_attendance",
  defaults: { time: "", createdBy: null },
  relations: { owner: "User", staff: "Staff", createdBy: "User" },
  validate: requireFields({ owner: "Store owner is required", staff: "Staff is required", date: "Attendance date is required", status: "Attendance status is required" })
});

const StaffPayroll = createModel({
  name: "StaffPayroll",
  table: "staff_payrolls",
  defaults: { salary: 0, method: "Cash", status: "Pending", note: "", paidAt: null, createdBy: null },
  relations: { owner: "User", staff: "Staff", createdBy: "User" },
  validate: requireFields({ owner: "Store owner is required", staff: "Staff is required", month: "Payroll month is required" })
});

const Subscription = createModel({
  name: "Subscription",
  table: "subscriptions",
  defaults: {
    planName: "Free", price: 0, durationMonths: 1, startDate: () => new Date(),
    maxProducts: 100, maxStaff: 2, maxCustomers: 500, status: "active",
    paymentStatus: "paid", paymentMethod: "cash", invoiceNumber: "",
    transactionReference: "", autoRenew: false, cancelledAt: null, notes: ""
  },
  relations: { owner: "User" },
  validate: requireFields({ owner: "Store owner is required", endDate: "Subscription end date is required" })
});

module.exports = {
  User,
  Staff,
  Category,
  Customer,
  Supplier,
  Product,
  Sale,
  Purchase,
  Quotation,
  Expense,
  Payment,
  Account,
  AuditLog,
  Notification,
  Setting,
  StockMovement,
  StockAdjustment,
  StaffAttendance,
  StaffPayroll,
  Subscription
};
