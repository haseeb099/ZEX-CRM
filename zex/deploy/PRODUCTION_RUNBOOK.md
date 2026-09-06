# ZEX-CRM Production Runbook (ZEX-27)

Provider-neutral. Hosting selection happens after ChatGPT review of Platform + CRM ZEX-27 PRs.

## 1. Source provenance

| Item | Value |
| --- | --- |
| Repository | `haseeb099/ZEX-CRM` |
| Deploy assets | `zex/deploy/` |
| Image Dockerfile | `packages/twenty-docker/twenty/Dockerfile` (`--target twenty`) |
| Twenty upstream baseline | `99e2c474a3dc256256543be405ef3c7702a63926` (see `zex/twenty-upstream.json`) |
| Forbidden production image | `twentycrm/twenty:latest` |

Production must run an image built from the **exact reviewed ZEX-CRM commit**.

## 2. Image pin / version strategy

1. Check out the reviewed release commit on a **clean** working tree
   (`git status --porcelain` empty). Dirty trees are refused fail-closed by
   both Bash and PowerShell build scripts.
2. Build:

```bash
./zex/deploy/scripts/build-zex-crm-image.sh
```

3. Tag format (immutable):

- `zex-crm:<full-git-sha>` (preferred for `ZEX_CRM_IMAGE`)
- optional registry prefix via `ZEX_CRM_IMAGE_REPO`

4. Twenty validates `APP_VERSION` as **semver**. Build scripts bake
   `APP_VERSION=0.0.0+<full-git-sha>` into the image; set the same value in
   compose env. The **image tag** (not `APP_VERSION` alone) is the immutable
   deployment pin.
5. Never publish or deploy `:latest`.
6. Record the SHA in the change ticket / release notes.

The image includes ZEX modules compiled from this tree:

- `/zex/*` UI (Today, Agents, Prospects, Customers, …)
- `/rest/zex/*` Platform bridge
- ZEX-37 Action Feed + ZEX-39 Agent Control Center

## 3. Required environment

Copy `zex/deploy/.env.production.example` → private `.env.production`.

### Twenty core (minimum)

- `SERVER_URL`
- `PG_DATABASE_USER` / `PG_DATABASE_PASSWORD` / `PG_DATABASE_HOST` / `PG_DATABASE_PORT` / `PG_DATABASE_NAME` (or managed Postgres URL wired equivalently)
- `REDIS_URL`
- `ENCRYPTION_KEY` (and optional `FALLBACK_ENCRYPTION_KEY` during rotation)
- `APP_SECRET` if required by legacy instances
- `STORAGE_TYPE` (+ S3 fields when not local)

### ZEX bridge (server/worker only)

- `ZEX_PLATFORM_BASE_URL`
- `ZEX_PLATFORM_ADMIN_API_KEY`

### Forbidden

- `ZEX_PLATFORM_TENANT_ID` (workspace→tenant lookup must remain authoritative / fail-closed)
- Any `VITE_` / `REACT_APP_` / `NEXT_PUBLIC_` Platform admin key

Staging and production must use **different** secrets.

## 4. Networking

- Browser → CRM only (`SERVER_URL`, `/rest/zex/*`).
- CRM server/worker → Platform (`ZEX_PLATFORM_BASE_URL`) over a **private or otherwise authenticated server-side** route.
- Browser must never call Platform `/api/v1/admin/*`.
- Platform outage must not crash CRM boot; ZEX surfaces fail gracefully with Retry.

## 5. Compose deploy

Production order (fail-closed):

```text
backup
→ ZEX migration/upgrade gate
→ verify gate exit 0
→ compose up (server+worker with DISABLE_DB_MIGRATIONS=true)
→ ZEX readiness gate (liveness + Postgres + Redis)
→ authenticated smoke
→ promote
```

