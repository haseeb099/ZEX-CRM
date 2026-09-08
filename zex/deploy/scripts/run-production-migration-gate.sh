#!/usr/bin/env bash
# Run the ZEX fail-closed migration gate inside the pinned CRM image.
# Does not start the long-running server process.
#
# Usage:
#   export ZEX_CRM_IMAGE=zex-crm:<sha>
#   ./zex/deploy/scripts/run-production-migration-gate.sh \
#     --compose zex/deploy/docker-compose.production.yml \
#     --env-file zex/deploy/.env.production
set -euo pipefail

COMPOSE_FILE="zex/deploy/docker-compose.production.yml"
ENV_FILE=""
TIMEOUT_MS="${ZEX_MIGRATION_GATE_TIMEOUT_MS:-300000}"
PROJECT_NAME=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --compose)
      COMPOSE_FILE="$2"
      shift 2
      ;;
    --env-file)
      ENV_FILE="$2"
      shift 2
      ;;
    --timeout-ms)
      TIMEOUT_MS="$2"
      shift 2
      ;;
    --project)
      PROJECT_NAME="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

if [[ -z "${ZEX_CRM_IMAGE:-}" ]]; then
  echo "ZEX_CRM_IMAGE is required" >&2
  exit 1
fi

COMPOSE_ARGS=(-f "$COMPOSE_FILE")
if [[ -n "$ENV_FILE" ]]; then
  COMPOSE_ARGS+=(--env-file "$ENV_FILE")
fi
if [[ -n "$PROJECT_NAME" ]]; then
  COMPOSE_ARGS+=(-p "$PROJECT_NAME")
fi

# Copy host gate script into the one-shot container via stdin mount is awkward;
# prefer running Twenty commands via node already present in the image, with the
# gate logic mounted from the repo when available.
REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
GATE_SCRIPT="$REPO_ROOT/zex/deploy/scripts/production-migration-gate.cjs"

if [[ ! -f "$GATE_SCRIPT" ]]; then
  echo "missing $GATE_SCRIPT" >&2
  exit 1
fi

echo "[migration-gate] image=${ZEX_CRM_IMAGE} timeoutMs=${TIMEOUT_MS}"
echo "[migration-gate] invoking Twenty production commands inside one-shot container"

docker compose "${COMPOSE_ARGS[@]}" run --rm --no-deps \
  --entrypoint sh \
  -e ZEX_MIGRATION_GATE_TIMEOUT_MS="$TIMEOUT_MS" \
  -e ZEX_MIGRATION_GATE_WORKDIR=/app/packages/twenty-server \
  -v "$GATE_SCRIPT:/zex-migration-gate.cjs:ro" \
  server \
  -c 'node /zex-migration-gate.cjs'
