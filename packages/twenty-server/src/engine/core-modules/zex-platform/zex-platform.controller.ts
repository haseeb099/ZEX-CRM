import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';

import { ApiPath } from 'twenty-shared/types';

import { RestApiExceptionFilter } from 'src/engine/api/rest/rest-api-exception.filter';
import { UserEntity } from 'src/engine/core-modules/user/user.entity';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import {
  type ZexPlatformAddCompanyBrainSourceRequest,
  type ZexPlatformCreateCompanyBrainRequest,
  type ZexPlatformPatchCompanyBrainRequest,
  type ZexPlatformResearchRequest,
  type ZexPlatformStartDiscoveryRequest,
  type ZexPlatformWhyNowRequest,
} from 'src/engine/core-modules/zex-platform/zex-platform.types';
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
  ) {
    // Actor attribution is AuthUser-only — never accept client-supplied actor labels.
    return this.zexPlatformService.pauseAgent(
      workspace.id,
      agentId,
      this.actorLabel(user),
    );
  }

  @Post('agents/:agentId/resume')
  resumeAgent(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Param('agentId') agentId: string,
    @AuthUser() user: UserEntity,
  ) {
    return this.zexPlatformService.resumeAgent(
      workspace.id,
      agentId,
      this.actorLabel(user),
    );
  }

  @Post('agent-actions/:actionId/undo')
  undoAgentAction(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Param('actionId') actionId: string,
    @AuthUser() user: UserEntity,
  ) {
    return this.zexPlatformService.undoAgentAction(
      workspace.id,
      actionId,
      this.actorLabel(user),
    );
  }

  @Get('company-brains')
  listCompanyBrains(@AuthWorkspace() workspace: WorkspaceEntity) {
    return this.zexPlatformService.listCompanyBrains(workspace.id);
  }

  @Post('company-brains')
  createCompanyBrain(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Body() body: ZexPlatformCreateCompanyBrainRequest,
  ) {
    return this.zexPlatformService.createCompanyBrain(workspace.id, body);
  }

  @Get('company-brains/:brainId')
  getCompanyBrain(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Param('brainId') brainId: string,
  ) {
    return this.zexPlatformService.getCompanyBrain(workspace.id, brainId);
  }

  @Post('company-brains/:brainId/sources')
  addCompanyBrainSource(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Param('brainId') brainId: string,
    @Body() body: ZexPlatformAddCompanyBrainSourceRequest,
  ) {
    return this.zexPlatformService.addCompanyBrainSource(
      workspace.id,
      brainId,
      body,
    );
  }

  @Post('company-brains/:brainId/analyze')
  analyzeCompanyBrain(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Param('brainId') brainId: string,
    @Body() body: { sync?: boolean } = {},
  ) {
    return this.zexPlatformService.analyzeCompanyBrain(
      workspace.id,
      brainId,
      body,
    );
  }

  @Get('company-brains/:brainId/analysis-jobs/:jobId')
  getCompanyBrainAnalysisJob(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Param('brainId') brainId: string,
    @Param('jobId') jobId: string,
  ) {
    return this.zexPlatformService.getCompanyBrainAnalysisJob(
      workspace.id,
      brainId,
      jobId,
    );
  }

  @Patch('company-brains/:brainId')
  patchCompanyBrain(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Param('brainId') brainId: string,
    @Body() body: ZexPlatformPatchCompanyBrainRequest,
  ) {
    return this.zexPlatformService.patchCompanyBrain(
      workspace.id,
      brainId,
      body,
    );
  }

  @Post('company-brains/:brainId/regenerate')
  regenerateCompanyBrain(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Param('brainId') brainId: string,
  ) {
    return this.zexPlatformService.regenerateCompanyBrain(
      workspace.id,
      brainId,
    );
  }

  @Post('prospect-discovery')
  startProspectDiscovery(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Body() body: ZexPlatformStartDiscoveryRequest,
  ) {
    return this.zexPlatformService.startProspectDiscovery(workspace.id, body);
  }

  @Get('prospect-discovery/:runId')
  getProspectDiscoveryRun(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Param('runId') runId: string,
  ) {
    return this.zexPlatformService.getProspectDiscoveryRun(workspace.id, runId);
  }

  @Get('prospect-discovery/:runId/candidates')
  listProspectDiscoveryCandidates(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Param('runId') runId: string,
  ) {
    return this.zexPlatformService.listProspectDiscoveryCandidates(
      workspace.id,
      runId,
    );
  }

  @Get('prospects/:candidateId')
  getProspectCandidate(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Param('candidateId') candidateId: string,
  ) {
    return this.zexPlatformService.getProspectCandidate(
      workspace.id,
      candidateId,
    );
  }

  @Post('prospects/:candidateId/why-now')
  scoreProspectWhyNow(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Param('candidateId') candidateId: string,
    @Body() body: ZexPlatformWhyNowRequest = {},
  ) {
    // Never forward fixture flags from CRM UX.
    return this.zexPlatformService.scoreProspectWhyNow(
      workspace.id,
      candidateId,
      {
        ...(body.sync !== undefined ? { sync: body.sync } : { sync: true }),
        ...(body.collectSignals !== undefined
          ? { collectSignals: body.collectSignals }
          : {}),
      },
    );
  }

  @Get('prospects/:candidateId/why-now')
  getProspectWhyNow(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Param('candidateId') candidateId: string,
  ) {
    return this.zexPlatformService.getProspectWhyNow(workspace.id, candidateId);
  }

  @Post('prospects/:candidateId/approve')
  approveProspectOnProspectsRoute(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Param('candidateId') candidateId: string,
  ) {
    return this.zexPlatformService.approveProspectCandidate(
      workspace.id,
      candidateId,
    );
  }

  @Post('prospects/:candidateId/reject')
  rejectProspectOnProspectsRoute(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Param('candidateId') candidateId: string,
  ) {
    return this.zexPlatformService.rejectProspectCandidate(
      workspace.id,
      candidateId,
    );
  }

  @Post('prospects/:candidateId/create')
  createProspectInCrm(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Param('candidateId') candidateId: string,
  ) {
    return this.zexPlatformService.createProspectCandidateInCrm(
      workspace.id,
      candidateId,
    );
  }

  @Post('prospects/:candidateId/retry-create')
  retryCreateProspectInCrm(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Param('candidateId') candidateId: string,
  ) {
    return this.zexPlatformService.retryCreateProspectCandidate(
      workspace.id,
      candidateId,
    );
  }

  @Post('prospects/:candidateId/research')
  startProspectResearch(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Param('candidateId') candidateId: string,
    @Body() body: ZexPlatformResearchRequest = {},
  ) {
    // Never forward fixture flags from CRM UX.
    return this.zexPlatformService.startProspectResearch(
      workspace.id,
      candidateId,
      body.sync !== undefined ? { sync: body.sync } : {},
    );
  }

  @Get('prospects/:candidateId/research/latest')
  getProspectResearchLatest(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Param('candidateId') candidateId: string,
  ) {
    return this.zexPlatformService.getProspectResearchLatest(
      workspace.id,
      candidateId,
    );
  }

  @Get('prospects/:candidateId/research/:runId')
  getProspectResearchRun(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Param('candidateId') candidateId: string,
    @Param('runId') runId: string,
  ) {
    return this.zexPlatformService.getProspectResearchRun(
      workspace.id,
      candidateId,
      runId,
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
