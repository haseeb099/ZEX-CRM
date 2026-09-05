# ZEX Agent Control Center (ZEX-39)

Operational Agents surface for ZEX CRM: workspace-authenticated browser → Twenty server proxy → ZEX Platform Agent Control API.

## Architecture

```text
Browser (JWT / session cookie)
  GET|POST  /rest/zex/agents*
  GET|POST  /rest/zex/agent-actions*
       ↓
twenty-server  ZexPlatformModule  (JwtAuthGuard + WorkspaceAuthGuard + NoPermissionGuard)
       ↓  Bearer ZEX_PLATFORM_ADMIN_API_KEY  (server env only)
ZEX Platform  /api/v1/admin/tenants/:tenantId/agents*
```

The browser never receives or sends `ZEX_PLATFORM_ADMIN_API_KEY`.

## Tenant resolution

Same fail-closed path as ZEX-37:

```text
AuthWorkspace.id
  → GET /api/v1/admin/tenants/by-workspace/:workspaceId
  → tenantId
  → tenant-scoped agent endpoints
```

No unscoped `ZEX_PLATFORM_TENANT_ID` override.

## Routes (Twenty REST)

| Method | Path | Platform upstream |
|--------|------|-------------------|
| GET | `/rest/zex/agents` | `GET .../tenants/:tenantId/agents` |
| GET | `/rest/zex/agent-actions` | `GET .../tenants/:tenantId/agent-actions` |
| POST | `/rest/zex/agents/:agentId/pause` | `POST .../agents/:agentId/pause` |
| POST | `/rest/zex/agents/:agentId/resume` | `POST .../agents/:agentId/resume` |
| POST | `/rest/zex/agent-actions/:actionId/undo` | `POST .../agent-actions/:actionId/undo` |

Contract version: `agent-control-v1`.

## UI (`/zex/agents`)

- Live agent overview from Platform (Research Agent + AI SDR in v1)
- Status, capabilities & safeguards, approval policy
- Recent action history with evidence / confidence / approval / reverse state
- Pause / Resume with pending protection and authoritative refetch
- Undo only when Platform returns `reversible: true` and `undo.status === 'available'`
- No second approval queue (Today remains approval UX)

## Safety

- No Platform admin key in frontend
- No optimistic control state as source of truth
- Irreversible domain actions show “Not reversible”
- Pause copy for AI SDR clarifies inbound reply / unsubscribe safety continues
