#!/usr/bin/env bash
# Restore a ZEX-CRM Postgres dump into a disposable database by default.
#
# Required:
#   RESTORE_DATABASE_URL  — restore target (prefer disposable)
# Optional:
#   PRODUCTION_DATABASE_URL — canonical production URL for equality checks
#   ALLOW_PRODUCTION_RESTORE=true
#   CONFIRM_PHRASE=RESTORE_PRODUCTION_CONFIRM
#
# Usage:
#   RESTORE_DATABASE_URL=postgres://.../zex_crm_restore_tmp \
#     ./zex/deploy/scripts/restore-postgres.sh ./zex-backups/zex-crm-pg-....sql.gz
#
# Destructive production restore is never the default.
# Any SQL statement failure aborts the restore (psql ON_ERROR_STOP).

set -euo pipefail

DUMP_PATH=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --force)
      echo "--force is removed; use ALLOW_PRODUCTION_RESTORE + CONFIRM_PHRASE against PRODUCTION_DATABASE_URL" >&2
      exit 1
      ;;
    *)
      DUMP_PATH="$1"
      shift
      ;;
  esac
done

# Prefer explicit restore URL; allow legacy PG_DATABASE_URL as restore target alias.
RESTORE_DATABASE_URL="${RESTORE_DATABASE_URL:-${PG_DATABASE_URL:-}}"

if [[ -z "${RESTORE_DATABASE_URL}" ]]; then
  echo "RESTORE_DATABASE_URL is required (disposable restore target)" >&2
  exit 1
fi
if [[ -z "${DUMP_PATH}" ]] || [[ ! -f "${DUMP_PATH}" ]]; then
  echo "dump path required" >&2
  exit 1
fi
if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required" >&2
  exit 1
fi
if ! command -v node >/dev/null 2>&1; then
  echo "node is required" >&2
  exit 1
fi
if ! command -v gzip >/dev/null 2>&1; then
  echo "gzip is required" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

# URL-equality gate (not hostname/database-name heuristics).
node "${ROOT_DIR}/zex/deploy/scripts/restore-safety.cjs" gate \
  --restore-url "${RESTORE_DATABASE_URL}" \
  --production-url "${PRODUCTION_DATABASE_URL:-}" \
  --allow "${ALLOW_PRODUCTION_RESTORE:-false}" \
  --confirm "${CONFIRM_PHRASE:-}"

echo "Restoring ${DUMP_PATH} into restore target (URL redacted)"
# Fail immediately on any SQL statement error.
gzip -dc "${DUMP_PATH}" | psql -v ON_ERROR_STOP=1 "${RESTORE_DATABASE_URL}"
echo "Restore complete. Verify workspace/object data before any production cutover."
echo "Note: Postgres restore does not restore object/file storage (server-local-data / S3)."
