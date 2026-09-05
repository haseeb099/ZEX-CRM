import { Test, type TestingModule } from '@nestjs/testing';

import { SecureHttpClientService } from 'src/engine/core-modules/secure-http-client/secure-http-client.service';
import { ZexPlatformService } from 'src/engine/core-modules/zex-platform/zex-platform.service';

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
      data: { tenantId: 'tenant-abc', workspaceId: 'ws-1' },
    });

    await expect(service.resolveTenantId('ws-1')).resolves.toBe('tenant-abc');

    expect(secureHttpClientService.getHttpClient).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'https://platform.example.test',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-admin-key',
        }),
      }),
    );
    expect(mockGet).toHaveBeenCalledWith(
      '/api/v1/admin/tenants/by-workspace/ws-1',
    );
  });

  it('uses tenant override without calling workspace resolve', async () => {
    process.env.ZEX_PLATFORM_TENANT_ID = 'override-tenant';

    await expect(service.resolveTenantId('ws-1')).resolves.toBe(
      'override-tenant',
    );
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('does not expose admin key in service surface beyond outbound auth header', () => {
    const header = service.getOutboundAuthHeaderForTests();

    expect(header).toMatch(/^Bearer /);
    expect(header?.endsWith('test-admin-key')).toBe(true);
  });

  it('throws when Platform bridge env is missing', async () => {
    delete process.env.ZEX_PLATFORM_ADMIN_API_KEY;

    await expect(service.getActionFeed('ws-1')).rejects.toMatchObject({
      status: 503,
    });
  });
});
