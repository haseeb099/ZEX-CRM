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
  const mockHttpClient = {
    get: mockGet,
    post: mockPost,
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
});