```bash
export ZEX_CRM_IMAGE=zex-crm:<full-git-sha>

# 1) Pre-deploy backup (see §7)
# 2) Fail-closed migration gate (does NOT start the long-running server)
./zex/deploy/scripts/run-production-migration-gate.sh \
  --compose zex/deploy/docker-compose.production.yml \
  --env-file zex/deploy/.env.production

# 3) Start server + worker (migrations disabled on both)
docker compose \
  -f zex/deploy/docker-compose.production.yml \
  --env-file zex/deploy/.env.production \
  up -d

# 4) Readiness (NOT the same as /healthz)
CRM_BASE_URL="$SERVER_URL" \
EXPECTED_IMAGE="$ZEX_CRM_IMAGE" \
DOCKER_COMPOSE_FILE=zex/deploy/docker-compose.production.yml \
DOCKER_COMPOSE_ENV_FILE=zex/deploy/.env.production \
  node zex/deploy/scripts/check-production-readiness.cjs
```

Guarantees:

- `server` and `worker` use the **same** `ZEX_CRM_IMAGE` reference.
- Both set `DISABLE_DB_MIGRATIONS=true` — production boot never migrates.
- Worker also sets `DISABLE_CRON_JOBS_REGISTRATION=true`.
- Compose `healthcheck` probes `/healthz` (process **liveness** only).
- Promotion requires the ZEX readiness gate (Postgres + Redis + liveness).

Validate first:

```bash
node zex/deploy/scripts/validate-production-config.cjs
```

## 6. Migrations / startup model

Upstream entrypoint (`packages/twenty-docker/twenty/entrypoint.sh`) treats
`cache:flush` / `upgrade` failures as **warnings** and continues startup.
That is **not** acceptable as the ZEX production promotion gate.

ZEX therefore owns a fail-closed pre-deploy gate:

`zex/deploy/scripts/production-migration-gate.cjs`
(wrapper: `zex/deploy/scripts/run-production-migration-gate.sh`)

Exact Twenty production commands invoked by the gate:

1. Detect empty DB (`core` schema missing) → `yarn database:init:prod` when needed
2. `yarn command:prod cache:flush` (requires log line `Cache flushed`; bounded timeout)
3. `yarn command:prod upgrade` (requires `Upgrade summary` with `0 workspace(s) failed`)
4. `yarn command:prod cache:flush` again

Any non-zero exit, missing success marker, or timeout → gate exits non-zero and
**blocks promotion**. Development commands (`migrate:dev`, `database:reset`, …)
are refused.

`cache:flush` boots the full Nest command app (imports `AppModule`) and needs a
reachable `REDIS_URL`. A wrong Redis URL can hang Nest bootstrap for a long
time — the gate therefore enforces `ZEX_MIGRATION_GATE_TIMEOUT_MS` (default 300s)
and treats timeout as failure. Do not skip `cache:flush`: upgrade can leave
stale workspace/metadata cache; the command is part of the pinned upstream
entrypoint sequence and remains required for ZEX promotion.

After the gate passes, start server + worker with migrations disabled so boot
cannot race or swallow upgrade failures.

## 7. Postgres backup policy

CRM Postgres is operational CRM truth (People, Companies, Opportunities, workspaces, …).

Pre-deploy / pre-migration:

```bash
PG_DATABASE_URL=... ./zex/deploy/scripts/backup-postgres.sh \
  --out-dir /secure/offhost/backups \
  --release "$(git rev-parse HEAD)"
```

Requirements:

- Off-host encrypted storage recommended.
- Timestamp + release metadata (`.meta.json`).
- Restore into a **disposable** DB first via `RESTORE_DATABASE_URL`.
- Safety is URL-equality based (not hostname/DB-name heuristics):
  - set `PRODUCTION_DATABASE_URL` to the canonical production URL
  - if `RESTORE_DATABASE_URL` equals production → refused unless
    `ALLOW_PRODUCTION_RESTORE=true` **and**
    `CONFIRM_PHRASE=RESTORE_PRODUCTION_CONFIRM`
- `psql -v ON_ERROR_STOP=1` — any SQL failure aborts restore non-zero.
- Verify workspace/object data before any cutover.
- No destructive production restore by default.

