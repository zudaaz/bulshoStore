# API Endpoint Summary

Base URL: `http://127.0.0.1:5000/api`

Except for health, login, refresh, password-reset and the controlled first registration, endpoints require `Authorization: Bearer <access-token>`. Permission middleware applies to business routes.

## Health

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | API health and uptime |

## Authentication

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/register` | Create first owner; later registration depends on configuration |
| POST | `/auth/login` | Sign in |
| POST | `/auth/refresh-token` | Rotate refresh token and obtain a new access token |
| POST | `/auth/forgot-password` | Generate password-reset instructions |
| POST | `/auth/reset-password/:token` | Set a new password |
| POST | `/auth/logout` | Invalidate the active refresh session |
| GET | `/auth/me` | Current user profile |
| PUT | `/auth/profile` | Update profile/store identity fields |
| PUT | `/auth/change-password` | Change password and invalidate session |

## Dashboard and audit

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/dashboard/summary` | Live business summary |
| GET | `/dashboard/charts` | Sales, expense, payment and product charts |
| GET | `/dashboard/recent-activities` | Recent business activity |
| GET | `/audit-logs` | Searchable audit log |

## Products, categories and stock

| Method | Endpoint | Purpose |
|---|---|---|
| GET/POST | `/categories` | List/create categories |
| GET/PUT/DELETE | `/categories/:id` | Read/update/archive category |
| GET/POST | `/products` | Search/list/create products |
| GET/PUT/DELETE | `/products/:id` | Read/update/archive product |
| PATCH | `/products/:id/stock-adjustment` | Increase/decrease stock with reason |
| GET | `/products/:id/stock-movements` | Product stock history |
| GET | `/products/alerts/low-stock` | Low-stock list |

## Customers, suppliers and payments

| Method | Endpoint | Purpose |
|---|---|---|
| GET/POST | `/customers` | List/create customers |
| GET/PUT/DELETE | `/customers/:id` | Read/update/archive customer |
| GET | `/customers/:id/statement` | Customer sales/payment statement |
| GET/POST | `/suppliers` | List/create suppliers |
| GET/PUT/DELETE | `/suppliers/:id` | Read/update/archive supplier |
| GET | `/suppliers/:id/statement` | Supplier purchase/payment statement |
| GET/POST | `/payments` | List/create customer or supplier payments |
| GET/DELETE | `/payments/:id` | Read/reverse payment |
| POST | `/payments/customer-credit` | Record customer credit adjustment |

## Sales and quotations

| Method | Endpoint | Purpose |
|---|---|---|
| GET/POST | `/sales` | List/create completed sales |
| GET | `/sales/:id` | Sale details |
| POST | `/sales/:id/return` | Return/refund sale and restore stock |
| POST | `/sales/:id/void` | Void/reverse sale |
| GET | `/sales/:id/receipt` | Receipt data |
| GET/POST | `/quotations` | List/create quotations |
| GET/PUT/DELETE | `/quotations/:id` | Read/update/archive quotation |

## Purchases

| Method | Endpoint | Purpose |
|---|---|---|
| GET/POST | `/purchases` | List/create purchases |
| GET/PUT/DELETE | `/purchases/:id` | Read/update/reverse purchase |
| POST | `/purchases/:id/return` | Return purchase and reverse stock/balance |

## Expenses and cashbook

| Method | Endpoint | Purpose |
|---|---|---|
| GET/POST | `/expenses` | List/create expenses |
| GET/PUT/DELETE | `/expenses/:id` | Read/update/archive expense |
| GET/POST | `/accounts` | List/create cashbook entries |
| PUT/DELETE | `/accounts/:id` | Update/archive manual ledger entry |

System-generated cashbook entries must be reversed from the originating sale, purchase, return, payment or expense.

## Staff

| Method | Endpoint | Purpose |
|---|---|---|
| GET/POST | `/staff` | List/create staff and login account |
| GET/PUT/DELETE | `/staff/:id` | Read/update/deactivate staff |
| GET/POST | `/staff-attendance` | List/record attendance |
| DELETE | `/staff-attendance/:id` | Delete attendance record |
| GET/POST | `/staff-payroll` | List/create payroll |
| PUT/DELETE | `/staff-payroll/:id` | Update/delete payroll |

## Reports

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/reports/sales` | Sales report |
| GET | `/reports/purchases` | Purchase report |
| GET | `/reports/expenses` | Expense report |
| GET | `/reports/profit-loss` | Profit-and-loss report |
| GET | `/reports/stock` | Inventory report |
| GET | `/reports/customer-balances` | Customer receivables |
| GET | `/reports/supplier-balances` | Supplier payables |
| GET | `/reports/export/sales/pdf` | Export sales PDF |
| GET | `/reports/export/sales/excel` | Export sales Excel workbook |

Report endpoints accept `startDate` and `endDate` where applicable.

## Settings, notifications and support services

| Method | Endpoint | Purpose |
|---|---|---|
| GET/PUT | `/settings` | Read/update business settings and logo |
| GET/POST | `/notifications` | List/create notifications; manual create is restricted |
| PUT | `/notifications/mark-all-read` | Mark all notifications read |
| PUT | `/notifications/:id/read` | Mark one notification read |
| DELETE | `/notifications/:id` | Delete notification |
| GET | `/subscriptions/overview` | Subscription summary/history |
| POST | `/subscriptions` | Create subscription record |
| PUT | `/subscriptions/:id/renew` | Renew subscription |
| PUT | `/subscriptions/:id/cancel` | Cancel subscription |
| DELETE | `/subscriptions/:id` | Delete subscription record |
| POST | `/sms/send` | Send customer SMS through configured provider |
