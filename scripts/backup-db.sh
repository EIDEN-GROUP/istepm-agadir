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
#   BACKUP_ENCRYPTION_KEY (optional — if set, AES-256 encrypts the dump with gpg)

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

# ── Encrypt at rest (AES-256) when a key is provided ──────────
# The passphrase travels over a pipe, never on the process command line.
BACKUP_EXT=".sql.gz"
if [ -n "${BACKUP_ENCRYPTION_KEY:-}" ]; then
  printf '%s' "$BACKUP_ENCRYPTION_KEY" | gpg --batch --yes --passphrase-fd 0 \
    --symmetric --cipher-algo AES256 -o "${FILENAME}.gpg" "$FILENAME"
  rm -f "$FILENAME"
  FILENAME="${FILENAME}.gpg"
  BACKUP_EXT=".sql.gz.gpg"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✓ Backup encrypted: $FILENAME"
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⚠ BACKUP_ENCRYPTION_KEY unset — backup stored UNENCRYPTED"
fi
chmod 600 "$FILENAME"

# ── Remove backups older than retention period ──────────────
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz*" -mtime +"${RETENTION_DAYS}" -delete
echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✓ Old backups cleaned (retention: ${RETENTION_DAYS} days)"

# ── Create a symlink to the latest backup ───────────────────
ln -sf "$FILENAME" "${BACKUP_DIR}/${DB_NAME}_latest${BACKUP_EXT}"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✓ Symlink updated: ${DB_NAME}_latest${BACKUP_EXT} ($FILENAME)"
