# Bulsho Store Management System — Supabase Edition

A complete inventory and store management system built with **React + Vite** and **Node.js + Express**. The frontend design, routes, REST API contracts, authentication flow, permissions, reports, and business modules are preserved. The persistence layer has been migrated from MongoDB/Mongoose to **Supabase PostgreSQL**.

## What changed

Only the database implementation was replaced:

- MongoDB and Mongoose were removed from the running application.
- Supabase PostgreSQL is accessed securely by the Express backend through `pg`.
- Existing controllers and API response formats are preserved through a compatibility data layer.
- Existing MongoDB IDs, references, password hashes, and timestamps can be migrated with the included one-time migration script.
- The React pages and visual design remain unchanged apart from database wording in the support screen.

The system continues to use its existing JWT authentication. Supabase Auth is not required.

## Included modules

- Secure login, refresh-token rotation, password reset, login lockout and profile management
- Multi-company owner scoping, roles and granular permissions
- Products, categories, suppliers, customers and inventory movements
- Point of sale, partial/credit sales, receipts, returns and refunds
- Purchases, supplier balances, purchase returns and stock reversal
- Expenses, payments, receivables, payables and cashbook synchronization
- Quotations, staff, attendance, payroll and subscriptions
- Notifications, audit logs, business settings and SMS integration hooks
- Dashboard, sales, purchase, stock, expense, profit-and-loss, PDF and Excel reports

## Project structure

```text
Store-Management-System/
├── store-backend/
│   ├── db/                     # Supabase/PostgreSQL compatibility layer
│   ├── supabase/schema.sql     # Complete database schema
│   ├── scripts/
│   │   └── migrateMongoToSupabase.js
│   └── ...                     # Existing routes, controllers and services
├── store-frontend/             # Existing pixel-preserved React/Vite UI
├── SUPABASE_SETUP.md
├── MIGRATION_REPORT.md
└── API_ENDPOINTS.md
```

## Requirements

- Node.js 20.19 or newer, or Node.js 22.12 or newer
- npm 10 or newer
- A Supabase project
- A modern browser

## Fast setup

### 1. Create the Supabase tables

Open your Supabase project, go to **SQL Editor**, and run the entire file:

```text
store-backend/supabase/schema.sql
```

### 2. Configure the backend

```powershell
cd store-backend
Copy-Item .env.example .env
npm install
```

Put the Supabase PostgreSQL connection string in `store-backend/.env`:

```env
SUPABASE_DB_URL=postgresql://postgres.PROJECT_REF:YOUR_DATABASE_PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres
SUPABASE_SSL=true
JWT_SECRET=replace_with_a_random_secret_of_at_least_32_characters
REFRESH_TOKEN_SECRET=replace_with_a_different_random_secret_of_at_least_32_characters
CORS_ORIGINS=http://localhost:5173
```

Verify the schema and start the API:

```powershell
npm run db:verify
npm run dev
```

The API runs at `http://localhost:5000`.

### 3. Create the first administrator

Set these values in `.env`:

```env
ADMIN_NAME=System Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=Use-A-Unique-Strong-Password
```

Then run:

```powershell
npm run seed:admin
```

### 4. Start the frontend

Open a second terminal:

```powershell
cd store-frontend
Copy-Item .env.example .env
npm install
npm run dev
```

The frontend normally opens at `http://localhost:5173`.

## Migrate existing MongoDB data

The included migration preserves document IDs, references, timestamps and password hashes. First back up both databases and run the Supabase schema. Then:

```powershell
cd store-backend
npm install --no-save mongodb
$env:MONGO_URI_LEGACY="mongodb://127.0.0.1:27017/store_management"
npm run db:migrate:mongo
```

Remove `MONGO_URI_LEGACY` after migration. Full instructions are in [SUPABASE_SETUP.md](SUPABASE_SETUP.md).

## Validation commands

Backend:

```powershell
npm run check
npm test
npm audit
```

Frontend:

```powershell
npm run lint
npm run build
npm audit
```

## Deployment notes

- Keep `SUPABASE_DB_URL` only in the backend environment. Never expose it with a `VITE_` prefix.
- For a persistent backend on an IPv4-only host, use the Supabase **session pooler** connection string.
- For Vercel or another serverless backend, use the **transaction pooler** connection string and set `DB_POOL_MAX=1`.
- The current logo and product-image upload behavior remains file-based because the request was limited to changing the database. On an ephemeral/serverless host, move uploads to persistent object storage before production deployment.
- The SQL schema enables Row Level Security and revokes browser roles. All application access goes through the authenticated Express API.
- Do not commit `.env`, database passwords, JWT secrets, production backups or uploaded customer files.

See [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for detailed setup, [MIGRATION_REPORT.md](MIGRATION_REPORT.md) for the conversion summary and [API_ENDPOINTS.md](API_ENDPOINTS.md) for the unchanged endpoint map.
