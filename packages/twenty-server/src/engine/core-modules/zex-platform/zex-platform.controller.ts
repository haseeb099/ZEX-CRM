import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
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

  @Get('agents')
  getAgents(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Query('recentLimit') recentLimit?: string,
  ) {
    const parsedLimit = recentLimit ? Number(recentLimit) : 10;

    return this.zexPlatformService.getAgentControlOverview(
      workspace.id,
      Number.isFinite(parsedLimit) ? parsedLimit : 10,
    );
  }

  @Get('agent-actions')
  getAgentActions(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Query('agentId') agentId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.zexPlatformService.listAgentActions(workspace.id, {
      agentId,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Post('agents/:agentId/pause')
  pauseAgent(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Param('agentId') agentId: string,
    @AuthUser() user: UserEntity,
    @Body() body?: { triggeredBy?: string },
  ) {
    return this.zexPlatformService.pauseAgent(
      workspace.id,
      agentId,
      body?.triggeredBy ?? this.actorLabel(user),
    );
  }

  @Post('agents/:agentId/resume')
  resumeAgent(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Param('agentId') agentId: string,
    @AuthUser() user: UserEntity,
    @Body() body?: { triggeredBy?: string },
  ) {
    return this.zexPlatformService.resumeAgent(
      workspace.id,
      agentId,
      body?.triggeredBy ?? this.actorLabel(user),
    );
  }

  @Post('agent-actions/:actionId/undo')
  undoAgentAction(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Param('actionId') actionId: string,
    @AuthUser() user: UserEntity,
    @Body() body?: { triggeredBy?: string },
  ) {
    return this.zexPlatformService.undoAgentAction(
      workspace.id,
      actionId,
      body?.triggeredBy ?? this.actorLabel(user),
    );
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
