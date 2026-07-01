process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-access-secret-that-is-at-least-32-characters";
process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "test-refresh-secret-that-is-at-least-32-characters";
process.env.SUPABASE_DB_URL = process.env.SUPABASE_DB_URL || "postgresql://postgres:postgres@127.0.0.1:5432/store_management_test";
process.env.SUPABASE_SSL = "false";

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../app");

test("health endpoint responds without a database connection", async () => {
  const response = await request(app).get("/api/health").expect(200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.status, "healthy");
});

test("unknown API routes return a structured 404", async () => {
  const response = await request(app).get("/api/not-a-real-route").expect(404);
  assert.equal(response.body.success, false);
  assert.match(response.body.message, /Route not found/);
});

test("protected product routes reject unauthenticated requests", async () => {
  const response = await request(app).get("/api/products").expect(401);
  assert.equal(response.body.success, false);
});

test("removed diagnostic settings route is not publicly accessible", async () => {
  const response = await request(app).get("/api/settings/test").expect(401);
  assert.equal(response.body.success, false);
});
