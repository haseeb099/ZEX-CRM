import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { SecureHttpClientService } from 'src/engine/core-modules/secure-http-client/secure-http-client.service';

import {
  type ZexPlatformActionFeedResponse,
  type ZexPlatformAddCompanyBrainSourceRequest,
  type ZexPlatformAgentActionsResponse,
  type ZexPlatformAgentControlMutationResponse,
  type ZexPlatformAgentControlOverviewResponse,
  type ZexPlatformAgentUndoResponse,
  type ZexPlatformCompanyBrainListResponse,
  type ZexPlatformCreateCompanyBrainRequest,
  type ZexPlatformDiscoveryRunQueuedResponse,
  type ZexPlatformDiscoveryRunResponse,
  type ZexPlatformPatchCompanyBrainRequest,
  type ZexPlatformProspectCandidate,
  type ZexPlatformResearchPackage,
  type ZexPlatformResearchQueuedResponse,
  type ZexPlatformResearchRequest,
  type ZexPlatformStartDiscoveryRequest,
  type ZexPlatformTenantResolveResponse,
  type ZexPlatformWhyNowRequest,
  type ZexPlatformWhyNowSnapshot,
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

  private tenantPath(tenantId: string, suffix: string): string {
    return `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}${suffix}`;
  }

  private async withTenant(workspaceId: string) {
    const tenantId = await this.resolveTenantId(workspaceId);
    const client = this.getClient();

    return { tenantId, client };
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
    const { tenantId, client } = await this.withTenant(workspaceId);
    const response = await client.get<ZexPlatformActionFeedResponse>(
      this.tenantPath(tenantId, '/action-feed'),
    );

    return response.data;
  }

  async listCompanyBrains(
    workspaceId: string,
  ): Promise<ZexPlatformCompanyBrainListResponse> {
    const { tenantId, client } = await this.withTenant(workspaceId);
    const response = await client.get<ZexPlatformCompanyBrainListResponse>(
      this.tenantPath(tenantId, '/company-brain'),
    );

    return response.data;
  }

  async createCompanyBrain(
    workspaceId: string,
    body: ZexPlatformCreateCompanyBrainRequest,
  ): Promise<unknown> {
    const { tenantId, client } = await this.withTenant(workspaceId);
    const response = await client.post(
      this.tenantPath(tenantId, '/company-brain'),
      body,
    );

    return response.data;
  }

  async getCompanyBrain(
    workspaceId: string,
    brainId: string,
  ): Promise<unknown> {
    const { tenantId, client } = await this.withTenant(workspaceId);
    const response = await client.get(
      this.tenantPath(
        tenantId,
        `/company-brain/${encodeURIComponent(brainId)}`,
      ),
    );

    return response.data;
  }

  async addCompanyBrainSource(
    workspaceId: string,
    brainId: string,
    body: ZexPlatformAddCompanyBrainSourceRequest,
  ): Promise<unknown> {
    const { tenantId, client } = await this.withTenant(workspaceId);
    const response = await client.post(
      this.tenantPath(
        tenantId,
        `/company-brain/${encodeURIComponent(brainId)}/sources`,
      ),
      body,
    );

    return response.data;
  }

  async analyzeCompanyBrain(
    workspaceId: string,
    brainId: string,
    body: { sync?: boolean } = {},
  ): Promise<unknown> {
    const { tenantId, client } = await this.withTenant(workspaceId);
    const response = await client.post(
      this.tenantPath(
        tenantId,
        `/company-brain/${encodeURIComponent(brainId)}/analyze`,
      ),
      body,
    );

    return response.data;
  }

  async getCompanyBrainAnalysisJob(
    workspaceId: string,
    brainId: string,
    jobId: string,
  ): Promise<unknown> {
    const { tenantId, client } = await this.withTenant(workspaceId);
    const response = await client.get(
      this.tenantPath(
        tenantId,
        `/company-brain/${encodeURIComponent(brainId)}/analysis-jobs/${encodeURIComponent(jobId)}`,
      ),
    );

    return response.data;
  }

  async patchCompanyBrain(
    workspaceId: string,
    brainId: string,
    body: ZexPlatformPatchCompanyBrainRequest,
  ): Promise<unknown> {
    const { tenantId, client } = await this.withTenant(workspaceId);
    const response = await client.patch(
      this.tenantPath(
        tenantId,
        `/company-brain/${encodeURIComponent(brainId)}`,
      ),
      body,
    );

    return response.data;
  }

  async regenerateCompanyBrain(
    workspaceId: string,
    brainId: string,
  ): Promise<unknown> {
    const { tenantId, client } = await this.withTenant(workspaceId);
    const response = await client.post(
      this.tenantPath(
        tenantId,
        `/company-brain/${encodeURIComponent(brainId)}/regenerate`,
      ),
    );

    return response.data;
  }

  async startProspectDiscovery(
    workspaceId: string,
    body: ZexPlatformStartDiscoveryRequest,
  ): Promise<ZexPlatformDiscoveryRunQueuedResponse> {
    const { tenantId, client } = await this.withTenant(workspaceId);
    const response = await client.post<ZexPlatformDiscoveryRunQueuedResponse>(
      this.tenantPath(tenantId, '/prospect-discovery'),
      body,
    );

    return response.data;
  }

  async getProspectDiscoveryRun(
    workspaceId: string,
    runId: string,
  ): Promise<ZexPlatformDiscoveryRunResponse> {
    const { tenantId, client } = await this.withTenant(workspaceId);
    const response = await client.get<ZexPlatformDiscoveryRunResponse>(
      this.tenantPath(
        tenantId,
        `/prospect-discovery/${encodeURIComponent(runId)}`,
      ),
    );

    return response.data;
  }

  async listProspectDiscoveryCandidates(
    workspaceId: string,
    runId: string,
  ): Promise<{ candidates: ZexPlatformProspectCandidate[] }> {
    const { tenantId, client } = await this.withTenant(workspaceId);
    const response = await client.get<{
      candidates: ZexPlatformProspectCandidate[];
    }>(
      this.tenantPath(
        tenantId,
        `/prospect-discovery/${encodeURIComponent(runId)}/candidates`,
      ),
    );

    return response.data;
  }

  async getProspectCandidate(
    workspaceId: string,
    candidateId: string,
  ): Promise<ZexPlatformProspectCandidate> {
    const { tenantId, client } = await this.withTenant(workspaceId);
    const response = await client.get<ZexPlatformProspectCandidate>(
      this.tenantPath(
        tenantId,
        `/prospect-discovery/candidates/${encodeURIComponent(candidateId)}`,
      ),
    );

    return response.data;
  }

  async scoreProspectWhyNow(
    workspaceId: string,
    candidateId: string,
    body: ZexPlatformWhyNowRequest = {},
  ): Promise<ZexPlatformWhyNowSnapshot> {
    const { tenantId, client } = await this.withTenant(workspaceId);
    const response = await client.post<ZexPlatformWhyNowSnapshot>(
      this.tenantPath(
        tenantId,
        `/prospects/${encodeURIComponent(candidateId)}/why-now`,
      ),
      body,
    );

    return response.data;
  }

  async getProspectWhyNow(
    workspaceId: string,
    candidateId: string,
  ): Promise<ZexPlatformWhyNowSnapshot> {
    const { tenantId, client } = await this.withTenant(workspaceId);
    const response = await client.get<ZexPlatformWhyNowSnapshot>(
      this.tenantPath(
        tenantId,
        `/prospects/${encodeURIComponent(candidateId)}/why-now`,
      ),
    );

    return response.data;
  }

  async approveProspectCandidate(
    workspaceId: string,
    candidateId: string,
  ): Promise<unknown> {
    const { tenantId, client } = await this.withTenant(workspaceId);
    const response = await client.post(
      this.tenantPath(
        tenantId,
        `/prospect-discovery/candidates/${encodeURIComponent(candidateId)}/approve`,
      ),
    );

    return response.data;
  }

  async rejectProspectCandidate(
    workspaceId: string,
    candidateId: string,
  ): Promise<unknown> {
    const { tenantId, client } = await this.withTenant(workspaceId);
    const response = await client.post(
      this.tenantPath(
        tenantId,
        `/prospect-discovery/candidates/${encodeURIComponent(candidateId)}/reject`,
      ),
    );

    return response.data;
  }

  async createProspectCandidateInCrm(
    workspaceId: string,
    candidateId: string,
  ): Promise<unknown> {
    const { tenantId, client } = await this.withTenant(workspaceId);
    const response = await client.post(
      this.tenantPath(
        tenantId,
        `/prospect-discovery/candidates/${encodeURIComponent(candidateId)}/create`,
      ),
    );

    return response.data;
  }

  async retryCreateProspectCandidate(
    workspaceId: string,
    candidateId: string,
  ): Promise<unknown> {
    const { tenantId, client } = await this.withTenant(workspaceId);
    const response = await client.post(
      this.tenantPath(
        tenantId,
        `/prospect-discovery/candidates/${encodeURIComponent(candidateId)}/retry-create`,
      ),
    );

    return response.data;
  }

  async startProspectResearch(
    workspaceId: string,
    candidateId: string,
    body: ZexPlatformResearchRequest = {},
  ): Promise<ZexPlatformResearchQueuedResponse> {
    const { tenantId, client } = await this.withTenant(workspaceId);
    const response = await client.post<ZexPlatformResearchQueuedResponse>(
      this.tenantPath(
        tenantId,
        `/prospects/${encodeURIComponent(candidateId)}/research`,
      ),
      body,
    );

    return response.data;
  }

  async getProspectResearchLatest(
    workspaceId: string,
    candidateId: string,
  ): Promise<ZexPlatformResearchPackage> {
    const { tenantId, client } = await this.withTenant(workspaceId);
    const response = await client.get<ZexPlatformResearchPackage>(
      this.tenantPath(
        tenantId,
        `/prospects/${encodeURIComponent(candidateId)}/research/latest`,
      ),
    );

    return response.data;
  }

  async getProspectResearchRun(
    workspaceId: string,
    candidateId: string,
    runId: string,
  ): Promise<ZexPlatformResearchPackage> {
    const { tenantId, client } = await this.withTenant(workspaceId);
    const response = await client.get<ZexPlatformResearchPackage>(
      this.tenantPath(
        tenantId,
        `/prospects/${encodeURIComponent(candidateId)}/research/${encodeURIComponent(runId)}`,
      ),
    );

    return response.data;
  }

  async approveSdrDraft(
    workspaceId: string,
    draftId: string,
    approvedBy: string,
  ): Promise<unknown> {
    const { tenantId, client } = await this.withTenant(workspaceId);
    const response = await client.post(
      this.tenantPath(
        tenantId,
        `/sdr/drafts/${encodeURIComponent(draftId)}/approve`,
      ),
      { approvedBy },
    );

    return response.data;
  }

  async rejectSdrDraft(
    workspaceId: string,
    draftId: string,
    rejectedBy: string,
  ): Promise<unknown> {
    const { tenantId, client } = await this.withTenant(workspaceId);
    const response = await client.post(
      this.tenantPath(
        tenantId,
        `/sdr/drafts/${encodeURIComponent(draftId)}/reject`,
      ),
      { rejectedBy },
    );

    return response.data;
  }

  async confirmMeeting(
    workspaceId: string,
    sequenceId: string,
  ): Promise<unknown> {
    const { tenantId, client } = await this.withTenant(workspaceId);
    const response = await client.post(
      this.tenantPath(
        tenantId,
        `/sdr/sequences/${encodeURIComponent(sequenceId)}/meetings/confirm`,
      ),
    );

    return response.data;
  }

  async getAgentControlOverview(
    workspaceId: string,
    recentLimit = 10,
  ): Promise<ZexPlatformAgentControlOverviewResponse> {
    const { tenantId, client } = await this.withTenant(workspaceId);
    const response = await client.get<ZexPlatformAgentControlOverviewResponse>(
      this.tenantPath(tenantId, '/agents'),
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
    const { tenantId, client } = await this.withTenant(workspaceId);
    const response = await client.get<ZexPlatformAgentActionsResponse>(
      this.tenantPath(tenantId, '/agent-actions'),
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
    const { tenantId, client } = await this.withTenant(workspaceId);
    const response = await client.post<ZexPlatformAgentControlMutationResponse>(
      this.tenantPath(tenantId, `/agents/${encodeURIComponent(agentId)}/pause`),
      { triggeredBy },
    );

    return response.data;
  }

  async resumeAgent(
    workspaceId: string,
    agentId: string,
    triggeredBy: string,
  ): Promise<ZexPlatformAgentControlMutationResponse> {
    const { tenantId, client } = await this.withTenant(workspaceId);
    const response = await client.post<ZexPlatformAgentControlMutationResponse>(
      this.tenantPath(
        tenantId,
        `/agents/${encodeURIComponent(agentId)}/resume`,
      ),
      { triggeredBy },
    );

    return response.data;
  }

  async undoAgentAction(
    workspaceId: string,
    actionId: string,
    triggeredBy: string,
  ): Promise<ZexPlatformAgentUndoResponse> {
    const { tenantId, client } = await this.withTenant(workspaceId);
    const response = await client.post<ZexPlatformAgentUndoResponse>(
      this.tenantPath(
        tenantId,
        `/agent-actions/${encodeURIComponent(actionId)}/undo`,
      ),
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
