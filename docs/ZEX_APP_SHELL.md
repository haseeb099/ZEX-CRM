# ZEX CRM App Shell

## Purpose

Customer-facing ZEX CRM shell inside the pinned Twenty application.

Product positioning: **ZEX — Autonomous Revenue OS**.

This establishes navigable primary product surfaces. It does not implement Company Brain, prospect discovery, Why-Now, AI SDR execution, or Agent Control Center logic.

## Navigation

Primary ZEX navigation (exact order):

1. **Today** → `/zex/today`
2. **Prospects** → `/zex/prospects`
3. **Customers** → `/zex/customers`
4. **Pipeline** → native Opportunities (`/objects/opportunities`; `/zex/pipeline` redirects)
5. **Agents** → `/zex/agents`

Section label in the drawer: **ZEX**.

Existing Twenty routes (People, Companies, Opportunities, Settings, etc.) remain available alongside the ZEX section.

## Architecture

ZEX UI lives under:

```text
packages/twenty-front/src/modules/zex/
```

**Chosen approach:** isolated ZEX-owned frontend modules + minimal Twenty core hooks.

**Not chosen:** Twenty App Framework / front-components / workspace `NavigationMenuItem` definitions as the primary shell.

### Why

In this pinned Twenty version:

- App Framework front-components are sandboxed widgets (side panel, timeline, page-layout widgets), not SPA route owners for `/zex/*`.
- Workspace `LINK` navigation menu items only support external `http(s)` URLs.
- `PAGE_LAYOUT` menu items target `/page/:pageLayoutId`, not branded `/zex/*` paths.

Therefore the safest upgradeable path is:

1. Own all ZEX pages/nav constants under `modules/zex/`
2. Register `/zex/*` on the authenticated workspace router (same pattern as Workflow Core / Settings catch-all)
3. Inject a small ZEX section into the main navigation drawer
4. Prefer ZEX Today as the desktop post-login landing path

## Twenty integration

| ZEX surface | Native reuse |
|-------------|--------------|
| Pipeline | Native Opportunities index (`AppPath.OpportunitiesPage`) |
| Prospects | Links into People + Companies record indexes |
| Customers | Links into Companies + People record indexes |
| Today / Agents | Shell placeholders only |
| Layout / chrome | `PageCardLayout`, `PageCardHeader`, `NavigationDrawerItem`, `SettingsCard`, Twenty icons |

Routes are registered under `MainAppLayoutWithSidePanel` inside `DefaultLayout`, so they inherit authenticated workspace gating via `PageChangeEffect` (unauthenticated users redirect to `/welcome`).

## Core modifications

Generic Twenty-core files touched for this shell:

1. `packages/twenty-shared/src/types/AppPath.ts` — ZEX path enum entries for collision safety
2. `packages/twenty-front/src/modules/app/hooks/useCreateWorkspaceAppRouter.tsx` — register `/zex/*`
3. `packages/twenty-front/src/modules/navigation/components/MainNavigationDrawerScrollableItems.tsx` — render `ZexNavigationSection`
4. `packages/twenty-front/src/modules/navigation/hooks/useDefaultHomePagePath.ts` — desktop landing → `/zex/today`
5. `packages/twenty-front/src/modules/navigation/hooks/__tests__/useDefaultHomePagePath.test.ts` — landing expectations

Every intentional core touch is listed in `zex/twenty-upstream.json` under `knownZexCorePatches`.

## Upgrade safety

- Prefer ZEX-owned modules over broader Twenty forks.
- Upstream pin remains `99e2c474a3dc256256543be405ef3c7702a63926` (`zex/twenty-upstream.json`).
- CI workflow `.github/workflows/ci-zex-upstream-guard.yaml` fails if `packages/twenty-*` changes without updating the manifest.
- Do not upgrade Twenty in shell/feature PRs; upgrade only via deliberate baseline PRs.

## Landing / default route

After login on desktop (metadata loaded), default home is `/zex/today`.

Mobile still uses `/home`.

Unauthenticated users never receive public ZEX pages.

## Current placeholders

| Surface | Status |
|---------|--------|
| Today priority actions / signals / agent activity / pipeline attention | Shell cards only |
| Prospects discovery engine | Not built; native People/Companies links |
| Customers Customer Memory enrichment | Not built; native Companies/People links |
| Pipeline board | Native Opportunities (no rebuild) |
| Agents Research / AI SDR / Meeting-Deal | Not configured / Ready soon — no send/actions |

## Next modules

- Company Brain
- Prospect discovery + enrichment
- Why-Now scoring
- Research Agent / AI SDR / Meeting & Deal agents
- Agent Control Center
- Live Today backend feeds from ZEX-Platform (via authenticated server boundary only)
