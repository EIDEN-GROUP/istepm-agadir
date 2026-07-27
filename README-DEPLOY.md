# school-CRM — Deployment Guide

> **Version:** 1.0.0  
> **Stack:** Fastify 5 + React 19 + PostgreSQL 16 + Redis 7 + MinIO  
> **Deployment:** Docker Swarm (backend) + Vercel/Netlify (frontend)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Environment Variables](#3-environment-variables)
4. [GitHub Repository Secrets](#4-github-repository-secrets)
5. [CI/CD Pipeline](#5-cicd-pipeline)
6. [Backend — Docker Swarm Deployment](#6-backend--docker-swarm-deployment)
7. [Frontend — Vercel / Netlify Deployment](#7-frontend--vercel--netlify-deployment)
8. [Post-Deployment Verification](#8-post-deployment-verification)
9. [Production Readiness Checklist](#9-production-readiness-checklist)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Architecture Overview

```
                          ┌──────────────────┐
                          │   Vercel /       │
                          │   Netlify        │
                          │   (React SPA)    │
                          └────────┬─────────┘
                                   │ HTTPS
                          ┌────────▼─────────┐    ┌───────────┐
                          │    Traefik       │────│   MinIO   │
                          │  (reverse proxy, │    │  (S3)     │
                          │   TLS, routing)  │    └───────────┘
                          └────────┬─────────┘
              ┌────────────────────┼────────────────────┐
              │                    │                    │
       ┌──────▼──────┐     ┌──────▼──────┐     ┌──────▼──────┐
       │   Fastify   │     │   BullMQ    │     │  Grafana +  │
       │   API       │     │   Worker    │     │  Loki +     │
       │  (Docker)   │     │  (Docker)   │     │  Prometheus │
       └──────┬──────┘     └──────┬──────┘     └─────────────┘
              │                   │
       ┌──────▼──────┐     ┌──────▼──────┐
       │ PostgreSQL  │     │   Redis     │
       └─────────────┘     └─────────────┘
```

### Services Summary

| Service | Port(s) | Description |
|---------|---------|-------------|
| **Traefik** | 80, 443 | Reverse proxy + Let's Encrypt TLS |
| **PostgreSQL** | 5432 | Primary database |
| **Redis** | 6379 | Cache + BullMQ job queue |
| **MinIO** | 9000, 9001 | S3-compatible object storage (exam documents) |
| **Backend API** | 3000 | Fastify REST API (2 replicas) |
| **Backend Worker** | — | BullMQ background job processor (1 replica) |
| **Frontend** | — | React SPA served by Vercel/Netlify |

---

## 2. Prerequisites

### VPS Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| **CPU** | 2 cores | 4 cores |
| **RAM** | 4 GB | 8 GB |
| **Disk** | 40 GB SSD | 80 GB SSD |
| **OS** | Ubuntu 22.04+ | Ubuntu 24.04 LTS |
| **Docker** | Engine 24+ | Engine 27+ |
| **Docker Compose** | v2 | v2 |

### Software to Install on VPS

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker (Ubuntu)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Initialize Docker Swarm
docker swarm init

# Verify
docker info | grep -i swarm
docker node ls
```

### Domain Names

Two DNS A records pointing to your VPS IP:

| Domain | Purpose |
|--------|---------|
| `api.votredomaine.com` | Backend API (Traefik routing) |
| `crm.votredomaine.com` | Optional: for your own frontend hosting |

---

## 3. Environment Variables

### 3.1 Production Env File (`.env.production`)

Create this file at the **project root**. It's used by `docker stack deploy`.

> **Copy the template:** `cp .env.production.example .env.production`

#### Required Variables

| Variable | Description | How to Generate |
|----------|-------------|-----------------|
| `FRONTEND_DOMAIN` | Your frontend domain (e.g. `crm.votredomaine.com`) | Your domain |
| `API_DOMAIN` | API subdomain (e.g. `api.votredomaine.com`) | Your domain |
| `ACME_EMAIL` | Email for Let's Encrypt notifications | Your email |
| `DB_PASSWORD` | PostgreSQL password | `openssl rand -hex 16` |
| `REDIS_PASSWORD` | Redis password | `openssl rand -hex 16` |
| `MINIO_ACCESS_KEY` | MinIO access key | Your choice |
| `MINIO_SECRET_KEY` | MinIO secret key | `openssl rand -hex 32` |
| `JWT_SECRET` | JWT signing secret | `openssl rand -hex 32` |
| `ADMIN_API_KEY` | Admin API key | `openssl rand -base64 32` |
| `CORS_ORIGIN` | Frontend origin — **write the full URL** (`.env` files don't expand variables) | `https://crm.votredomaine.com` |

#### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_EXPIRES_IN` | JWT token lifetime | `7d` |
| `SMTP_HOST` | SMTP server hostname | — |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP username | — |
| `SMTP_PASS` | SMTP password | — |
| `FROM_EMAIL` | Sender email address | `noreply@school-crm.com` |
| `ADMIN_EMAIL` | Admin contact email | `admin@school-crm.com` |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp Cloud API phone ID | — |
| `WHATSAPP_ACCESS_TOKEN` | WhatsApp Cloud API token | — |
| `N8N_WEBHOOK_URL` | n8n automation webhook URL | — |
| `N8N_WEBHOOK_SECRET` | n8n webhook secret | — |
| `AI_API_KEY` | NVIDIA NIM API key | — |
| `AI_BASE_URL` | AI API base URL | `https://integrate.api.nvidia.com/v1` |
| `AI_MODEL` | AI model name | `meta/llama-3.1-8b-instruct` |
| `LOG_LEVEL` | Logging level | `info` |

### 3.2 Frontend Build Env

When building the frontend (locally or in CI), set:

```bash
VITE_API_URL=https://api.votredomaine.com/api
```

This gets baked into the static build output at `frontend/dist/`. There is no runtime `.env` on the frontend server.

---

## 4. GitHub Repository Secrets

For automated deployment or CI, add these secrets in **Settings → Secrets and variables → Actions**:

### Required for CI to Pass

| Secret | Value | Purpose |
|--------|-------|---------|
| *(none required)* | — | CI runs lint, type-check, and build only |

### Required for Automated VPS Deploy

| Secret Name | Description |
|------------|-------------|
| `VPS_HOST` | VPS IP address (e.g. `123.45.67.89`) |
| `VPS_USERNAME` | SSH username (usually `root`) |
| `VPS_SSH_KEY` | Private SSH key for VPS access |
| `DB_PASSWORD` | PostgreSQL password |
| `REDIS_PASSWORD` | Redis password |
| `JWT_SECRET` | JWT signing secret |
| `ADMIN_API_KEY` | Admin API key |
| `MINIO_ACCESS_KEY` | MinIO access key |
| `MINIO_SECRET_KEY` | MinIO secret key |
| `ACME_EMAIL` | Let's Encrypt email |
| `FRONTEND_DOMAIN` | Frontend domain |
| `API_DOMAIN` | API domain |

> **Note:** The current CI/CD pipeline does not include an automated deploy-to-VPS step. To add one, create a new job in `.github/workflows/ci-cd.yml` that SSHes into the VPS and runs `./deploy.sh`.

---

## 5. CI/CD Pipeline

The pipeline is defined in `.github/workflows/ci-cd.yml`.

### What It Does

On every push/PR to `main` or `develop`:

| Job | Steps | Fails On |
|-----|-------|----------|
| **Backend** | `npm ci` → `lint` → `tsc` | TypeScript errors |
| **Frontend** | `npm ci` → `lint` → `vite build + tsc` | TypeScript errors, build failures |

### What It Does NOT Do (Yet)

- ❌ Run database migrations
- ❌ Run end-to-end tests (no test suite exists yet)
- ❌ Deploy to VPS automatically
- ❌ Build & push Docker images to a registry

### Adding VPS Auto-Deploy

To add automated deployment, add this job to the CI pipeline:

```yaml
deploy:
  needs: [backend, frontend]
  runs-on: ubuntu-latest
  if: github.ref == 'refs/heads/main'
  steps:
    - uses: actions/checkout@v4

    - name: Deploy via SSH
      uses: appleboy/ssh-action@v1
      with:
        host: ${{ secrets.VPS_HOST }}
        username: ${{ secrets.VPS_USERNAME }}
        key: ${{ secrets.VPS_SSH_KEY }}
        script: |
          cd /opt/school-crm
          git pull origin main
          docker build -t school-crm-api:latest -f backend/Dockerfile --target production backend/
          docker stack deploy -c docker-compose.production.yml school-crm
```

---

## 6. Backend — Docker Swarm Deployment

### Step 1: Prepare the VPS

```bash
# SSH into your VPS
ssh root@your-vps-ip

# Clone the repository
cd /opt
git clone https://github.com/your-org/school-crm.git
cd school-crm

# Create .env.production from template
cp .env.production.example .env.production
nano .env.production  # Fill in all values
```

### Step 2: Deploy the Stack

```bash
# Run the deploy script
./deploy.sh

# Or manually:
docker build -t school-crm-api:latest -f backend/Dockerfile --target production backend/
docker stack deploy -c docker-compose.production.yml school-crm
```

### Step 3: Verify the Deployment

```bash
# Check service status
docker stack ps school-crm

# Check logs
docker service logs school-crm_backend --tail 50
docker service logs school-crm_backend-worker --tail 20

# Check health endpoint
curl https://api.votredomaine.com/health

# Check Traefik dashboard (if enabled)
curl -s http://localhost:8080/dashboard
```

### Step 4: Run Database Migrations

The production Docker image does **not** include `tsx` or the TypeScript source, so you cannot run migrations inside the running container.

**Option A — One-off migration container (recommended):**

```bash
# Run the migration using a temporary container with the development image
docker run --rm --network school-crm \
  -e DATABASE_URL="postgres://postgres:${DB_PASSWORD}@postgres:5432/school_crm" \
  -v $(pwd)/backend/src:/app/src \
  -v $(pwd)/backend/migrations:/app/migrations \
  school-crm-api:latest \
  npx tsx src/db/migrate.ts
```

**Option B — Run on the host before deploying:**

```bash
# From the project root, with a local PostgreSQL connection
cd backend
DATABASE_URL="postgres://postgres:yourpassword@localhost:5432/school_crm" npx tsx src/db/migrate.ts
```

> **Note:** Migrations run automatically in development via `docker/entrypoint.sh`. For production, you must run them once manually before or after the first deployment.

### Useful Docker Commands

```bash
# View all services
docker service ls

# Scale a service
docker service scale school-crm_backend=3

# Update a service after config change
docker service update school-crm_backend --force

# View logs
docker service logs school-crm_backend -f

# Remove the entire stack
docker stack rm school-crm
```

---

## 7. Frontend — Vercel / Netlify Deployment

The frontend is a static SPA. Deploy it to any static hosting provider.

### Option A: Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Build with the production API URL
cd frontend
VITE_API_URL=https://api.votredomaine.com/api npm run build

# Deploy
npx vercel --prod
```

**Vercel settings** (in dashboard):
- **Framework:** Vite
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Environment variable:** `VITE_API_URL=https://api.votredomaine.com/api`

The existing `vercel.json` handles SPA routing rewrites.

### Option B: Netlify

```bash
cd frontend
VITE_API_URL=https://api.votredomaine.com/api npm run build
npx netlify deploy --prod --dir=dist
```

**Netlify settings** (in dashboard):
- **Base directory:** `frontend`
- **Build command:** `npm run build`
- **Publish directory:** `frontend/dist`
- **Environment variable:** `VITE_API_URL=https://api.votredomaine.com/api`

The existing `netlify.toml` and `_headers` handle redirects and security headers.

---

## 8. Post-Deployment Verification

### API Health Check

```bash
curl https://api.votredomaine.com/health
# Expected: {"status":"ok","timestamp":"2026-07-27T..."}
```

### Database Check

```bash
# Verify tables exist
docker exec -it $(docker ps --filter name=school-crm-db -q) \
  psql -U postgres -d school_crm -c "\dt"
```

### MinIO Check

```bash
# Check bucket exists
docker exec -it $(docker ps --filter name=school-crm-minio-init -q) sh
```

### Full Flow Test

```bash
# 1. Login
curl -X POST https://api.votredomaine.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@school-crm.com","password":"..."}' \
  -w "\n"

# 2. Hit a protected endpoint with the returned token
curl https://api.votredomaine.com/api/etudiants \
  -H "Authorization: Bearer <TOKEN>"
```

---

## 9. Production Readiness Checklist

Before going live, verify each item:

### Security

- [ ] **JWT_SECRET** is a strong random string (not the default)
- [ ] **ADMIN_API_KEY** is a strong random string (not the default)
- [ ] **DB_PASSWORD** and **REDIS_PASSWORD** are set to strong values
- [ ] **CORS_ORIGIN** points to your actual frontend domain only
- [ ] **JWT_EXPIRES_IN** is set appropriately (24h recommended, not 7d)
- [ ] Backend npm vulnerabilities resolved (`npm audit fix` in `backend/`)
- [ ] `Content-Security-Policy` header added to `frontend/_headers`
- [ ] `Strict-Transport-Security` header added to `frontend/_headers`

### Infrastructure

- [ ] VPS firewall configured (allow ports 22, 80, 443 only)
- [ ] Regular database backups configured (`pg_dump` cron job)
- [ ] Monitoring set up (Docker logs, Traefik metrics)
- [ ] SSL certificates issued (Let's Encrypt via Traefik — automatic)
- [ ] Docker resource limits applied (already configured in compose file)
- [ ] Docker volumes persistent across restarts

### CI/CD

- [ ] `package-lock.json` committed for both frontend and backend
- [ ] CI pipeline passes on `main` branch
- [ ] ESLint configs committed and working
- [ ] Frontend build succeeds with production API URL

### Application

- [ ] Database migrations have been run
- [ ] Seed data loaded (optional: `npm run seed`)
- [ ] Admin user created (`node backend/scripts/create-admin.mjs`)
- [ ] BullMQ worker starts and connects (verify in logs)
- [ ] Frontend SPA loads and can reach the API
- [ ] Login works end-to-end
- [ ] Security headers served on the frontend

---

## 10. Troubleshooting

### Backend Container Crashes on Startup

**Issue:** Container exits immediately with error.  
**Check:** Ensure all required env vars are set in `.env.production`. The app validates them with Zod on startup.

```bash
docker service logs school-crm_backend --tail 50
```

### API Returns 502 Bad Gateway

**Issue:** Traefik cannot reach the backend.  
**Check:** The backend health check is passing:

```bash
docker service ps school-crm_backend
# Look for "Running" status, not "Failed"
```

### Frontend Shows Blank Page

**Issue:** SPA loads but nothing renders.  
**Check:** Browser console for errors. Common causes:
- `VITE_API_URL` was wrong at build time
- CORS mismatch between frontend origin and `CORS_ORIGIN`

### CORS Errors in Browser

**Issue:** Browser blocks API calls with CORS errors.  
**Fix:** Ensure `CORS_ORIGIN` in `.env.production` matches your frontend domain **exactly**, including protocol and port if any.

### Database Connection Refused

**Issue:** Backend cannot connect to PostgreSQL.  
**Check:**

```bash
# Test from inside the backend container
docker exec -it $(docker ps --filter name=school-crm_backend -q) sh
nc -zv postgres 5432
```

### Let's Encrypt Certificate Not Issued

**Issue:** Traefik logs show TLS certificate errors.  
**Check:** Ensure DNS A records for your domains point to the VPS IP, and port 80/443 are reachable from the internet.

```bash
docker service logs school-crm_traefik --tail 30
```

---

## Quick Reference — One-Line Commands

| Action | Command |
|--------|---------|
| Generate JWT secret | `openssl rand -hex 32` |
| Generate DB password | `openssl rand -hex 16` |
| Generate API key | `openssl rand -base64 32` |
| Build backend image | `docker build -t school-crm-api:latest -f backend/Dockerfile --target production backend/` |
| Deploy stack | `docker stack deploy -c docker-compose.production.yml school-crm` |
| View services | `docker stack ps school-crm` |
| View backend logs | `docker service logs school-crm_backend -f` |
| Scale backend | `docker service scale school-crm_backend=3` |
| Remove stack | `docker stack rm school-crm` |
| Frontend build | `VITE_API_URL=https://api.example.com/api npm run build` (from `frontend/`) |

---

> **Last updated:** July 27, 2026  
> **Questions?** Contact the development team.
