import {
  Controller,
  Get,
  Param,
  Post,
  UseFilters,
  UseGuards,
} from '@nestjs/common';

import { ApiPath } from 'twenty-shared/types';

import { RestApiExceptionFilter } from 'src/engine/api/rest/rest-api-exception.filter';
import { UserEntity } from 'src/engine/core-modules/user/user.entity';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { ZexPlatformService } from 'src/engine/core-modules/zex-platform/zex-platform.service';
import { AuthUser } from 'src/engine/decorators/auth/auth-user.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';

@Controller(`${ApiPath.Rest}/zex`)
@UseGuards(JwtAuthGuard, WorkspaceAuthGuard, NoPermissionGuard)
@UseFilters(RestApiExceptionFilter)
export class ZexPlatformController {
  constructor(private readonly zexPlatformService: ZexPlatformService) {}

  @Get('action-feed')
  getActionFeed(@AuthWorkspace() workspace: WorkspaceEntity) {
    return this.zexPlatformService.getActionFeed(workspace.id);
  }

  @Post('actions/prospects/:candidateId/approve')
  approveProspect(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Param('candidateId') candidateId: string,
  ) {
    return this.zexPlatformService.approveProspectCandidate(
      workspace.id,
      candidateId,
    );
  }

  @Post('actions/prospects/:candidateId/reject')
  rejectProspect(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Param('candidateId') candidateId: string,
  ) {
    return this.zexPlatformService.rejectProspectCandidate(
      workspace.id,
      candidateId,
    );
  }

  @Post('actions/sdr-drafts/:draftId/approve')
  approveSdrDraft(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Param('draftId') draftId: string,
    @AuthUser() user: UserEntity,
  ) {
    return this.zexPlatformService.approveSdrDraft(
      workspace.id,
      draftId,
      this.actorLabel(user),
    );
  }

  @Post('actions/sdr-drafts/:draftId/reject')
  rejectSdrDraft(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Param('draftId') draftId: string,
    @AuthUser() user: UserEntity,
  ) {
    return this.zexPlatformService.rejectSdrDraft(
      workspace.id,
      draftId,
      this.actorLabel(user),
    );
  }

  @Post('actions/sequences/:sequenceId/confirm-meeting')
  confirmMeeting(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Param('sequenceId') sequenceId: string,
  ) {
    return this.zexPlatformService.confirmMeeting(workspace.id, sequenceId);
  }

  private actorLabel(user: UserEntity): string {
    return user.email ?? user.id;
  }
}
