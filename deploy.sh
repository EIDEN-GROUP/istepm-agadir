#!/usr/bin/env bash
set -euo pipefail

# Deploy school-CRM to Docker Swarm
#
# Prerequisites:
#   - Docker Engine 24+ with Swarm initialized (`docker swarm init`)
#   - .env.production file populated
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

echo "=== Deploying $STACK_NAME to Docker Swarm ==="

# Build backend image
echo "Building backend image..."
docker build -t school-crm-api:latest -f backend/Dockerfile --target production backend/

# Deploy the stack
echo "Deploying stack..."
docker stack deploy -c docker-compose.production.yml --with-registry-auth "$STACK_NAME"

echo "=== Done ==="
echo "Run 'docker stack ps $STACK_NAME' to check service status."
