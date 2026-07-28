#!/bin/sh
set -e

echo "[entrypoint] Waiting 10s for PostgreSQL to be ready..."
sleep 10

echo "[entrypoint] Running initial backup..."
/usr/local/bin/backup-db.sh

echo "[entrypoint] Starting daily cron scheduler..."
exec crond -f -l 2
