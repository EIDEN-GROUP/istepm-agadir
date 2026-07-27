# CI/CD Auto-Deploy Setup

## GitHub Secrets Required

Add these in **Settings → Secrets and variables → Actions → Secrets**:

| Secret | Description |
|--------|-------------|
| `VPS_HOST` | VPS IP address: `76.13.58.6` |
| `VPS_USERNAME` | SSH user: `istepm-agadir` |
| `VPS_SSH_KEY` | Private SSH key for CI to SSH into VPS (see below) |
| `ENV_PRODUCTION` | Full contents of `.env.production` file (base64-encoded or as-is) |
| `GHCR_PAT` | GitHub PAT with `read:packages` scope for VPS to pull images |

## SSH Key for GitHub Actions

The deploy key has already been generated on the VPS. To get the private key:

```bash
# On the VPS:
cat ~/.ssh/github-actions
```

Copy the entire output (including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`) and paste it as the `VPS_SSH_KEY` secret.

The public key is already in `~/.ssh/authorized_keys` on the VPS.

## GitHub Variable

Add this in **Settings → Secrets and variables → Actions → Variables**:

| Variable | Value |
|----------|-------|
| `DOMAIN` | `istepm-agadir.eiden-group.com` |

## GHCR Access for VPS

Create a GitHub Personal Access Token (Settings → Developer settings → Personal access tokens → Fine-grained tokens) with:
- **Repository access:** `EIDEN-GROUP/istepm-agadir`
- **Permissions:** `Contents: read`, `Packages: read`

Add this token as the `GHCR_PAT` secret.

Then on the VPS, test the token:
```bash
echo "YOUR_PAT" | docker login ghcr.io -u eiden-group --password-stdin
```

## How CI/CD Works

On every push/PR to `main` or `develop`:
1. **Backend CI** — `npm ci` → lint → test → build
2. **Frontend CI** — `npm ci` → lint → build (with VITE_API_URL)

On push to `main` only (after CI passes):
3. **Docker Build** — Build & push 3 images to GHCR:
   - `ghcr.io/eiden-group/school-crm-api`
   - `ghcr.io/eiden-group/school-crm-frontend`
   - `ghcr.io/eiden-group/school-crm-backup`
4. **Deploy** — SSH into VPS → pull images → `docker stack deploy` → run migrations

## Nginx Proxy

The existing `eiden-nginx` reverse proxy serves `istepm-agadir.eiden-group.com`:
- `/api/*` + `/health` → `localhost:3004` (backend Fastify)
- `/` → `localhost:3003` (frontend nginx)

SSL cert is managed by certbot with auto-renewal.

## Local Deployment

```bash
# On the VPS:
cd /home/istepm-agadir/istepm-agadir
./deploy.sh
```

## Architecture

```
User → https://istepm-agadir.eiden-group.com
  ↓
eiden-nginx (port 80/443, TLS termination)
  ├── /api/* → localhost:3004 → Backend Fastify (Docker Swarm)
  ├── /health → localhost:3004 → Backend health check
  └── / → localhost:3003 → Frontend nginx (Docker Swarm)
```
