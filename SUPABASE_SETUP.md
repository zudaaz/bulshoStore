# Supabase Setup Guide

This guide connects the existing Bulsho Store Express API to Supabase PostgreSQL without changing the frontend routes or user interface.

## 1. Create a Supabase project

Create a project in Supabase and save the database password securely. The database password is different from your Supabase account password.

## 2. Create the application schema

In the Supabase dashboard:

1. Open **SQL Editor**.
2. Choose **New query**.
3. Copy the full contents of `store-backend/supabase/schema.sql`.
4. Run the query once.

The script creates 20 application tables, indexes, uniqueness rules, update triggers and Row Level Security configuration.

## 3. Copy the correct PostgreSQL connection string

In Supabase, click **Connect** and select the connection mode appropriate for the backend:

### Local or persistent backend

Use the direct connection when your network supports it, or the **session pooler** on port `5432` for an IPv4-only persistent backend.

Example format:

```env
SUPABASE_DB_URL=postgresql://postgres.PROJECT_REF:YOUR_DATABASE_PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres
```

### Vercel or another serverless backend

Use the **transaction pooler** on port `6543`:

```env
SUPABASE_DB_URL=postgresql://postgres.PROJECT_REF:YOUR_DATABASE_PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres
DB_POOL_MAX=1
```

Do not manually invent the host or project reference. Copy the connection string from the project dashboard and replace only the password placeholder. URL-encode reserved password characters when required.

## 4. Configure `store-backend/.env`

From `store-backend`:

```powershell
Copy-Item .env.example .env
```

Minimum local configuration:

```env
NODE_ENV=development
PORT=5000

SUPABASE_DB_URL=YOUR_SUPABASE_POSTGRESQL_CONNECTION_STRING
SUPABASE_SSL=true
DB_POOL_MAX=5
DB_CONNECT_TIMEOUT_MS=15000
DB_IDLE_TIMEOUT_MS=30000

JWT_SECRET=GENERATE_A_RANDOM_VALUE_OF_AT_LEAST_32_CHARACTERS
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=GENERATE_A_DIFFERENT_RANDOM_VALUE_OF_AT_LEAST_32_CHARACTERS
REFRESH_TOKEN_EXPIRES=7d

CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
ALLOW_PUBLIC_REGISTRATION=false
```

Generate secure secrets in PowerShell:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Run it twice and use different results for the two JWT secrets.

## 5. Install and verify

```powershell
npm install
npm run db:verify
```

A successful check lists every Supabase table and ends with:

```text
Supabase schema verification completed.
```

Start the backend:

```powershell
npm run dev
```

Expected output:

```text
Supabase PostgreSQL Connected Successfully
Store Management API running on http://localhost:5000
```

## 6. Create or reset the administrator

Add strong development credentials to `.env`:

```env
ADMIN_NAME=System Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=Use-A-Unique-Strong-Password
```

Create the first administrator:

```powershell
npm run seed:admin
```

Reset the configured administrator later:

```powershell
npm run reset:admin
```

The scripts do not print the password.

## 7. Frontend configuration

Inside `store-frontend`:

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

Local frontend `.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

For deployment, replace that value with the deployed backend URL. The Supabase database string must never be placed in the frontend environment.

## 8. Optional MongoDB data migration

Back up MongoDB and Supabase first. The target schema must already exist.

Install the temporary MongoDB driver:

```powershell
npm install --no-save mongodb
```

Set the source URI only for this migration session:

```powershell
$env:MONGO_URI_LEGACY="mongodb://127.0.0.1:27017/store_management"
npm run db:migrate:mongo
```

The migration:

- Preserves MongoDB `_id` values as PostgreSQL text IDs.
- Preserves password hashes, relationships and tenant-owner references.
- Preserves `createdAt` and `updatedAt`.
- Updates matching IDs, so an interrupted migration can be rerun.
- Recognizes common legacy collection-name variations.
- Detects payroll rows accidentally stored in the old attendance collection.

After verifying the data, clear `MONGO_URI_LEGACY` and uninstall the temporary driver when desired:

```powershell
npm uninstall mongodb
```

## 9. Vercel backend variables

Create a separate backend project whose root directory is `store-backend`. Configure at least:

```env
NODE_ENV=production
SUPABASE_DB_URL=YOUR_TRANSACTION_POOLER_CONNECTION_STRING
SUPABASE_SSL=true
DB_POOL_MAX=1
JWT_SECRET=YOUR_LONG_RANDOM_SECRET
REFRESH_TOKEN_SECRET=YOUR_DIFFERENT_LONG_RANDOM_SECRET
CORS_ORIGINS=https://YOUR-FRONTEND-DOMAIN.vercel.app
TRUST_PROXY=1
ALLOW_PUBLIC_REGISTRATION=false
```

Redeploy after changing environment variables.

## 10. Security model

The frontend does not connect directly to PostgreSQL. The flow remains:

```text
React frontend → Express API → Supabase PostgreSQL
```

The schema enables RLS and revokes `anon` and `authenticated` table permissions because this project keeps its existing Express/JWT authorization model. The database password stays server-side.

## 11. Troubleshooting

### `SUPABASE_DB_URL is missing`

The real `.env` file is absent, has the wrong variable name, or was created in the wrong folder. It must be `store-backend/.env`.

### `password authentication failed`

Copy the connection string again and reset the project database password if necessary. Encode special password characters.

### `ENETUNREACH` or direct host cannot be reached

Your network may be IPv4-only. Use the Supabase session pooler instead of the direct IPv6 endpoint.

### `relation "users" does not exist`

Run `store-backend/supabase/schema.sql` in SQL Editor, then run `npm run db:verify`.

### Frontend loads but data requests fail

Check `VITE_API_URL`, backend CORS origins, backend runtime logs and the `/api/health` endpoint.

### Uploaded logo disappears after deployment

That is a file-storage issue, not a Supabase database issue. The current system preserves its local `uploads` implementation. Serverless filesystems are temporary; production uploads require persistent object storage.
