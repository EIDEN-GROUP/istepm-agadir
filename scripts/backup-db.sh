#!/usr/bin/env bash
set -euo pipefail

# PostgreSQL Database Backup Script
#
# Creates daily compressed backups with 30-day retention.
# Designed to run as a Docker service on a schedule.
#
# Environment variables:
#   DB_PASSWORD     (required)
#   DB_HOST         (default: postgres)
#   DB_PORT         (default: 5432)
#   DB_NAME         (default: school_crm)
#   DB_USER         (default: postgres)
#   BACKUP_DIR      (default: /backups)
#   RETENTION_DAYS  (default: 30)

# ── Config ───────────────────────────────────────────────────
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-school_crm}"
DB_USER="${DB_USER:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
FILENAME="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

# ── Ensure backup directory exists ──────────────────────────
mkdir -p "$BACKUP_DIR"

# ── Run pg_dump ─────────────────────────────────────────────
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting backup: $DB_NAME@$DB_HOST:$DB_PORT"
PGPASSWORD="${DB_PASSWORD}" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-owner \
  --no-acl \
  --compress=9 \
  -f "$FILENAME"

# ── Verify backup ───────────────────────────────────────────
if [ -f "$FILENAME" ]; then
  SIZE=$(du -h "$FILENAME" | cut -f1)
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✓ Backup created: $FILENAME ($SIZE)"
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✗ Backup failed!"
  exit 1
fi

# ── Remove backups older than retention period ──────────────
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +"${RETENTION_DAYS}" -delete
echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✓ Old backups cleaned (retention: ${RETENTION_DAYS} days)"

# ── Create a symlink to the latest backup ───────────────────
ln -sf "$FILENAME" "${BACKUP_DIR}/${DB_NAME}_latest.sql.gz"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✓ Symlink updated: ${DB_NAME}_latest.sql.gz"
