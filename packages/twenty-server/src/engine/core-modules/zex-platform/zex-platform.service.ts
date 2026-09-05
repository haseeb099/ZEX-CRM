import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { SecureHttpClientService } from 'src/engine/core-modules/secure-http-client/secure-http-client.service';

import {
  type ZexPlatformActionFeedResponse,
  type ZexPlatformAgentActionsResponse,
  type ZexPlatformAgentControlMutationResponse,
  type ZexPlatformAgentControlOverviewResponse,
  type ZexPlatformAgentUndoResponse,
  type ZexPlatformTenantResolveResponse,
} from './zex-platform.types';

@Injectable()
export class ZexPlatformService {
  constructor(
    private readonly secureHttpClientService: SecureHttpClientService,
  ) {}

  private getConfig() {
    const baseUrl = (process.env.ZEX_PLATFORM_BASE_URL ?? '').replace(
      /\/$/,
      '',
    );
    const adminApiKey = process.env.ZEX_PLATFORM_ADMIN_API_KEY ?? '';

    if (!isDefined(baseUrl) || baseUrl.length === 0 || !adminApiKey) {
      throw new ServiceUnavailableException(
        'ZEX Platform bridge is not configured on this server',
      );
    }

    return { baseUrl, adminApiKey };
  }

  private getClient() {
    const { baseUrl, adminApiKey } = this.getConfig();

    return this.secureHttpClientService.getHttpClient({
      baseURL: baseUrl,
      headers: {
        Authorization: `Bearer ${adminApiKey}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
  }

  // Always resolve via Platform workspace mapping — never accept an unscoped
  // ZEX_PLATFORM_TENANT_ID override (breaks multi-workspace tenant isolation).
  async resolveTenantId(workspaceId: string): Promise<string> {
    const client = this.getClient();
    const response = await client.get<ZexPlatformTenantResolveResponse>(
      `/api/v1/admin/tenants/by-workspace/${encodeURIComponent(workspaceId)}`,
    );

    return response.data.tenantId;
  }

  async getActionFeed(
    workspaceId: string,
  ): Promise<ZexPlatformActionFeedResponse> {
    const tenantId = await this.resolveTenantId(workspaceId);
    const client = this.getClient();
    const response = await client.get<ZexPlatformActionFeedResponse>(
      `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/action-feed`,
    );

    return response.data;
  }

  async approveProspectCandidate(
    workspaceId: string,
    candidateId: string,
  ): Promise<unknown> {
    const tenantId = await this.resolveTenantId(workspaceId);
    const client = this.getClient();
    const response = await client.post(
      `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/prospect-discovery/candidates/${encodeURIComponent(candidateId)}/approve`,
    );

    return response.data;
  }

  async rejectProspectCandidate(
    workspaceId: string,
    candidateId: string,
  ): Promise<unknown> {
    const tenantId = await this.resolveTenantId(workspaceId);
    const client = this.getClient();
    const response = await client.post(
      `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/prospect-discovery/candidates/${encodeURIComponent(candidateId)}/reject`,
    );

    return response.data;
  }

  async approveSdrDraft(
    workspaceId: string,
    draftId: string,
    approvedBy: string,
  ): Promise<unknown> {
    const tenantId = await this.resolveTenantId(workspaceId);
    const client = this.getClient();
    const response = await client.post(
      `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/sdr/drafts/${encodeURIComponent(draftId)}/approve`,
      { approvedBy },
    );

    return response.data;
  }

  async rejectSdrDraft(
    workspaceId: string,
    draftId: string,
    rejectedBy: string,
  ): Promise<unknown> {
    const tenantId = await this.resolveTenantId(workspaceId);
    const client = this.getClient();
    const response = await client.post(
      `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/sdr/drafts/${encodeURIComponent(draftId)}/reject`,
      { rejectedBy },
    );

    return response.data;
  }

  async confirmMeeting(
    workspaceId: string,
    sequenceId: string,
  ): Promise<unknown> {
    const tenantId = await this.resolveTenantId(workspaceId);
    const client = this.getClient();
    const response = await client.post(
      `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/sdr/sequences/${encodeURIComponent(sequenceId)}/meetings/confirm`,
    );

    return response.data;
  }

  async getAgentControlOverview(
    workspaceId: string,
    recentLimit = 10,
  ): Promise<ZexPlatformAgentControlOverviewResponse> {
    const tenantId = await this.resolveTenantId(workspaceId);
    const client = this.getClient();
    const response = await client.get<ZexPlatformAgentControlOverviewResponse>(
      `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/agents`,
      { params: { recentLimit } },
    );

    return response.data;
  }

  async listAgentActions(
    workspaceId: string,
    options: {
      agentId?: string;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<ZexPlatformAgentActionsResponse> {
    const tenantId = await this.resolveTenantId(workspaceId);
    const client = this.getClient();
    const response = await client.get<ZexPlatformAgentActionsResponse>(
      `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/agent-actions`,
      {
        params: {
          ...(options.agentId ? { agentId: options.agentId } : {}),
          ...(options.limit !== undefined ? { limit: options.limit } : {}),
          ...(options.offset !== undefined ? { offset: options.offset } : {}),
        },
      },
    );

    return response.data;
  }

  async pauseAgent(
    workspaceId: string,
    agentId: string,
    triggeredBy: string,
  ): Promise<ZexPlatformAgentControlMutationResponse> {
    const tenantId = await this.resolveTenantId(workspaceId);
    const client = this.getClient();
    const response = await client.post<ZexPlatformAgentControlMutationResponse>(
      `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/agents/${encodeURIComponent(agentId)}/pause`,
      { triggeredBy },
    );

    return response.data;
  }

  async resumeAgent(
    workspaceId: string,
    agentId: string,
    triggeredBy: string,
  ): Promise<ZexPlatformAgentControlMutationResponse> {
    const tenantId = await this.resolveTenantId(workspaceId);
    const client = this.getClient();
    const response = await client.post<ZexPlatformAgentControlMutationResponse>(
      `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/agents/${encodeURIComponent(agentId)}/resume`,
      { triggeredBy },
    );

    return response.data;
  }

  async undoAgentAction(
    workspaceId: string,
    actionId: string,
    triggeredBy: string,
  ): Promise<ZexPlatformAgentUndoResponse> {
    const tenantId = await this.resolveTenantId(workspaceId);
    const client = this.getClient();
    const response = await client.post<ZexPlatformAgentUndoResponse>(
      `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/agent-actions/${encodeURIComponent(actionId)}/undo`,
      { triggeredBy },
    );

    return response.data;
  }

  /** Test-only visibility for header wiring — never expose to HTTP responses. */
  getOutboundAuthHeaderForTests(): string | undefined {
    try {
      const { adminApiKey } = this.getConfig();

      return `Bearer ${adminApiKey}`;
    } catch {
      return undefined;
    }
  }
}
