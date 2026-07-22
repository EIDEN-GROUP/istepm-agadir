#!/bin/sh
set -e

echo "Running database migrations..."
npx tsx src/db/migrate.ts

echo "Starting backend..."
exec "$@"
