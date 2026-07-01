require("dotenv").config();

const http = require("http");
const app = require("./app");
const connectDB = require("./config/db");
const { closeDB } = require("./db/pool");
const { validateEnvironment } = require("./config/env");

validateEnvironment();
const PORT = Number(process.env.PORT || 5000);
let server;

async function start() {
  await connectDB();
  server = http.createServer(app).listen(PORT, () => {
    console.log(`🚀 Store Management API running on http://localhost:${PORT}`);
  });
}

async function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  if (server) await new Promise((resolve) => server.close(resolve));
  await closeDB().catch(() => {});
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error);
  shutdown("UNHANDLED_REJECTION");
});

start().catch((error) => {
  console.error("Server failed to start:", error.message);
  process.exit(1);
});
