# school-CRM

Gestion scolaire   application de gestion d'établissement scolaire (facturation, paiements, employés, planning, support). Architecture full-stack avec backend Fastify + frontend React SPA.

## Architecture

```
                    ┌──────────────┐
                    │  Vercel /    │
                    │  Netlify     │
                    │  (SPA)       │
                    └──────┬───────┘
                           │ HTTPS
                    ┌──────▼───────┐       ┌───────────┐
                    │  Traefik     │───────│  MinIO    │
                    │  (reverse    │       │  (S3)     │
                    │   proxy)     │       └───────────┘
                    └──────┬───────┘
          ┌────────────────┼────────────────┐
          │                │                │
   ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
   │  Fastify    │  │  BullMQ     │  │  Grafana +  │
   │  API        │  │  Worker     │  │  Loki +     │
   │  (Docker)   │  │  (Docker)   │  │  Prometheus │
   └──────┬──────┘  └──────┬──────┘  └─────────────┘
          │                │
   ┌──────▼──────┐  ┌──────▼──────┐
   │ PostgreSQL  │  │  Redis      │
   └─────────────┘  └─────────────┘
```

## Tech stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, TanStack Router v1, TanStack Query, Tailwind v4, shadcn/ui, Framer Motion, Recharts |
| **Backend** | Fastify 5, TypeScript, Drizzle ORM, Zod validation |
| **Database** | PostgreSQL 16 (self-hosted) |
| **Cache / Queue** | Redis 7 + BullMQ |
| **Storage** | MinIO (S3-compatible) |
| **Auth** | Self-managed JWT + bcrypt |
| **Deployment** | Docker Compose (dev) / Docker Swarm (prod) + Traefik + Let's Encrypt |

## Frontend (`frontend/`)

Pure Vite + React SPA. No SSR. TanStack Router file-based routing with auth guards.

### Pages

| Route | Page |
|---|---|
| `/` | Redirects to `/login` |
| `/login` | Login form |
| `/dashboard` | Dashboard (auth required) |
| `/dashboard/` | Dashboard home   stats, charts, recent payments |
| `/dashboard/familles` | Client management |
| `/dashboard/paiements` | Payment tracking |
| `/dashboard/calendar` | Calendar with holidays/vacations |
| `/dashboard/affiches` | Employee management |
| `/dashboard/planifications` | Academic planning |
| `/dashboard/rapports` | Reports |
| `/dashboard/settings` | Centre settings |

### Dev

```bash
cd frontend
cp .env.example .env
npm run dev        # → http://localhost:5173
```

### Build

```bash
VITE_API_URL=https://api.example.com/api npm run build
# output: frontend/dist/
```

## Backend (`backend/`)

Fastify REST API with 15 route modules (~96 endpoints). All data access via Drizzle ORM.

### Dev

```bash
cd backend
cp .env.example .env
npm run dev        # → http://localhost:3000
```

### Database

```bash
# Generate migrations after schema changes
npm run db:generate

# Apply pending migrations
npm run db:migrate

# Open Drizzle Studio (GUI)
npm run db:studio
```

## Docker

### Development

```bash
# Start all services (PostgreSQL + Redis + MinIO + backend)
docker compose up -d

# Backend auto-reloads via tsx watch (src/ bind mount)
# Frontend runs separately: cd frontend && npm run dev
```

### Production (Docker Swarm)

```bash
# 1. Copy and fill production env
cp .env.production.example .env.production

# 2. Deploy
./deploy.sh

# 3. Verify
docker stack ps school-crm
```

Or manually:

```bash
docker build -t school-crm-api:latest -f backend/Dockerfile --target production backend/
docker stack deploy -c docker-compose.production.yml school-crm
```

### Services

| Service | Port | Description |
|---|---|---|
| `postgres` | 5432 | Database |
| `redis` | 6379 | Cache + BullMQ |
| `minio` | 9000 (API), 9001 (Console) | S3 storage |
| `backend` | 3000 | Fastify API |
| `backend-worker` |   | BullMQ background jobs |
| `traefik` (prod) | 80, 443 | Reverse proxy + SSL |

## Data migration (Supabase → self-hosted)

```bash
export SOURCE_DATABASE_URL="postgres://user:pass@supabase-host:5432/postgres?sslmode=require"
export DATABASE_URL="postgres://postgres:postgres@localhost:5432/school_crm"
npx tsx backend/scripts/migrate-from-supabase.ts
```

Migrates all 19 tables in dependency order. Batched inserts with `ON CONFLICT DO NOTHING`   safe to re-run.

## Admin API (multi-product integration)

School-CRM exposes a standard Admin API at `/api/admin/*`, protected by an `X-API-Key` header. This lets external platforms (like SuperAdmin CRM) integrate without sharing user databases.

| Endpoint | Description |
|---|---|
| `GET /api/admin/health` | Health check |
| `GET /api/admin/info` | Product name, version, environment |
| `GET /api/admin/stats` | Platform statistics (centers, revenue, etc.) |
| `GET /api/admin/tenants` | All centers with admin details |
| `GET /api/admin/users` | All user accounts |
| `GET /api/admin/demo-requests` | Pending demo requests |
| `GET /api/admin/revenue-history` | Monthly revenue (last 7 months) |

Set the `ADMIN_API_KEY` environment variable on the backend and provide it to the integrating platform.

## Environment variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | 3000 | API port |
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:5432/school_crm` | PostgreSQL connection |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection |
| `JWT_SECRET` |   | JWT signing key |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime |
| `MINIO_ENDPOINT` | `localhost` | MinIO host |
| `MINIO_PORT` | 9000 | MinIO port |
| `MINIO_ACCESS_KEY` | `minioadmin` | MinIO user |
| `MINIO_SECRET_KEY` | `minioadmin` | MinIO password |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origin |
| `ADMIN_API_KEY` |   | API key for multi-product Admin API access |
| `SMTP_HOST` |   | SMTP server (email) |
| `WHATSAPP_PHONE_NUMBER_ID` |   | WhatsApp Cloud API |
| `N8N_WEBHOOK_URL` |   | n8n automation webhook |
| `LOG_LEVEL` | `info` | Pino log level |

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3000/api` | Backend API base URL |

## Deployment

### Frontend → Vercel

```bash
cd frontend
VITE_API_URL=https://api.example.com/api npm run build
npx vercel --prod
```

### Frontend → Netlify

```bash
cd frontend
VITE_API_URL=https://api.example.com/api npm run build
npx netlify deploy --prod --dir=dist
```

### Backend → VPS (Docker Swarm)

1. Provision a VPS with Docker Engine 24+
2. `docker swarm init`
3. Clone repo, populate `.env.production`
4. `./deploy.sh`

Traefik auto-provisions Let's Encrypt TLS certificates for `API_DOMAIN`.

## Project structure

See `frontend/STRUCTURE.md` and `backend/STRUCTURE.md` for detailed file-by-file breakdown.
