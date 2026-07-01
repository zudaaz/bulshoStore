const { Pool } = require("pg");

let pool = null;

function getConnectionString() {
  return process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || "";
}

function isLocalConnection(connectionString) {
  return /localhost|127\.0\.0\.1|host\.docker\.internal/i.test(connectionString);
}

function getPool() {
  if (pool) return pool;

  const connectionString = getConnectionString();
  if (!connectionString) {
    throw new Error(
      "SUPABASE_DB_URL is missing. Copy the Supabase PostgreSQL connection string into store-backend/.env."
    );
  }

  pool = new Pool({
    connectionString,
    max: Number(process.env.DB_POOL_MAX || (process.env.VERCEL ? 1 : 5)),
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
    connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS || 15000),
    allowExitOnIdle: true,
    ssl:
      process.env.SUPABASE_SSL === "false" || isLocalConnection(connectionString)
        ? false
        : { rejectUnauthorized: false }
  });

  pool.on("error", (error) => {
    console.error("❌ Supabase PostgreSQL pool error:", error.message);
  });

  return pool;
}

async function connectDB() {
  const db = getPool();
  const result = await db.query(
    "select current_database() as database_name, current_user as database_user, version() as version"
  );
  const info = result.rows[0] || {};

  console.log(`
========================================
✅ Supabase PostgreSQL Connected Successfully
👤 User: ${info.database_user || "unknown"}
📂 Database: ${info.database_name || "postgres"}
========================================
  `);

  return db;
}

function setPoolForTests(testPool) {
  pool = testPool;
}

async function closeDB() {
  if (!pool) return;
  const activePool = pool;
  pool = null;
  await activePool.end();
}

module.exports = {
  getPool,
  connectDB,
  closeDB,
  getConnectionString,
  setPoolForTests
};
