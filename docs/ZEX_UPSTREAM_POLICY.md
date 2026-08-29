# ZEX CRM — Twenty Upstream Policy

## Purpose

ZEX-CRM is the customer-facing CRM shell for ZEX. It must stay as close as practical to Twenty upstream so that security fixes, bug fixes and product upgrades can be adopted safely.

ZEX product intelligence belongs in ZEX-Platform and the ZEX Twenty App, not in broad Twenty core modifications.

## Current baseline

- Repository: `haseeb099/ZEX-CRM`
- Default branch: `main`
- Twenty upstream baseline commit: `99e2c474a3dc256256543be405ef3c7702a63926`
- Current ZEX-CRM head at policy creation: `8ea3af933461c8df4c01653862d8b8ced6758f32`
- Known custom commit above baseline: `8ea3af933461c8df4c01653862d8b8ced6758f32`
- Known custom patch purpose: Windows/local-development path compatibility and build handling.

The upstream baseline must be updated deliberately through a reviewed upgrade PR. Never track or deploy an unpinned `latest`/`main` release automatically.

## Allowed ZEX changes in this repository

Prefer changes in this order:

1. ZEX Twenty App / application-framework extensions.
2. ZEX branding and configuration exposed by supported extension points.
3. Deployment, infrastructure and upgrade automation.
4. Minimal core patches only when no supported extension point can satisfy the requirement.

## Prohibited by default

Do not put these in Twenty core:

- Company Brain
- ICP/persona logic
- enrichment orchestration
- intent / Why-Now scoring
- Customer Memory / Revenue Graph
- agent runtime or agent state
- external integration orchestration
- evidence/confidence/audit intelligence
- AI SDR / Meeting / Deal agent logic

Those belong in `ZEX-Platform` and are surfaced in the CRM through the ZEX App and stable APIs.

## Core patch rule

Every unavoidable Twenty-core patch must:

- be isolated and narrowly scoped;
- explain why the App Framework/API/configuration cannot solve it;
- include tests where practical;
- be listed in this document or a linked patch manifest;
- be revalidated during every upstream upgrade;
- be removable if Twenty later provides a supported extension point.

## Integration contract

- Twenty App Framework: customer-facing ZEX UI inside CRM.
- REST / GraphQL: deterministic reads and writes between ZEX-CRM and ZEX-Platform.
- Webhooks: CRM events into ZEX-Platform.
- MCP/tool adapters: agent tooling only; not the primary synchronization mechanism.

## Upgrade workflow

1. Select an explicit stable Twenty release/commit.
2. Create an upgrade branch/PR.
3. Compare upstream baseline -> candidate.
4. Reapply/revalidate the small ZEX patch set.
5. Build and run unit/integration tests.
6. Run ZEX CRM <-> ZEX Platform contract tests.
7. Test database migrations against a staging clone.
8. Deploy to staging and run smoke tests.
9. Manually approve production rollout.
10. Update the pinned baseline in this document after merge.

## Architecture boundary

Twenty owns operational CRM truth: People, Companies, Opportunities, Tasks, Notes, owners and pipeline state.

ZEX-Platform owns intelligence: Customer Memory, ICP, intent, Why-Now, research, evidence, confidence, relationship intelligence, agent state and agent audit.

This boundary is a non-negotiable architectural rule unless an ADR explicitly changes it.
