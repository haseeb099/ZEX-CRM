#!/usr/bin/env bash
# Build an immutable ZEX-CRM production image from this repository source.
# Uses packages/twenty-docker/twenty/Dockerfile (target: twenty).
#
# Usage (from repo root):
#   ./zex/deploy/scripts/build-zex-crm-image.sh
#   ZEX_CRM_IMAGE_REPO=ghcr.io/example/zex-crm ./zex/deploy/scripts/build-zex-crm-image.sh
#
# Outputs tags:
#   <repo>:<full-git-sha>
#   <repo>:<short-12-sha>
# Never tags :latest.
# Refuses to build when git status --porcelain is non-empty (fail-closed).

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT_DIR"

if ! command -v git >/dev/null 2>&1; then
  echo "git is required" >&2
  exit 1
fi
if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required" >&2
  exit 1
fi
if ! command -v node >/dev/null 2>&1; then
  echo "node is required" >&2
  exit 1
fi

# Fail closed: dirty tree must never produce a SHA-tagged production image.
PROVENANCE_JSON="$(node zex/deploy/scripts/build-provenance.cjs assert-clean)"
FULL_SHA="$(node -e "const j=JSON.parse(process.argv[1]); process.stdout.write(j.headSha)" "${PROVENANCE_JSON}")"
FULL_TAG="$(node -e "const j=JSON.parse(process.argv[1]); process.stdout.write(j.fullTag)" "${PROVENANCE_JSON}")"
SHORT_TAG="$(node -e "const j=JSON.parse(process.argv[1]); process.stdout.write(j.shortTag)" "${PROVENANCE_JSON}")"
APP_SEMVER="$(node -e "const j=JSON.parse(process.argv[1]); process.stdout.write(j.appVersion)" "${PROVENANCE_JSON}")"

if [[ "${FULL_TAG}" == *":latest" ]] || [[ "${SHORT_TAG}" == *":latest" ]]; then
  echo "refusing to tag :latest" >&2
  exit 1
fi

echo "Building ZEX-CRM image from clean tree ${FULL_SHA}"
echo "  Dockerfile: packages/twenty-docker/twenty/Dockerfile"
echo "  target: twenty"
echo "  tags: ${FULL_TAG} ${SHORT_TAG}"
echo "  APP_VERSION (semver): ${APP_SEMVER}"

if ! docker build \
  -f packages/twenty-docker/twenty/Dockerfile \
  --target twenty \
  --build-arg "APP_VERSION=${APP_SEMVER}" \
  -t "${FULL_TAG}" \
  -t "${SHORT_TAG}" \
  .; then
  echo "docker build failed" >&2
  exit 1
fi

echo
echo "Built immutable ZEX-CRM image:"
echo "  ${FULL_TAG}"
echo "  ${SHORT_TAG}"
echo
echo "Export for compose:"
echo "  export ZEX_CRM_IMAGE=${FULL_TAG}"
echo "  export APP_VERSION=${APP_SEMVER}"
