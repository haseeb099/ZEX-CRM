import { Module } from '@nestjs/common';

import { SecureHttpClientModule } from 'src/engine/core-modules/secure-http-client/secure-http-client.module';

import { ZexPlatformController } from './zex-platform.controller';
import { ZexPlatformService } from './zex-platform.service';

@Module({
  imports: [SecureHttpClientModule],
  controllers: [ZexPlatformController],
  providers: [ZexPlatformService],
  exports: [ZexPlatformService],
})
export class ZexPlatformModule {}
