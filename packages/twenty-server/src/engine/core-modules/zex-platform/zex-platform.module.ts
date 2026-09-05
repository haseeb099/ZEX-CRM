import { Module } from '@nestjs/common';

import { TokenModule } from 'src/engine/core-modules/auth/token/token.module';
import { SecureHttpClientModule } from 'src/engine/core-modules/secure-http-client/secure-http-client.module';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';

import { ZexPlatformController } from './zex-platform.controller';
import { ZexPlatformService } from './zex-platform.service';

// TokenModule + WorkspaceCacheStorageModule are required for JwtAuthGuard
// (AccessTokenService + WorkspaceCacheStorageService), matching other JWT REST
// controllers such as ApplicationConnectionsModule.
@Module({
  imports: [SecureHttpClientModule, TokenModule, WorkspaceCacheStorageModule],
  controllers: [ZexPlatformController],
  providers: [ZexPlatformService],
  exports: [ZexPlatformService],
})
export class ZexPlatformModule {}
