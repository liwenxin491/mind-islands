#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env.local}"

if [[ -f "$ENV_FILE" ]]; then
  while IFS='=' read -r key value; do
    [[ -z "$key" || "$key" == \#* ]] && continue
    value="${value%$'\r'}"
    value="${value%\"}"
    value="${value#\"}"
    case "$key" in
      DATABASE_URL) DATABASE_URL="${DATABASE_URL:-$value}" ;;
      BACKUP_DIR) BACKUP_DIR="${BACKUP_DIR:-$value}" ;;
      BACKUP_S3_URI) BACKUP_S3_URI="${BACKUP_S3_URI:-$value}" ;;
    esac
  done < "$ENV_FILE"
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required." >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump is required. Install PostgreSQL client tools first." >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_file="$BACKUP_DIR/mind-islands-$timestamp.sql.gz"
sha_file="$backup_file.sha256"

pg_dump "$DATABASE_URL" --no-owner --no-privileges | gzip -9 > "$backup_file"
shasum -a 256 "$backup_file" > "$sha_file"
chmod 600 "$backup_file" "$sha_file"

echo "Wrote $backup_file"
echo "Wrote $sha_file"

if [[ -n "${BACKUP_S3_URI:-}" ]]; then
  if ! command -v aws >/dev/null 2>&1; then
    echo "BACKUP_S3_URI is set, but aws CLI is not installed." >&2
    exit 1
  fi
  aws s3 cp "$backup_file" "$BACKUP_S3_URI/"
  aws s3 cp "$sha_file" "$BACKUP_S3_URI/"
fi
