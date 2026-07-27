#!/usr/bin/env bash
set -euo pipefail

STACK_NAME="${1:-school-crm}"

if [ ! -f .env.production ]; then
  echo "Error: .env.production not found. Copy .env.production.example and fill in your values."
  exit 1
fi

echo ""
echo "╔═══════════════════════════════════════════════════╗"
echo "║  Deploying $STACK_NAME to Docker Swarm"
echo "╚═══════════════════════════════════════════════════╝"
echo ""

# ── 0. Registry config ──────────────────────────────────────
REGISTRY="ghcr.io/eiden-group/istepm-agadir"

# ── 1. Build or pull frontend image ──────────────────────────
if docker pull "$REGISTRY/school-crm-frontend:latest" >/dev/null 2>&1; then
  echo "→ Pulling frontend image..."
  docker pull "$REGISTRY/school-crm-frontend:latest"
else
  echo "→ Building frontend..."
  DOMAIN="$(grep -m1 '^DOMAIN=' .env.production 2>/dev/null | cut -d= -f2-)"
  DOMAIN="${DOMAIN:-localhost}"
  VITE_API_URL="https://${DOMAIN}/api"
  cd frontend
  npm ci
  VITE_API_URL="$VITE_API_URL" npm run build
  cd ..
  docker build -t "$REGISTRY/school-crm-frontend:latest" -f frontend/Dockerfile frontend/
fi

# ── 2. Build or pull backend image ──────────────────────────
if docker pull "$REGISTRY/school-crm-api:latest" >/dev/null 2>&1; then
  echo "→ Pulling backend image..."
  docker pull "$REGISTRY/school-crm-api:latest"
else
  echo "→ Building backend image..."
  docker build -t "$REGISTRY/school-crm-api:latest" -f backend/Dockerfile --target production backend/
fi

# ── 3. Build or pull backup image ───────────────────────────
if docker pull "$REGISTRY/school-crm-backup:latest" >/dev/null 2>&1; then
  echo "→ Pulling backup image..."
  docker pull "$REGISTRY/school-crm-backup:latest"
else
  echo "→ Building backup image..."
  docker build -t "$REGISTRY/school-crm-backup:latest" -f docker/Dockerfile.backup .
fi

# ── 4. Export env vars and deploy ────────────────────────────
set -a
. .env.production
set +a

echo "→ Deploying stack..."
docker stack deploy -c docker-compose.production.yml --with-registry-auth "$STACK_NAME"

echo ""
echo "╔═══════════════════════════════════════════════════╗"
echo "║  Deployment complete!"
echo "║"
echo "║  Check status: docker stack ps $STACK_NAME"
echo "║  View logs:    docker service logs ${STACK_NAME}_backend -f"
echo "╚═══════════════════════════════════════════════════╝"
echo ""
