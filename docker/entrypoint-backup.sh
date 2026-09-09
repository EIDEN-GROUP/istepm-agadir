#!/bin/sh
set -e

echo "[entrypoint] Waiting 10s for PostgreSQL to be ready..."
sleep 10

echo "[entrypoint] Running initial backup..."
/usr/local/bin/backup-db.sh

# NOTE: dcron's crond dies here with "setpgid: Operation not permitted"
# under Docker Swarm's restricted runtime, crash-looping the service.
# A 24h sleep loop provides the same daily cadence with zero privileges.
echo "[entrypoint] Backups now run on a 24h loop..."
while true; do
  sleep 86400
  /usr/local/bin/backup-db.sh || true
done
