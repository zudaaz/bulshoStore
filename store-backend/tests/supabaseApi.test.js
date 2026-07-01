process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-access-secret-that-is-at-least-32-characters";
process.env.REFRESH_TOKEN_SECRET = "test-refresh-secret-that-is-at-least-32-characters";
process.env.CORS_ORIGINS = "http://localhost:5173";

const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const { newDb } = require("pg-mem");
const { setPoolForTests, closeDB } = require("../db/pool");
const { User } = require("../db/models");
const app = require("../app");

const tableNames = [
  "users", "staff", "categories", "customers", "suppliers", "products", "sales",
  "purchases", "quotations", "expenses", "payments", "accounts", "audit_logs",
  "notifications", "settings", "stock_movements", "stock_adjustments",
  "staff_attendance", "staff_payrolls", "subscriptions"
];

let pool;
let token;
let owner;

async function createTable(name) {
  await pool.query(`
    create table ${name} (
      id text primary key,
      owner_id text,
      data jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
}

test.before(async () => {
  const memory = newDb({ autoCreateForeignKeyIndices: true });
  const adapter = memory.adapters.createPg();
  pool = new adapter.Pool();
  setPoolForTests(pool);
  for (const table of tableNames) await createTable(table);

  owner = await User.create({
    name: "API Owner",
    email: "api-owner@example.com",
    password: "StrongPassword123",
    role: "admin",
    permissions: [],
    isActive: true,
    isEmailVerified: true
  });
  token = jwt.sign({ id: owner._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
});

test.after(async () => {
  await closeDB();
});

test("Supabase-backed API keeps the existing category, product, settings and dashboard contracts", async () => {
  const auth = { Authorization: `Bearer ${token}` };

  const categoryResponse = await request(app)
    .post("/api/categories")
    .set(auth)
    .send({ name: "Beverages", description: "Cold drinks" })
    .expect(201);

  const categoryId = categoryResponse.body.data._id;
  assert.ok(categoryId);

  const productResponse = await request(app)
    .post("/api/products")
    .set(auth)
    .send({
      name: "Mineral Water",
      sku: "water-500",
      barcode: "100200300",
      category: categoryId,
      buyingPrice: 0.5,
      sellingPrice: 1,
      quantityInStock: 12,
      minimumStockLevel: 5
    })
    .expect(201);

  assert.equal(productResponse.body.data.name, "Mineral Water");
  assert.equal(productResponse.body.data.category.name, "Beverages");

  const listResponse = await request(app)
    .get("/api/products?search=water")
    .set(auth)
    .expect(200);
  assert.equal(listResponse.body.data.products.length, 1);
  assert.equal(listResponse.body.data.products[0].sku, "WATER-500");

  const settingsResponse = await request(app)
    .get("/api/settings")
    .set(auth)
    .expect(200);
  assert.equal(settingsResponse.body.data.storeName, "Bulsho Store");

  const supplierResponse = await request(app)
    .post("/api/suppliers")
    .set(auth)
    .send({ name: "Main Supplier", phone: "0610000000", status: "active" })
    .expect(201);

  const purchaseResponse = await request(app)
    .post("/api/purchases")
    .set(auth)
    .send({
      supplier: supplierResponse.body.data._id,
      paymentMethod: "cash",
      paidAmount: 1.5,
      items: [{ product: productResponse.body.data._id, quantity: 3, buyingPrice: 0.5 }]
    })
    .expect(201);
  assert.equal(purchaseResponse.body.data.subtotal, 1.5);

  const customerResponse = await request(app)
    .post("/api/customers")
    .set(auth)
    .send({ name: "Test Customer", phone: "0611111111" })
    .expect(201);

  const saleResponse = await request(app)
    .post("/api/sales")
    .set(auth)
    .send({
      customer: customerResponse.body.data._id,
      paymentMethod: "cash",
      paidAmount: 2,
      items: [{ product: productResponse.body.data._id, quantity: 2 }]
    })
    .expect(201);
  assert.equal(saleResponse.body.data.total, 2);
  assert.equal(saleResponse.body.data.status, "completed");

  const refreshedProduct = await request(app)
    .get(`/api/products/${productResponse.body.data._id}`)
    .set(auth)
    .expect(200);
  assert.equal(refreshedProduct.body.data.quantityInStock, 13);

  const dashboardResponse = await request(app)
    .get("/api/dashboard/summary")
    .set(auth)
    .expect(200);
  assert.equal(dashboardResponse.body.data.totalProducts, 1);
  assert.equal(dashboardResponse.body.data.availableStock, 13);
  assert.equal(dashboardResponse.body.data.stockValue, 6.5);
  assert.equal(dashboardResponse.body.data.todaySales, 2);
  assert.equal(dashboardResponse.body.data.totalPurchases, 1.5);
});

test("Supabase-backed API preserves staff, payroll, quotation, expense and payment modules", async () => {
  const auth = { Authorization: `Bearer ${token}` };

  const category = await request(app)
    .post("/api/categories")
    .set(auth)
    .send({ name: "Service Test Category" })
    .expect(201);

  const product = await request(app)
    .post("/api/products")
    .set(auth)
    .send({
      name: "Service Test Product",
      sku: "SERVICE-TEST-1",
      barcode: "9988776655",
      category: category.body.data._id,
      buyingPrice: 5,
      sellingPrice: 10,
      quantityInStock: 20,
      minimumStockLevel: 2
    })
    .expect(201);

  const customer = await request(app)
    .post("/api/customers")
    .set(auth)
    .send({ name: "Module Test Customer", phone: "0612222222" })
    .expect(201);

  const quotation = await request(app)
    .post("/api/quotations")
    .set(auth)
    .send({
      customer: customer.body.data._id,
      discount: 2,
      tax: 1,
      status: "sent",
      items: [{ product: product.body.data._id, quantity: 2, unitPrice: 10 }]
    })
    .expect(201);
  assert.equal(quotation.body.data.total, 19);

  const expense = await request(app)
    .post("/api/expenses")
    .set(auth)
    .send({
      title: "Electricity",
      amount: 25,
      category: "Utilities",
      paymentMethod: "cash",
      status: "approved"
    })
    .expect(201);
  assert.equal(expense.body.data.amount, 25);

  const staff = await request(app)
    .post("/api/staff")
    .set(auth)
    .send({
      name: "Test Cashier",
      email: "test-cashier@example.com",
      phone: "0613333333",
      password: "StrongStaffPassword123",
      role: "Cashier",
      salary: 300,
      status: "Active"
    })
    .expect(201);
  const staffId = staff.body.data.staff._id;

  const attendance = await request(app)
    .post("/api/staff-attendance")
    .set(auth)
    .send({ staff: staffId, date: "2026-07-01", status: "Present", time: "08:00" })
    .expect(201);
  assert.equal(attendance.body.data.staff.name, "Test Cashier");

  const payroll = await request(app)
    .post("/api/staff-payroll")
    .set(auth)
    .send({ staff: staffId, month: "2026-07", salary: 300, method: "Cash", status: "Paid" })
    .expect(201);
  assert.equal(payroll.body.data.status, "Paid");

  await request(app)
    .post("/api/payments/customer-credit")
    .set(auth)
    .send({ customerId: customer.body.data._id, amount: 50, note: "Opening test credit" })
    .expect(201);

  const payment = await request(app)
    .post("/api/payments")
    .set(auth)
    .send({
      type: "customer",
      referenceId: customer.body.data._id,
      amount: 20,
      method: "cash",
      note: "Partial payment"
    })
    .expect(201);
  assert.equal(payment.body.data.reference.currentBalance, 30);

  const accounts = await request(app)
    .get("/api/accounts")
    .set(auth)
    .expect(200);
  assert.ok(accounts.body.data.accounts.length >= 2);

  const quotationList = await request(app)
    .get("/api/quotations?search=Module")
    .set(auth)
    .expect(200);
  assert.equal(quotationList.body.data.quotations.length, 1);

  const expenseList = await request(app)
    .get("/api/expenses?category=Utilities")
    .set(auth)
    .expect(200);
  assert.equal(expenseList.body.data.summary.totalAmount, 25);
});

test("public company registration still works through the unchanged auth endpoint when enabled", async () => {
  process.env.ALLOW_PUBLIC_REGISTRATION = "true";
  try {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Second Company Owner",
        email: "second-company@example.com",
        password: "SecondCompanyPassword123",
        storeName: "Second Company"
      })
      .expect(201);

    assert.equal(response.body.data.user.storeName, "Second Company");
    assert.equal(response.body.data.user.role, "admin");
  } finally {
    process.env.ALLOW_PUBLIC_REGISTRATION = "false";
  }
});
