#!/usr/bin/env bash
# Restore a ZEX-CRM Postgres dump into a disposable database.
# Refuses to restore into production-looking DB names unless forced.
#
# Usage:
#   PG_DATABASE_URL=postgres://.../zex_crm_restore_tmp \
#     ./zex/deploy/scripts/restore-postgres.sh ./zex-backups/zex-crm-pg-....sql.gz
#
# Never points at live production by default.

set -euo pipefail

FORCE=0
DUMP_PATH=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --force)
      FORCE=1
      shift
      ;;
    *)
      DUMP_PATH="$1"
      shift
      ;;
  esac
done

if [[ -z "${PG_DATABASE_URL:-}" ]]; then
  echo "PG_DATABASE_URL is required (target disposable DB)" >&2
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

DB_NAME="$(printf '%s' "${PG_DATABASE_URL}" | sed -E 's#.*/([^/?]+).*#\1#')"
case "${DB_NAME}" in
  *prod*|*production*|*live*)
    if [[ "${FORCE}" != "1" ]]; then
      echo "Refusing restore into database name '${DB_NAME}' without --force" >&2
      echo "Restore into a disposable DB first, verify workspace/object data, then plan cutover." >&2
      exit 1
    fi
    ;;
esac

echo "Restoring ${DUMP_PATH} into ${DB_NAME}"
gzip -dc "${DUMP_PATH}" | psql "${PG_DATABASE_URL}"
echo "Restore complete. Verify workspace/object data before any production cutover."