## 8. File / object storage backup

- `STORAGE_TYPE=local` uses volume `server-local-data` — **not** included in `pg_dump`.
- `STORAGE_TYPE=s3` requires separate bucket versioning/replication.
- Document and schedule storage backups independently from Postgres.

## 9. Redis policy

- Runtime cache / queue infrastructure for Twenty.
- Production compose uses `maxmemory-policy noeviction`.
- Redis is **not** a substitute for CRM DB backup.
- Flushing Redis is acceptable for cache recovery; it does not restore CRM rows.

## 10. Health vs readiness

| Check | Meaning |
| --- | --- |
| `GET /healthz` | Process **liveness** only (`health.check([])`). Stays 200 when DB/Redis are down. |
| `check-production-readiness.cjs` | Production **promotion** health: `/healthz` + Postgres + Redis (+ worker/image when configured). |

```bash
# Liveness only — do not treat as DB/Redis readiness
curl -f "$SERVER_URL/healthz"

# Promotion gate
CRM_BASE_URL="$SERVER_URL" \
PG_DATABASE_URL=... \
REDIS_URL=... \
EXPECTED_IMAGE="$ZEX_CRM_IMAGE" \
DOCKER_COMPOSE_FILE=zex/deploy/docker-compose.production.yml \
  node zex/deploy/scripts/check-production-readiness.cjs
```

Required readiness outcomes:

- CRM process alive + DB down → **FAIL**
- CRM process alive + Redis down → **FAIL**
- CRM + DB + Redis healthy → **PASS**

## 11. Production smoke

Against disposable smoke workspace when available (no real customer mutations by default):

```bash
CRM_BASE_URL="$SERVER_URL" node zex/deploy/scripts/smoke-production.cjs
CRM_AUTH_HEADER='Authorization: Bearer <token>' \
  CRM_BASE_URL="$SERVER_URL" \
  node zex/deploy/scripts/smoke-production.cjs
```

Checklist covered by helper + manual browser pass:

- login/authentication
- desktop `/` → `/zex/today`
- `/zex/today`, `/zex/agents`, `/zex/prospects`, `/zex/customers`
- Pipeline → native Opportunities; People; Companies
- `/rest/zex/agents`, `/rest/zex/action-feed`
- browser never calls Platform `/api/v1/admin/*`
- no Platform admin key / `ZEX_PLATFORM_TENANT_ID` in browser
- mobile `/` → `/home`
- unknown `/zex/*` fallback

Platform unavailable drill:

1. Confirm CRM `/healthz` still ok (**liveness** — expected even if Platform is down).
2. Confirm ZEX readiness still passes while Platform is down (Postgres/Redis unchanged).
3. `EXPECT_PLATFORM_UNAVAILABLE=1` + auth → bridge endpoints fail gracefully.
4. Restore Platform; Retry / re-smoke succeeds.

Helper exits **non-zero** on failures.

## 12. Rollback

1. Set `ZEX_CRM_IMAGE` to the **previous** immutable SHA tag.
2. Roll **server and worker together** to that same image (never mix SHAs).
3. Review DB migration caveats — do not assume every upgrade is automatically reversible; restore from pre-deploy Postgres backup into disposable DB if schema rollback is required.
4. Confirm storage compatibility (local volume / S3 objects remain).
5. Confirm Platform contract compatibility for that CRM SHA.
6. Verify `/healthz`, Today, Agents, and smoke helper after rollback.

## 13. Incident notes

- Missing `ZEX_PLATFORM_*` → ZEX surfaces error; CRM core should still boot.
- Accidental `latest` / upstream Twenty image → stop deploy; rebuild from ZEX SHA.
- Tenant override attempts → reject; fix env; rely on by-workspace mapping.
- Backup restore into production without verification → forbidden by default scripts.

## 14. Hosting

This runbook does not select AWS/Render/Railway/Fly/Kubernetes. Compose + image pin are portable. Operator maps volumes, secrets, TLS, and networking onto the chosen provider after review.
