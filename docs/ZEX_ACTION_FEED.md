# ZEX Action Feed (ZEX-37)

Live Today action feed for ZEX CRM: workspace-authenticated browser → Twenty server proxy → ZEX Platform admin API.

## Architecture

```text
Browser (JWT / session cookie)
  GET|POST  /rest/zex/*
       ↓
twenty-server  ZexPlatformModule  (JwtAuthGuard + WorkspaceAuthGuard)
       ↓  Bearer ZEX_PLATFORM_ADMIN_API_KEY  (server env only)
ZEX Platform  /api/v1/admin/tenants/...
```

The browser never receives or sends `ZEX_PLATFORM_ADMIN_API_KEY`. All Platform calls run server-side after resolving the workspace’s tenant.

## Routes (Twenty REST)

| Method | Path | Platform upstream |
|--------|------|-------------------|
| GET | `/rest/zex/action-feed` | `GET .../tenants/:tenantId/action-feed` |
| POST | `/rest/zex/actions/prospects/:candidateId/approve` | `POST .../prospect-discovery/candidates/:id/approve` |
| POST | `/rest/zex/actions/prospects/:candidateId/reject` | `POST .../prospect-discovery/candidates/:id/reject` |
| POST | `/rest/zex/actions/sdr-drafts/:draftId/approve` | `POST .../sdr/drafts/:id/approve` `{ approvedBy }` |
| POST | `/rest/zex/actions/sdr-drafts/:draftId/reject` | `POST .../sdr/drafts/:id/reject` `{ rejectedBy }` |
| POST | `/rest/zex/actions/sequences/:sequenceId/confirm-meeting` | `POST .../sdr/sequences/:id/meetings/confirm` |

Tenant resolution: `GET .../tenants/by-workspace/:workspaceId` using `AuthWorkspace.id`.

## Server environment variables

Set on **twenty-server** only (never in Vite / browser):

| Variable | Required | Description |
|----------|----------|-------------|
| `ZEX_PLATFORM_BASE_URL` | Yes | Platform base URL (e.g. `http://localhost:3000`) |
| `ZEX_PLATFORM_ADMIN_API_KEY` | Yes | Admin API key for Platform `/api/v1/admin/*` |
| `ZEX_PLATFORM_TENANT_ID` | No | Single-tenant staging override when workspace resolve is unavailable |

## Frontend

- Module: `packages/twenty-front/src/modules/zex/`
- Today page: `/zex/today` — summary strip + prioritized cards
- Fetch helper: `zexRestClient.ts` — uses workspace JWT or cookie auth (same rules as SSE/Apollo)
- Draft approve records `approvedBy` / `rejectedBy` from the authenticated user email; **does not auto-send** (Platform approve only)

## Core patches

Registered in `zex/twenty-upstream.json` under ZEX-37:

- `packages/twenty-server/src/engine/core-modules/core-engine.module.ts`
- `packages/twenty-server/src/engine/core-modules/zex-platform/*`
