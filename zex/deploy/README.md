# ZEX CRM production deployment assets

Provider-neutral production packaging for **ZEX-CRM**.

These files intentionally live under `zex/deploy/` so upstream
`packages/twenty-docker/docker-compose.yml` (which defaults to
`twentycrm/twenty:${TAG:-latest}`) is **not** the ZEX production path.

## Why not `twentycrm/twenty:latest`?

1. `latest` violates ZEX immutable pinning.
2. Upstream Twenty images do not include ZEX `/zex/*` UI or `/rest/zex/*` bridge.
3. Production must run the exact reviewed ZEX-CRM git revision.

## Build an immutable image

From the repository root (Git Bash / WSL / Linux CI):

```bash
./zex/deploy/scripts/build-zex-crm-image.sh
# Windows:
#   powershell -File zex/deploy/scripts/build-zex-crm-image.ps1
# optional registry prefix:
# ZEX_CRM_IMAGE_REPO=ghcr.io/<org>/zex-crm ./zex/deploy/scripts/build-zex-crm-image.sh
```

This builds `packages/twenty-docker/twenty/Dockerfile` `--target twenty` and tags:

- `zex-crm:<full-git-sha>`
- `zex-crm:<short-12-sha>`

`APP_VERSION` is set to `0.0.0+<full-git-sha>` (Twenty requires semver).
Never `:latest`.

## Configure

```bash
cp zex/deploy/.env.production.example zex/deploy/.env.production
# edit secrets — never commit .env.production
export ZEX_CRM_IMAGE=zex-crm:$(git rev-parse HEAD)
```

Required ZEX bridge (server/worker only):

- `ZEX_PLATFORM_BASE_URL`
- `ZEX_PLATFORM_ADMIN_API_KEY`

Do **not** set `ZEX_PLATFORM_TENANT_ID`.

## Validate

```bash
node zex/deploy/scripts/validate-production-config.cjs
node --test zex/deploy/__tests__/production-config.test.cjs
```

## Run (local production-parity)

```bash
docker compose \
  -f zex/deploy/docker-compose.production.yml \
  --env-file zex/deploy/.env.production \
  up -d
```

Server and worker always use the **same** `ZEX_CRM_IMAGE`.

## Smoke

```bash
CRM_BASE_URL=http://localhost:3000 node zex/deploy/scripts/smoke-production.cjs
# with auth:
# CRM_AUTH_HEADER='Authorization: Bearer <token>' CRM_BASE_URL=... node zex/deploy/scripts/smoke-production.cjs
```

Platform-outage drill:

```bash
# stop Platform, keep CRM up
EXPECT_PLATFORM_UNAVAILABLE=1 CRM_AUTH_HEADER='...' CRM_BASE_URL=... \
  node zex/deploy/scripts/smoke-production.cjs
```

## Backups

```bash
PG_DATABASE_URL=postgres://... ./zex/deploy/scripts/backup-postgres.sh --out-dir /secure/backups
PG_DATABASE_URL=postgres://.../disposable_db ./zex/deploy/scripts/restore-postgres.sh ./zex-backups/....sql.gz
```

Postgres backup does **not** cover Redis or object/`server-local-data` files.

## Full runbook

See [PRODUCTION_RUNBOOK.md](./PRODUCTION_RUNBOOK.md).

## Upstream pin

Twenty upstream baseline remains in `zex/twenty-upstream.json`
(`99e2c474a3dc256256543be405ef3c7702a63926`). These deploy files are ZEX-owned
and do not rewrite historical manifest entries.
