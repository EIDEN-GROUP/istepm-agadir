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
│   │       ├── demo-requests.ts # Landing page demo requests
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
│   │   ├── superadmin.ts        # Multi-centre admin (stats, centres, admins)
│   │   ├── support.ts           # Support sessions + messages
│   │   ├── whatsapp.ts          # Send + broadcast + message log
│   │   ├── email.ts             # Send email + receipt + demo
│   │   └── receipt.ts           # PDF receipt generation
│   ├── services/
│   │   └── auth.ts              # JWT sign + verify helpers
│   ├── app.ts                   # Fastify app assembly (plugins + routes)
│   └── index.ts                 # Server entry point
├── docker/
│   └── entrypoint.sh            # Runs migrations then starts app
├── scripts/
│   └── migrate-from-supabase.ts # Supabase → self-hosted PG migration
├── migrations/                  # Drizzle SQL migration files (generated)
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

## API endpoints (15 route modules, ~96 routes)

All prefixed with `/api`. Public: `POST /api/auth/login`, `POST /api/email/send-demo`, `GET /api/health`. Everything else requires JWT Bearer token.

## Middleware

- `authenticate` — verifies JWT, attaches `request.user`
- `requireSuperadmin` — role check on top of authenticate
- Global error handler — catches all unhandled errors, returns `{ error: string }`
