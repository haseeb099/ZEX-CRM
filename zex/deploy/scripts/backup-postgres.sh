#!/usr/bin/env bash
# Logical backup of ZEX-CRM Postgres (operational CRM truth).
# Does NOT back up Redis or object/file storage.
#
# Usage:
#   PG_DATABASE_URL=postgres://... ./zex/deploy/scripts/backup-postgres.sh
#   ./zex/deploy/scripts/backup-postgres.sh --out-dir /secure/backups
#
# Writes: <out-dir>/zex-crm-pg-<timestamp>-<release>.sql.gz (+ .meta.json)

set -euo pipefail

OUT_DIR="${ZEX_BACKUP_OUT_DIR:-./zex-backups}"
RELEASE="${ZEX_CRM_RELEASE:-$(git rev-parse HEAD 2>/dev/null || echo unknown)}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --out-dir)
      OUT_DIR="$2"
      shift 2
      ;;
    --release)
      RELEASE="$2"
      shift 2
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "${PG_DATABASE_URL:-}" ]]; then
  echo "PG_DATABASE_URL is required" >&2
  exit 1
fi
if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump is required" >&2
  exit 1
fi

mkdir -p "${OUT_DIR}"
SAFE_RELEASE="$(printf '%s' "${RELEASE}" | tr -c 'A-Za-z0-9._-' '_')"
BASE="zex-crm-pg-${TIMESTAMP}-${SAFE_RELEASE}"
DUMP_PATH="${OUT_DIR}/${BASE}.sql.gz"
META_PATH="${OUT_DIR}/${BASE}.meta.json"

echo "Creating Postgres backup ${DUMP_PATH}"
pg_dump --no-owner --format=plain "${PG_DATABASE_URL}" | gzip -c > "${DUMP_PATH}"

cat > "${META_PATH}" <<EOF
{
  "createdAt": "${TIMESTAMP}",
  "release": "${RELEASE}",
  "tool": "pg_dump",
  "format": "sql.gz",
  "file": "$(basename "${DUMP_PATH}")",
  "note": "Postgres only. Redis and object/local storage require separate backup."
}
EOF

echo "Wrote ${DUMP_PATH}"
echo "Wrote ${META_PATH}"
echo "Store off-host and encrypt at rest before production use."
