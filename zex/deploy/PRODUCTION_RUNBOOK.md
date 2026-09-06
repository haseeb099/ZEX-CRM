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

1. Check out the reviewed release commit.
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

```bash
export ZEX_CRM_IMAGE=zex-crm:<full-git-sha>
docker compose \
  -f zex/deploy/docker-compose.production.yml \
  --env-file zex/deploy/.env.production \
  up -d
```

Guarantees:

- `server` and `worker` use the **same** `ZEX_CRM_IMAGE` reference.
- Worker sets `DISABLE_DB_MIGRATIONS=true` and `DISABLE_CRON_JOBS_REGISTRATION=true`.
- Server healthcheck probes `/healthz` before worker starts (`depends_on: service_healthy`).

Validate first:

```bash
node zex/deploy/scripts/validate-production-config.cjs
```

## 6. Migrations / startup model

Upstream entrypoint: `packages/twenty-docker/twenty/entrypoint.sh`.

On **server** (migrations enabled):

1. Detect empty DB → `yarn database:init:prod` when needed.
2. `yarn command:prod cache:flush`
3. `yarn command:prod upgrade`
4. Register cron jobs (`cron:register:all`) unless disabled.
5. `exec` main process (`node dist/main`).

On **worker**:

- Migrations disabled — no race with server.
- Starts only after server healthcheck passes.

Failure visibility:

- Entrypoint logs migration/upgrade output.
- Compose marks server unhealthy until `/healthz` succeeds (`retries` + `start_period`).
- Do not route traffic until server is healthy.

Do not invent a parallel migration engine.

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
- Restore into a **disposable** DB first (`restore-postgres.sh` refuses `*prod*` names without `--force`).
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

## 10. Health

```bash
curl -f "$SERVER_URL/healthz"
docker compose -f zex/deploy/docker-compose.production.yml ps
```

Expect:

- server healthy
- db healthy
- redis healthy
- worker running (depends on healthy server)

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

1. Confirm CRM `/healthz` still ok.
2. `EXPECT_PLATFORM_UNAVAILABLE=1` + auth → bridge endpoints fail gracefully.
3. Restore Platform; Retry / re-smoke succeeds.

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
