# ZEX Repository Boundaries

## ZEX-CRM

Customer-facing CRM shell built on pinned Twenty.

Owns:
- CRM records and standard CRM workflows
- ZEX branding/configuration
- ZEX Twenty App and native UI surfaces
- deployment/runtime configuration for Twenty
- safe upstream upgrade automation

Primary customer navigation target:
- Today
- Prospects
- Customers
- Pipeline
- Agents

## ZEX-Platform

Proprietary revenue intelligence and agent platform.

Owns:
- tenant/workspace connection management
- Company Brain, ICP and personas
- prospect discovery and enrichment
- Why-Now / intent scoring
- Customer Memory and Revenue Graph
- agent runtime
- Research, SDR, Meeting and Deal agents
- integrations
- approvals, evidence, confidence and audit
- billing/control plane

## Connection

- CRM -> Platform: signed webhooks and ZEX APIs
- Platform -> CRM: REST/GraphQL
- ZEX App -> Platform: authenticated HTTPS APIs
- Agents -> tools: MCP/tool adapters where useful

MCP is not the synchronization backbone.

## Single UI principle

Customers should log into one ZEX experience. ZEX-Platform should not require a separate customer-facing operational UI for normal CRM work; its capabilities are surfaced through the ZEX App inside ZEX-CRM.
