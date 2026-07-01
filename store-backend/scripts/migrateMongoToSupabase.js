/*
 * Optional one-time migration from the old MongoDB database into Supabase.
 *
 * PowerShell:
 *   npm install --no-save mongodb
 *   $env:MONGO_URI_LEGACY="mongodb://127.0.0.1:27017/store_management"
 *   npm run db:migrate:mongo
 *
 * Bash:
 *   npm install --no-save mongodb
 *   MONGO_URI_LEGACY="mongodb://127.0.0.1:27017/store_management" npm run db:migrate:mongo
 *
 * MongoDB ObjectId strings, timestamps, passwords, tenant references, and
 * document IDs are preserved. Existing Supabase records with the same ID are
 * updated, which makes the migration safe to resume after an interruption.
 */
require("dotenv").config();

const connectDB = require("../config/db");
const { closeDB } = require("../db/pool");
const models = require("../db/models");

const mappings = [
  { names: ["users"], Model: models.User },
  { names: ["staff", "staffs"], Model: models.Staff },
  { names: ["categories"], Model: models.Category },
  { names: ["customers"], Model: models.Customer },
  { names: ["suppliers"], Model: models.Supplier },
  { names: ["products"], Model: models.Product },
  { names: ["sales"], Model: models.Sale },
  { names: ["purchases"], Model: models.Purchase },
  { names: ["quotations"], Model: models.Quotation },
  { names: ["expenses"], Model: models.Expense },
  { names: ["payments"], Model: models.Payment },
  { names: ["accounts"], Model: models.Account },
  { names: ["auditlogs", "audit_logs"], Model: models.AuditLog },
  { names: ["notifications"], Model: models.Notification },
  { names: ["settings"], Model: models.Setting },
  { names: ["stockmovements", "stock_movements"], Model: models.StockMovement },
  { names: ["stockadjustments", "stock_adjustments"], Model: models.StockAdjustment },
  {
    names: ["staffattendances", "staff_attendance"],
    Model: models.StaffAttendance,
    include: (document) => !document.month && document.salary === undefined
  },
  {
    names: ["staffpayrolls", "staff_payrolls", "staffattendances"],
    Model: models.StaffPayroll,
    // Some early project versions accidentally stored payroll documents in
    // the attendance collection. Detect and preserve those records as payroll.
    include: (document, collectionName) =>
      collectionName !== "staffattendances" || Boolean(document.month) || document.salary !== undefined
  },
  { names: ["subscriptions"], Model: models.Subscription }
];

function normalize(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(normalize);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if (value._bsontype === "ObjectId" || value.constructor?.name === "ObjectId") {
      return value.toString();
    }
    const output = {};
    for (const [key, item] of Object.entries(value)) output[key] = normalize(item);
    return output;
  }
  return value;
}

async function main() {
  const mongoUri = process.env.MONGO_URI_LEGACY;
  if (!mongoUri) {
    throw new Error("MONGO_URI_LEGACY is required for the one-time migration");
  }

  let MongoClient;
  try {
    ({ MongoClient } = require("mongodb"));
  } catch {
    throw new Error('Install the temporary migration driver first: npm install --no-save mongodb');
  }

  const client = new MongoClient(mongoUri);
  await connectDB();
  await client.connect();

  try {
    const sourceDb = client.db();
    const sourceCollections = new Set(
      (await sourceDb.listCollections({}, { nameOnly: true }).toArray()).map((item) => item.name)
    );
    let total = 0;

    for (const mapping of mappings) {
      const seenIds = new Set();
      let migrated = 0;
      const existingNames = mapping.names.filter((name) => sourceCollections.has(name));

      if (!existingNames.length) {
        console.log(`${mapping.Model.modelName}: skipped (source collection not found)`);
        continue;
      }

      for (const collectionName of existingNames) {
        const cursor = sourceDb.collection(collectionName).find({});

        for await (const source of cursor) {
          if (mapping.include && !mapping.include(source, collectionName)) continue;

          const id = String(source._id);
          if (seenIds.has(id)) continue;
          seenIds.add(id);

          const data = normalize(source);
          const createdAt = source.createdAt || source.created_at || new Date();
          const updatedAt = source.updatedAt || source.updated_at || createdAt;
          delete data._id;
          delete data.__v;

          await mapping.Model.rawUpsert(data, { id, createdAt, updatedAt });
          migrated += 1;
        }
      }

      total += migrated;
      console.log(`${mapping.Model.modelName}: ${migrated} record(s) migrated from ${existingNames.join(", ")}`);
    }

    console.log(`Migration completed successfully. Total records: ${total}`);
  } finally {
    await client.close();
    await closeDB();
  }
}

main().catch(async (error) => {
  console.error(`Migration failed: ${error.message}`);
  await closeDB().catch(() => undefined);
  process.exit(1);
});
