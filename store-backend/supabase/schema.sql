-- Bulsho Store: Supabase PostgreSQL schema
-- Run this entire file once in Supabase Dashboard > SQL Editor.
-- The application keeps the existing REST API and frontend unchanged.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
  table_names text[] := array[
    'users',
    'staff',
    'categories',
    'customers',
    'suppliers',
    'products',
    'sales',
    'purchases',
    'quotations',
    'expenses',
    'payments',
    'accounts',
    'audit_logs',
    'notifications',
    'settings',
    'stock_movements',
    'stock_adjustments',
    'staff_attendance',
    'staff_payrolls',
    'subscriptions'
  ];
begin
  foreach table_name in array table_names loop
    execute format(
      'create table if not exists public.%I (
        id text primary key default gen_random_uuid()::text,
        owner_id text null,
        data jsonb not null default ''{}''::jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )',
      table_name
    );

    execute format(
      'create index if not exists %I on public.%I (owner_id)',
      table_name || '_owner_idx',
      table_name
    );

    execute format(
      'create index if not exists %I on public.%I using gin (data jsonb_path_ops)',
      table_name || '_data_gin_idx',
      table_name
    );

    execute format('drop trigger if exists %I on public.%I', table_name || '_set_updated_at', table_name);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      table_name || '_set_updated_at',
      table_name
    );

    -- The browser must never query these tables directly. The Express backend
    -- connects using the Supabase PostgreSQL connection string.
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
  end loop;
end;
$$;

-- Global user email uniqueness.
create unique index if not exists users_email_unique
on public.users (lower(data->>'email'))
where coalesce(data->>'email', '') <> '';

-- Per-company uniqueness rules preserved from the MongoDB system.
create unique index if not exists staff_owner_email_unique
on public.staff (owner_id, lower(data->>'email'))
where coalesce((data->>'isDeleted')::boolean, false) = false
  and coalesce(data->>'email', '') <> '';

create unique index if not exists categories_owner_name_unique
on public.categories (owner_id, lower(data->>'name'))
where coalesce((data->>'isDeleted')::boolean, false) = false;

create unique index if not exists suppliers_owner_name_unique
on public.suppliers (owner_id, lower(data->>'name'))
where coalesce((data->>'isDeleted')::boolean, false) = false;

create unique index if not exists settings_owner_unique
on public.settings (owner_id)
where owner_id is not null;

create unique index if not exists products_owner_sku_unique
on public.products (owner_id, upper(data->>'sku'))
where coalesce((data->>'isDeleted')::boolean, false) = false
  and coalesce(data->>'sku', '') <> '';

create unique index if not exists products_owner_barcode_unique
on public.products (owner_id, (data->>'barcode'))
where coalesce((data->>'isDeleted')::boolean, false) = false
  and coalesce(data->>'barcode', '') <> '';

create unique index if not exists sales_owner_invoice_unique
on public.sales (owner_id, (data->>'invoiceNumber'))
where coalesce(data->>'invoiceNumber', '') <> '';

create unique index if not exists sales_owner_receipt_unique
on public.sales (owner_id, (data->>'receiptNumber'))
where coalesce(data->>'receiptNumber', '') <> '';

create unique index if not exists purchases_owner_invoice_unique
on public.purchases (owner_id, (data->>'invoiceNumber'))
where coalesce(data->>'invoiceNumber', '') <> '';

create unique index if not exists quotations_owner_number_unique
on public.quotations (owner_id, (data->>'quotationNumber'))
where coalesce(data->>'quotationNumber', '') <> '';

create unique index if not exists payments_owner_number_unique
on public.payments (owner_id, (data->>'paymentNumber'))
where coalesce(data->>'paymentNumber', '') <> '';

create unique index if not exists expenses_owner_reference_unique
on public.expenses (owner_id, (data->>'referenceNumber'))
where coalesce(data->>'referenceNumber', '') <> '';

create unique index if not exists accounts_owner_source_key_unique
on public.accounts (owner_id, (data->>'sourceKey'))
where coalesce(data->>'sourceKey', '') <> '';

create unique index if not exists notifications_owner_source_key_unique
on public.notifications (owner_id, (data->>'sourceKey'))
where coalesce(data->>'sourceKey', '') <> '';

create unique index if not exists attendance_owner_staff_date_unique
on public.staff_attendance (owner_id, (data->>'staff'), (data->>'date'));

create unique index if not exists payroll_owner_staff_month_unique
on public.staff_payrolls (owner_id, (data->>'staff'), (data->>'month'));

-- Frequently used search/report indexes.
create index if not exists products_category_idx on public.products (owner_id, (data->>'category'));
create index if not exists products_expiry_idx on public.products (owner_id, (nullif(data->>'expiryDate', '')::timestamptz));
create index if not exists sales_created_idx on public.sales (owner_id, created_at desc);
create index if not exists purchases_created_idx on public.purchases (owner_id, created_at desc);
create index if not exists expenses_created_idx on public.expenses (owner_id, created_at desc);
create index if not exists payments_created_idx on public.payments (owner_id, created_at desc);
create index if not exists notifications_read_idx on public.notifications (owner_id, (data->>'isRead'));
create index if not exists stock_movements_product_idx on public.stock_movements (owner_id, (data->>'product'), created_at desc);

comment on schema public is 'Bulsho Store Supabase PostgreSQL database';
