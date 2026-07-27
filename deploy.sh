#!/usr/bin/env bash
set -euo pipefail

# Deploy school-CRM to Docker Swarm
#
# Prerequisites:
#   - Docker Engine 24+ with Swarm initialized (`docker swarm init`)
#   - .env.production file populated
#   - Ports 80 and 443 open on the VPS firewall
#
# Usage:
#   ./deploy.sh [stack-name]
#
# Default stack name: school-crm

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

# ── 1. Build the frontend (SPA) ─────────────────────────
echo "→ Building frontend..."

# Read DOMAIN from .env.production (without sourcing the whole file to avoid
# parsing issues with special characters in passwords)
DOMAIN="$(grep -m1 '^DOMAIN=' .env.production 2>/dev/null | cut -d= -f2-)"
DOMAIN="${DOMAIN:-localhost}"
VITE_API_URL="https://${DOMAIN}/api"

cd frontend
npm ci
VITE_API_URL="$VITE_API_URL" npm run build
cd ..

docker build -t school-crm-frontend:latest -f frontend/Dockerfile frontend/ \
  && echo "  ✓ Frontend image built"

# ── 2. Build the backend (API) ──────────────────────────
echo "→ Building backend image..."
docker build -t school-crm-api:latest -f backend/Dockerfile --target production backend/ \
  && echo "  ✓ Backend image built"

# ── 3. Build the backup image ───────────────────────────
echo "→ Building backup image..."
docker build -t school-crm-backup:latest -f docker/Dockerfile.backup . \
  && echo "  ✓ Backup image built"

# ── 4. Deploy the stack ─────────────────────────────────
echo "→ Deploying stack..."
docker stack deploy -c docker-compose.production.yml --with-registry-auth "$STACK_NAME" \
  && echo "  ✓ Stack deployed"

echo ""
echo "╔═══════════════════════════════════════════════════╗"
echo "║  Deployment complete!"
echo "║"
echo "║  Check status: docker stack ps $STACK_NAME"
echo "║  View logs:    docker service logs ${STACK_NAME}_backend -f"
echo "║  Visit:        https://\${DOMAIN}"
echo "╚═══════════════════════════════════════════════════╝"
echo ""
