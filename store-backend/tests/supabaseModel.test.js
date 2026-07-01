process.env.NODE_ENV = "test";

const test = require("node:test");
const assert = require("node:assert/strict");
const { newDb } = require("pg-mem");
const { setPoolForTests, closeDB } = require("../db/pool");
const { User, Category, Product, Sale } = require("../db/models");

let pool;

async function createDocumentTable(name) {
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

  for (const table of ["users", "categories", "products", "sales"]) {
    await createDocumentTable(table);
  }
});

test.after(async () => {
  await closeDB();
});

test("Supabase model layer preserves authentication and document behavior", async () => {
  const owner = await User.create({
    name: "Store Owner",
    email: "OWNER@EXAMPLE.COM",
    password: "StrongPassword123",
    role: "admin"
  });

  assert.match(owner.password, /^\$2/);
  assert.equal(owner.email, "owner@example.com");
  assert.equal(await owner.comparePassword("StrongPassword123"), true);
  assert.equal(owner.toJSON().password, undefined);

  const found = await User.findOne({ email: "owner@example.com" }).select("+password");
  assert.equal(found._id, owner._id);
  assert.equal(await found.comparePassword("StrongPassword123"), true);
  assert.equal(await User.estimatedDocumentCount(), 1);

  found.lockUntil = new Date(Date.now() + 60_000);
  await found.save({ validateBeforeSave: false });
  const locked = await User.findById(found._id);
  assert.equal(locked.isLocked, true);
});

test("Supabase model layer supports CRUD, populate, regex, sorting and expressions", async () => {
  const owner = await User.findOne({ email: "owner@example.com" });
  const category = await Category.create({ owner: owner._id, createdBy: owner._id, name: "Drinks" });

  await Product.create({
    owner: owner._id,
    createdBy: owner._id,
    category: category._id,
    name: "Orange Juice",
    sku: "oj-001",
    buyingPrice: 1,
    sellingPrice: 2,
    quantityInStock: 2,
    minimumStockLevel: 5
  });

  await Product.create({
    owner: owner._id,
    createdBy: owner._id,
    category: category._id,
    name: "Water",
    sku: "water-001",
    buyingPrice: 0.5,
    sellingPrice: 1,
    quantityInStock: 20,
    minimumStockLevel: 5
  });

  const products = await Product.find({
    owner: owner._id,
    name: { $regex: "juice", $options: "i" }
  })
    .populate("category", "name")
    .sort({ createdAt: -1 });

  assert.equal(products.length, 1);
  assert.equal(products[0].category.name, "Drinks");
  assert.equal(products[0].sku, "OJ-001");

  const lowStock = await Product.countDocuments({
    owner: owner._id,
    $expr: { $lte: ["$quantityInStock", "$minimumStockLevel"] }
  });
  assert.equal(lowStock, 1);

  const updated = await Product.findOneAndUpdate(
    { owner: owner._id, name: "Water" },
    { $inc: { quantityInStock: -3 } },
    { new: true }
  );
  assert.equal(updated.quantityInStock, 17);
});

test("Supabase model layer supports dashboard aggregation pipelines", async () => {
  const owner = await User.findOne({ email: "owner@example.com" });

  await Sale.create({
    owner: owner._id,
    invoiceNumber: "INV-1",
    receiptNumber: "REC-1",
    status: "completed",
    isDeleted: false,
    paymentMethod: "cash",
    total: 15,
    items: [
      { productName: "Water", quantity: 5, total: 5 },
      { productName: "Orange Juice", quantity: 5, total: 10 }
    ]
  });

  await Sale.create({
    owner: owner._id,
    invoiceNumber: "INV-2",
    receiptNumber: "REC-2",
    status: "completed",
    isDeleted: false,
    paymentMethod: "bank",
    total: 8,
    items: [{ productName: "Water", quantity: 8, total: 8 }]
  });

  const totals = await Sale.aggregate([
    { $match: { owner: owner._id, status: "completed", isDeleted: false } },
    { $group: { _id: null, total: { $sum: "$total" } } }
  ]);
  assert.equal(totals[0].total, 23);

  const topProducts = await Sale.aggregate([
    { $match: { owner: owner._id, status: "completed", isDeleted: false } },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.productName",
        quantity: { $sum: "$items.quantity" },
        revenue: { $sum: "$items.total" }
      }
    },
    { $sort: { quantity: -1 } },
    { $limit: 1 }
  ]);

  assert.equal(topProducts[0]._id, "Water");
  assert.equal(topProducts[0].quantity, 13);
});
