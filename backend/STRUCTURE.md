# Backend — school-CRM API

```
backend/
├── src/
│   ├── config/
│   │   └── env.ts               # Zod-validated environment variables
│   ├── db/
│   │   ├── index.ts             # Drizzle ORM client (pg.Pool + drizzle)
│   │   ├── migrate.ts           # Runs Drizzle migrations
│   │   └── schema/
│   │       ├── index.ts         # Re-exports all tables
│   │       ├── users.ts         # Auth users (email, password_hash, role)
│   │       ├── clients.ts       # Client families (parent, children, contact)
│   │       ├── payments.ts      # Payment records (amount, mode, status)
│   │       ├── invoices.ts      # Generated invoices
│   │       ├── appointments.ts  # Appointments
│   │       ├── employees.ts     # Staff (teachers, admins)
│   │       ├── planifications.ts # Academic planning
│   │       ├── levels.ts        # Grade levels (CP, CE1…)
│   │       ├── settings.ts      # Centre settings (services, fees, discounts)
│   │       ├── holidays.ts      # Public holidays
│   │       ├── vacations.ts     # School vacations
│   │       ├── calendar-exceptions.ts # Calendar overrides
│   │       ├── whatsapp-messages.ts # WhatsApp message log
│   │       ├── email-logs.ts    # Email send log
│   │       ├── demo-requests.ts # Demo requests from landing page
│   │       ├── centers.ts       # Multi-centre support
│   │       ├── center-admins.ts # Centre admin assignments
│   │       ├── support-sessions.ts # Support chat sessions
│   │       └── support-messages.ts  # Support chat messages
│   ├── jobs/
│   │   └── worker.ts            # BullMQ worker (invoices, emails, WhatsApp)
│   ├── middleware/
│   │   ├── auth.ts              # JWT verify + role guards
│   │   └── error-handler.ts     # Global error handler
│   ├── routes/
│   │   ├── auth.ts              # POST /login, GET /me, CRUD users
│   │   ├── clients.ts           # CRUD clients + CSV import
│   │   ├── payments.ts          # CRUD payments + stats
│   │   ├── invoices.ts          # List, generate, analytics
│   │   ├── appointments.ts      # CRUD appointments
│   │   ├── employees.ts         # CRUD employees + CSV import
│   │   ├── planifications.ts    # CRUD planifications
│   │   ├── dashboard.ts         # Dashboard stats + revenue charts
│   │   ├── settings.ts          # Centre settings + levels CRUD
│   │   ├── holidays.ts          # Holidays, vacations, exceptions
│   │   ├── admin.ts             # Admin API (/api/admin/*) — multi-product integration
│   │   ├── support.ts           # Support sessions + messages
│   │   ├── whatsapp.ts          # Send + broadcast + message log
│   │   ├── email.ts             # Send email + receipt + demo
│   │   └── receipt.ts           # PDF receipt generation
│   ├── services/
│   │   └── auth.ts              # JWT sign + verify helpers
│   ├── scripts/
│   │   └── migrate-from-supabase.ts # Supabase → self-hosted PG migration
│   ├── app.ts                   # Fastify app assembly (plugins + routes)
│   └── index.ts                 # Server entry point
├── docker/
│   └── entrypoint.sh            # Runs migrations then starts app
├── Dockerfile                   # Multi-stage: dev (tsx) + prod (compiled)
├── drizzle.config.ts
├── tsconfig.json
└── package.json
```

## Database tables (19)

| Table | Purpose |
|---|---|
| `users` | Auth (email, password_hash, role: admin/superadmin) |
| `centers` | Multi-centre support |
| `center_admins` | Admin-to-centre mapping |
| `clients` | Families (parent info, children, contact) |
| `levels` | Grade levels (CP, CE1, CE2…) |
| `settings` | Centre config (services, fees, discounts) |
| `employees` | Staff records |
| `holidays` | Public holidays |
| `school_vacations` | School closure periods |
| `calendar_exceptions` | Override dates |
| `payments` | Transactions (amount, mode, status, date) |
| `invoices` | Generated invoices |
| `appointments` | Scheduled appointments |
| `planifications` | Academic planning entries |
| `whatsapp_messages` | WhatsApp send log |
| `email_logs` | Email send log |
| `demo_requests` | Landing page enquiries |
| `support_sessions` | Chat sessions |
| `support_messages` | Chat messages |

## API endpoints

All prefixed with `/api`. Public: `POST /api/auth/login`, `POST /api/email/send-demo`, `GET /api/health`. Everything else requires JWT Bearer token.

### Admin API (`/api/admin/*`)

Protected by `X-API-Key` header (not JWT). Used by external platforms like SuperAdmin CRM.

| Endpoint | Description |
|---|---|
| `GET /api/admin/health` | Health check |
| `GET /api/admin/info` | Product info (name, version, environment) |
| `GET /api/admin/stats` | Platform statistics |
| `GET /api/admin/tenants` | All centres with admin details |
| `GET /api/admin/users` | All user accounts |
| `GET /api/admin/demo-requests` | Pending demo requests |
| `GET /api/admin/revenue-history` | Monthly revenue (last 7 months) |

## Middleware

- `authenticate` — verifies JWT, attaches `request.user`
- `verifyApiKey` — validates `X-API-Key` header for Admin API routes
- Global error handler — catches all unhandled errors, returns `{ error: string }`
