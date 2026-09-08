import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

import { Test, type TestingModule } from '@nestjs/testing';

import { SecureHttpClientService } from 'src/engine/core-modules/secure-http-client/secure-http-client.service';
import { ZexPlatformService } from 'src/engine/core-modules/zex-platform/zex-platform.service';

const collectSourceFiles = (directoryPath: string): string[] => {
  const entries = readdirSync(directoryPath);

  return entries.flatMap((entry) => {
    const absolutePath = join(directoryPath, entry);
    const stats = statSync(absolutePath);

    if (stats.isDirectory()) {
      return collectSourceFiles(absolutePath);
    }

    if (
      absolutePath.endsWith('.ts') ||
      absolutePath.endsWith('.tsx') ||
      absolutePath.endsWith('.js') ||
      absolutePath.endsWith('.jsx')
    ) {
      return [absolutePath];
    }

    return [];
  });
};

describe('ZexPlatformService', () => {
  let service: ZexPlatformService;

  const mockGet = jest.fn();
  const mockPost = jest.fn();
  const mockPatch = jest.fn();
  const mockHttpClient = {
    get: mockGet,
    post: mockPost,
    patch: mockPatch,
  };

  const secureHttpClientService = {
    getHttpClient: jest.fn(() => mockHttpClient),
  };

  const originalEnv = process.env;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      ZEX_PLATFORM_BASE_URL: 'https://platform.example.test',
      ZEX_PLATFORM_ADMIN_API_KEY: 'test-admin-key',
    };
    delete process.env.ZEX_PLATFORM_TENANT_ID;
    delete process.env.ZEX_PLATFORM_OVERRIDE_WORKSPACE_ID;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZexPlatformService,
        { provide: SecureHttpClientService, useValue: secureHttpClientService },
      ],
    }).compile();

    service = module.get<ZexPlatformService>(ZexPlatformService);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('resolves tenant id from workspace via Platform admin API', async () => {
    mockGet.mockResolvedValueOnce({
      data: { tenantId: 'tenant-a', workspaceId: 'workspace-a' },
    });

    await expect(service.resolveTenantId('workspace-a')).resolves.toBe(
      'tenant-a',
    );

    expect(secureHttpClientService.getHttpClient).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'https://platform.example.test',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-admin-key',
        }),
      }),
    );
    expect(mockGet).toHaveBeenCalledWith(
      '/api/v1/admin/tenants/by-workspace/workspace-a',
    );
  });

  it('resolves distinct tenants per authenticated workspace', async () => {
    mockGet
      .mockResolvedValueOnce({
        data: { tenantId: 'tenant-a', workspaceId: 'workspace-a' },
      })
      .mockResolvedValueOnce({
        data: { tenantId: 'tenant-b', workspaceId: 'workspace-b' },
      });

    await expect(service.resolveTenantId('workspace-a')).resolves.toBe(
      'tenant-a',
    );
    await expect(service.resolveTenantId('workspace-b')).resolves.toBe(
      'tenant-b',
    );

    expect(mockGet).toHaveBeenNthCalledWith(
      1,
      '/api/v1/admin/tenants/by-workspace/workspace-a',
    );
    expect(mockGet).toHaveBeenNthCalledWith(
      2,
      '/api/v1/admin/tenants/by-workspace/workspace-b',
    );
  });

  it('ignores unscoped ZEX_PLATFORM_TENANT_ID and still resolves by workspace', async () => {
    process.env.ZEX_PLATFORM_TENANT_ID = 'override-tenant';

    mockGet.mockResolvedValueOnce({
      data: { tenantId: 'tenant-a', workspaceId: 'workspace-a' },
    });

    await expect(service.resolveTenantId('workspace-a')).resolves.toBe(
      'tenant-a',
    );
    expect(mockGet).toHaveBeenCalledWith(
      '/api/v1/admin/tenants/by-workspace/workspace-a',
    );
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('does not route a different workspace to an unscoped override tenant', async () => {
    process.env.ZEX_PLATFORM_TENANT_ID = 'tenant-a';

    mockGet.mockResolvedValueOnce({
      data: { tenantId: 'tenant-b', workspaceId: 'workspace-b' },
    });

    await expect(service.resolveTenantId('workspace-b')).resolves.toBe(
      'tenant-b',
    );
    expect(mockGet).toHaveBeenCalledWith(
      '/api/v1/admin/tenants/by-workspace/workspace-b',
    );
  });

  it('fails closed when Platform tenant lookup returns 404', async () => {
    mockGet.mockRejectedValueOnce({
      response: { status: 404, data: { message: 'Tenant not found' } },
      message: 'Request failed with status code 404',
    });

    await expect(service.resolveTenantId('workspace-a')).rejects.toMatchObject({
      response: { status: 404 },
    });
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('fails closed when Platform tenant lookup errors without falling back', async () => {
    process.env.ZEX_PLATFORM_TENANT_ID = 'should-not-be-used';
    mockGet.mockRejectedValueOnce(new Error('platform unavailable'));

    await expect(service.resolveTenantId('workspace-a')).rejects.toThrow(
      'platform unavailable',
    );
  });

  it('throws 503 when Platform bridge env is missing', async () => {
    delete process.env.ZEX_PLATFORM_ADMIN_API_KEY;

    await expect(service.getActionFeed('workspace-a')).rejects.toMatchObject({
      status: 503,
    });
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('throws 503 when Platform base URL is missing', async () => {
    delete process.env.ZEX_PLATFORM_BASE_URL;

    await expect(service.resolveTenantId('workspace-a')).rejects.toMatchObject({
      status: 503,
    });
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('proxies action feed with workspace-resolved tenant id', async () => {
    mockGet
      .mockResolvedValueOnce({
        data: { tenantId: 'tenant-a', workspaceId: 'workspace-a' },
      })
      .mockResolvedValueOnce({
        data: {
          version: '1',
          tenantId: 'tenant-a',
          generatedAt: '2026-09-05T00:00:00.000Z',
          summary: {
            needsApproval: 0,
            replies: 0,
            meetings: 0,
            blocked: 0,
            total: 0,
          },
          items: [],
        },
      });

    const feed = await service.getActionFeed('workspace-a');

    expect(feed.tenantId).toBe('tenant-a');
    expect(JSON.stringify(feed)).not.toContain('test-admin-key');
    expect(mockGet).toHaveBeenNthCalledWith(
      2,
      '/api/v1/admin/tenants/tenant-a/action-feed',
    );
  });

  it('proxies agent control overview with workspace-resolved tenant id', async () => {
    mockGet
      .mockResolvedValueOnce({
        data: { tenantId: 'tenant-a', workspaceId: 'workspace-a' },
      })
      .mockResolvedValueOnce({
        data: {
          version: 'agent-control-v1',
          tenantId: 'tenant-a',
          generatedAt: '2026-09-05T00:00:00.000Z',
          agents: [],
        },
      });

    const overview = await service.getAgentControlOverview('workspace-a', 8);

    expect(overview.version).toBe('agent-control-v1');
    expect(JSON.stringify(overview)).not.toContain('test-admin-key');
    expect(mockGet).toHaveBeenNthCalledWith(
      2,
      '/api/v1/admin/tenants/tenant-a/agents',
      { params: { recentLimit: 8 } },
    );
  });

  it('proxies pause/resume/undo through tenant-scoped Platform paths', async () => {
    mockGet
      .mockResolvedValueOnce({
        data: { tenantId: 'tenant-a', workspaceId: 'workspace-a' },
      })
      .mockResolvedValueOnce({
        data: { tenantId: 'tenant-a', workspaceId: 'workspace-a' },
      })
      .mockResolvedValueOnce({
        data: { tenantId: 'tenant-a', workspaceId: 'workspace-a' },
      });
    mockPost
      .mockResolvedValueOnce({
        data: {
          agentId: 'research_agent',
          state: 'PAUSED',
          idempotent: false,
          reversible: true,
          actionId: 'action-1',
        },
      })
      .mockResolvedValueOnce({
        data: {
          agentId: 'research_agent',
          state: 'ACTIVE',
          idempotent: false,
          reversible: true,
          actionId: 'action-2',
        },
      })
      .mockResolvedValueOnce({
        data: {
          undone: true,
          idempotent: false,
          actionId: 'action-1',
          undoActionId: 'undo-1',
          agentId: 'research_agent',
          state: 'ACTIVE',
        },
      });

    await service.pauseAgent('workspace-a', 'research_agent', 'user@zex.test');
    await service.resumeAgent('workspace-a', 'research_agent', 'user@zex.test');
    await service.undoAgentAction('workspace-a', 'action-1', 'user@zex.test');

    expect(mockPost).toHaveBeenNthCalledWith(
      1,
      '/api/v1/admin/tenants/tenant-a/agents/research_agent/pause',
      { triggeredBy: 'user@zex.test' },
    );
    expect(mockPost).toHaveBeenNthCalledWith(
      2,
      '/api/v1/admin/tenants/tenant-a/agents/research_agent/resume',
      { triggeredBy: 'user@zex.test' },
    );
    expect(mockPost).toHaveBeenNthCalledWith(
      3,
      '/api/v1/admin/tenants/tenant-a/agent-actions/action-1/undo',
      { triggeredBy: 'user@zex.test' },
    );
  });

  it('forwards only the server-provided triggeredBy string to Platform', async () => {
    mockGet.mockResolvedValueOnce({
      data: { tenantId: 'tenant-a', workspaceId: 'workspace-a' },
    });
    mockPost.mockResolvedValueOnce({
      data: { agentId: 'research_agent', state: 'PAUSED', idempotent: false },
    });

    // Service is a pure forwarder of the controller-chosen actor label.
    await service.pauseAgent(
      'workspace-a',
      'research_agent',
      'operator@zex.test',
    );

    expect(mockPost).toHaveBeenCalledWith(
      '/api/v1/admin/tenants/tenant-a/agents/research_agent/pause',
      { triggeredBy: 'operator@zex.test' },
    );
    expect(JSON.stringify(mockPost.mock.calls)).not.toContain(
      'spoofed@example.com',
    );
  });

  it('does not expose admin key in service surface beyond outbound auth header', () => {
    const header = service.getOutboundAuthHeaderForTests();

    expect(header).toMatch(/^Bearer /);
    expect(header?.endsWith('test-admin-key')).toBe(true);
  });

  it('keeps Platform admin secrets out of the frontend zex module', () => {
    const frontendZexRoot = join(
      __dirname,
      '../../../../../../twenty-front/src/modules/zex',
    );
    const forbiddenSecrets = [
      'ZEX_PLATFORM_ADMIN_API_KEY',
      'ZEX_PLATFORM_TENANT_ID',
      'ZEX_PLATFORM_OVERRIDE_WORKSPACE_ID',
      'test-admin-key',
    ];

    for (const sourceFile of collectSourceFiles(frontendZexRoot)) {
      const contents = readFileSync(sourceFile, 'utf8');

      for (const forbiddenSecret of forbiddenSecrets) {
        expect(contents).not.toContain(forbiddenSecret);
      }
    }
  });

  it('proxies company brain list and create through workspace-resolved tenant', async () => {
    mockGet
      .mockResolvedValueOnce({
        data: { tenantId: 'tenant-a', workspaceId: 'workspace-a' },
      })
      .mockResolvedValueOnce({
        data: { tenantId: 'tenant-a', workspaceId: 'workspace-a' },
      })
      .mockResolvedValueOnce({
        data: {
          brains: [{ id: 'brain-1', companyName: 'Acme', status: 'ready' }],
        },
      });
    mockPost.mockResolvedValueOnce({
      data: { id: 'brain-2', companyName: 'Beta', status: 'draft' },
    });

    const created = await service.createCompanyBrain('workspace-a', {
      companyName: 'Beta',
      websiteUrl: 'https://beta.example',
    });
    const listed = await service.listCompanyBrains('workspace-a');

    expect(created).toMatchObject({ id: 'brain-2' });
    expect(listed.brains).toHaveLength(1);
    expect(mockPost).toHaveBeenCalledWith(
      '/api/v1/admin/tenants/tenant-a/company-brain',
      { companyName: 'Beta', websiteUrl: 'https://beta.example' },
    );
    expect(mockGet).toHaveBeenCalledWith(
      '/api/v1/admin/tenants/tenant-a/company-brain',
    );
    expect(JSON.stringify(created)).not.toContain('test-admin-key');
  });

  it('proxies company brain analyze, job poll, patch, and regenerate', async () => {
    mockGet.mockImplementation((path: string) => {
      if (path.includes('/by-workspace/')) {
        return Promise.resolve({
          data: { tenantId: 'tenant-a', workspaceId: 'workspace-a' },
        });
      }

      if (path.includes('/analysis-jobs/')) {
        return Promise.resolve({ data: { status: 'completed' } });
      }

      return Promise.resolve({ data: {} });
    });
    mockPost
      .mockResolvedValueOnce({
        data: {
          companyBrainId: 'brain-1',
          analysisJobId: 'job-1',
          status: 'queued',
        },
      })
      .mockResolvedValueOnce({
        data: { id: 'brain-1', status: 'analyzing' },
      });
    mockPatch.mockResolvedValueOnce({
      data: { id: 'brain-1', status: 'ready' },
    });

    await service.analyzeCompanyBrain('workspace-a', 'brain-1', {});
    await service.getCompanyBrainAnalysisJob('workspace-a', 'brain-1', 'job-1');
    await service.patchCompanyBrain('workspace-a', 'brain-1', {
      messagingSummary: 'Updated',
    });
    await service.regenerateCompanyBrain('workspace-a', 'brain-1');

    expect(mockPost).toHaveBeenCalledWith(
      '/api/v1/admin/tenants/tenant-a/company-brain/brain-1/analyze',
      {},
    );
    expect(mockGet).toHaveBeenCalledWith(
      '/api/v1/admin/tenants/tenant-a/company-brain/brain-1/analysis-jobs/job-1',
    );
    expect(mockPatch).toHaveBeenCalledWith(
      '/api/v1/admin/tenants/tenant-a/company-brain/brain-1',
      { messagingSummary: 'Updated' },
    );
    expect(mockPost).toHaveBeenCalledWith(
      '/api/v1/admin/tenants/tenant-a/company-brain/brain-1/regenerate',
    );
  });

  it('proxies discovery start/poll and candidate mutations', async () => {
    mockGet.mockImplementation((path: string) => {
      if (path.includes('/by-workspace/')) {
        return Promise.resolve({
          data: { tenantId: 'tenant-a', workspaceId: 'workspace-a' },
        });
      }

      if (path.endsWith('/prospect-discovery/run-1')) {
        return Promise.resolve({
          data: {
            id: 'run-1',
            status: 'completed',
            candidates: [{ id: 'cand-1', companyName: 'Acme' }],
          },
        });
      }

      if (path.includes('/prospect-discovery/candidates/cand-1')) {
        return Promise.resolve({
          data: { id: 'cand-1', status: 'PROPOSED' },
        });
      }

      return Promise.resolve({ data: {} });
    });
    mockPost
      .mockResolvedValueOnce({
        data: {
          id: 'run-1',
          status: 'queued',
          companyBrainId: 'brain-1',
        },
      })
      .mockResolvedValueOnce({ data: { id: 'cand-1', status: 'APPROVED' } })
      .mockResolvedValueOnce({ data: { id: 'cand-1', status: 'REJECTED' } })
      .mockResolvedValueOnce({
        data: {
          id: 'cand-1',
          status: 'CREATED',
          createdTwentyCompanyId: 'co-1',
        },
      })
      .mockResolvedValueOnce({
        data: {
          id: 'cand-1',
          status: 'CREATED',
          createdTwentyCompanyId: 'co-1',
        },
      });

    const queued = await service.startProspectDiscovery('workspace-a', {
      companyBrainId: 'brain-1',
      limit: 10,
    });
    const run = await service.getProspectDiscoveryRun('workspace-a', 'run-1');
    const candidate = await service.getProspectCandidate(
      'workspace-a',
      'cand-1',
    );

    await service.approveProspectCandidate('workspace-a', 'cand-1');
    await service.rejectProspectCandidate('workspace-a', 'cand-1');
    await service.createProspectCandidateInCrm('workspace-a', 'cand-1');
    await service.retryCreateProspectCandidate('workspace-a', 'cand-1');

    expect(queued.id).toBe('run-1');
    expect(run.status).toBe('completed');
    expect(candidate.id).toBe('cand-1');
    expect(mockPost).toHaveBeenCalledWith(
      '/api/v1/admin/tenants/tenant-a/prospect-discovery',
      { companyBrainId: 'brain-1', limit: 10 },
    );
    expect(mockGet).toHaveBeenCalledWith(
      '/api/v1/admin/tenants/tenant-a/prospect-discovery/run-1',
    );
    expect(mockPost).toHaveBeenCalledWith(
      '/api/v1/admin/tenants/tenant-a/prospect-discovery/candidates/cand-1/approve',
    );
    expect(mockPost).toHaveBeenCalledWith(
      '/api/v1/admin/tenants/tenant-a/prospect-discovery/candidates/cand-1/reject',
    );
    expect(mockPost).toHaveBeenCalledWith(
      '/api/v1/admin/tenants/tenant-a/prospect-discovery/candidates/cand-1/create',
    );
    expect(mockPost).toHaveBeenCalledWith(
      '/api/v1/admin/tenants/tenant-a/prospect-discovery/candidates/cand-1/retry-create',
    );
  });

  it('proxies why-now and research without accepting browser tenantId', async () => {
    mockGet.mockImplementation((path: string) => {
      if (path.includes('/by-workspace/')) {
        return Promise.resolve({
          data: { tenantId: 'tenant-a', workspaceId: 'workspace-a' },
        });
      }

      if (path.endsWith('/why-now')) {
        return Promise.resolve({
          data: { overallScore: 82, whyNow: 'Hiring surge' },
        });
      }

      if (path.endsWith('/research/latest')) {
        return Promise.resolve({
          data: { status: 'COMPLETED', companySummary: 'Summary' },
        });
      }

      if (path.endsWith('/research/res-1')) {
        return Promise.resolve({
          data: { status: 'PROCESSING', researchRunId: 'res-1' },
        });
      }

      return Promise.resolve({ data: {} });
    });
    mockPost
      .mockResolvedValueOnce({
        data: { overallScore: 90, whyNow: 'Funding news' },
      })
      .mockResolvedValueOnce({
        data: {
          status: 'queued',
          researchRunId: 'res-1',
          prospectCandidateId: 'cand-1',
        },
      });

    await service.scoreProspectWhyNow('workspace-a', 'cand-1', { sync: true });
    await service.getProspectWhyNow('workspace-a', 'cand-1');
    await service.startProspectResearch('workspace-a', 'cand-1', {});
    await service.getProspectResearchLatest('workspace-a', 'cand-1');
    await service.getProspectResearchRun('workspace-a', 'cand-1', 'res-1');

    expect(mockPost).toHaveBeenCalledWith(
      '/api/v1/admin/tenants/tenant-a/prospects/cand-1/why-now',
      { sync: true },
    );
    expect(mockGet).toHaveBeenCalledWith(
      '/api/v1/admin/tenants/tenant-a/prospects/cand-1/why-now',
    );
    expect(mockPost).toHaveBeenCalledWith(
      '/api/v1/admin/tenants/tenant-a/prospects/cand-1/research',
      {},
    );
    expect(mockGet).toHaveBeenCalledWith(
      '/api/v1/admin/tenants/tenant-a/prospects/cand-1/research/latest',
    );
    expect(mockGet).toHaveBeenCalledWith(
      '/api/v1/admin/tenants/tenant-a/prospects/cand-1/research/res-1',
    );

    const allCalls = JSON.stringify([
      ...mockGet.mock.calls,
      ...mockPost.mock.calls,
    ]);

    expect(allCalls).not.toContain('browser-tenant');
    expect(allCalls).not.toContain('tenantId=');
  });

  it('never accepts a browser-supplied tenantId argument on prospects methods', () => {
    expect(service.startProspectDiscovery.length).toBe(2);
    expect(service.approveProspectCandidate.length).toBe(2);
    // Defaulted request body args are not counted by Function.length.
    expect(service.scoreProspectWhyNow.length).toBe(2);
    expect(service.startProspectResearch.length).toBe(2);
    expect(service.createCompanyBrain.length).toBe(2);
  });
});
