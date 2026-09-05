import { GUARDS_METADATA } from '@nestjs/common/constants';

import { TokenModule } from 'src/engine/core-modules/auth/token/token.module';
import { SecureHttpClientModule } from 'src/engine/core-modules/secure-http-client/secure-http-client.module';
import { ZexPlatformController } from 'src/engine/core-modules/zex-platform/zex-platform.controller';
import { ZexPlatformModule } from 'src/engine/core-modules/zex-platform/zex-platform.module';
import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';

describe('ZexPlatformModule', () => {
  it('imports TokenModule and WorkspaceCacheStorageModule for JwtAuthGuard DI', () => {
    const imports = Reflect.getMetadata(
      'imports',
      ZexPlatformModule,
    ) as unknown[];

    expect(imports).toEqual(
      expect.arrayContaining([
        SecureHttpClientModule,
        TokenModule,
        WorkspaceCacheStorageModule,
      ]),
    );
  });

  it('keeps JWT, workspace, and no-permission guards on the controller', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      ZexPlatformController,
    ) as unknown[];

    expect(guards).toEqual(
      expect.arrayContaining([
        JwtAuthGuard,
        WorkspaceAuthGuard,
        NoPermissionGuard,
      ]),
    );
    expect(guards).toHaveLength(3);
  });
});
