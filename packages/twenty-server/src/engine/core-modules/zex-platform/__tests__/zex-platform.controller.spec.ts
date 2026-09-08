import { readFileSync } from 'fs';
import { join } from 'path';

import { UserEntity } from 'src/engine/core-modules/user/user.entity';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { ZexPlatformController } from 'src/engine/core-modules/zex-platform/zex-platform.controller';
import { ZexPlatformService } from 'src/engine/core-modules/zex-platform/zex-platform.service';

describe('ZexPlatformController agent control actor integrity', () => {
  let controller: ZexPlatformController;

  const pauseAgent = jest.fn();
  const resumeAgent = jest.fn();
  const undoAgentAction = jest.fn();

  const workspace = { id: 'workspace-a' } as WorkspaceEntity;
  const userWithEmail = {
    id: 'user-1',
    email: 'operator@zex.test',
  } as UserEntity;
  const userWithoutEmail = {
    id: 'user-no-email',
    email: null,
  } as unknown as UserEntity;

  beforeEach(() => {
    jest.clearAllMocks();
    pauseAgent.mockResolvedValue({ state: 'PAUSED' });
    resumeAgent.mockResolvedValue({ state: 'ACTIVE' });
    undoAgentAction.mockResolvedValue({ undone: true });

    // Direct instantiation avoids JwtAuthGuard DI; we unit-test handler logic only.
    controller = new ZexPlatformController({
      pauseAgent,
      resumeAgent,
      undoAgentAction,
    } as unknown as ZexPlatformService);
  });

  it('pause sends authenticated user email as triggeredBy', async () => {
    await controller.pauseAgent(workspace, 'research_agent', userWithEmail);

    expect(pauseAgent).toHaveBeenCalledWith(
      'workspace-a',
      'research_agent',
      'operator@zex.test',
    );
  });

  it('resume sends authenticated user email as triggeredBy', async () => {
    await controller.resumeAgent(workspace, 'ai_sdr', userWithEmail);

    expect(resumeAgent).toHaveBeenCalledWith(
      'workspace-a',
      'ai_sdr',
      'operator@zex.test',
    );
  });

  it('undo sends authenticated user email as triggeredBy', async () => {
    await controller.undoAgentAction(workspace, 'action-1', userWithEmail);

    expect(undoAgentAction).toHaveBeenCalledWith(
      'workspace-a',
      'action-1',
      'operator@zex.test',
    );
  });

  it('falls back to authenticated user id when email is absent', async () => {
    await controller.pauseAgent(workspace, 'research_agent', userWithoutEmail);
    await controller.resumeAgent(workspace, 'research_agent', userWithoutEmail);
    await controller.undoAgentAction(workspace, 'action-2', userWithoutEmail);

    expect(pauseAgent).toHaveBeenCalledWith(
      'workspace-a',
      'research_agent',
      'user-no-email',
    );
    expect(resumeAgent).toHaveBeenCalledWith(
      'workspace-a',
      'research_agent',
      'user-no-email',
    );
    expect(undoAgentAction).toHaveBeenCalledWith(
      'workspace-a',
      'action-2',
      'user-no-email',
    );
  });

  it('rejects spoofed body triggeredBy by having no body channel', async () => {
    // Actor integrity: pause/resume/undo take only workspace, id, AuthUser.
    // Malicious {"triggeredBy":"spoofed@example.com"} cannot alter attribution.
    expect(controller.pauseAgent.length).toBe(3);
    expect(controller.resumeAgent.length).toBe(3);
    expect(controller.undoAgentAction.length).toBe(3);

    await controller.pauseAgent(workspace, 'research_agent', userWithEmail);
    await controller.resumeAgent(workspace, 'research_agent', userWithEmail);
    await controller.undoAgentAction(workspace, 'action-1', userWithEmail);

    expect(pauseAgent.mock.calls[0][2]).toBe('operator@zex.test');
    expect(resumeAgent.mock.calls[0][2]).toBe('operator@zex.test');
    expect(undoAgentAction.mock.calls[0][2]).toBe('operator@zex.test');
    expect(JSON.stringify(pauseAgent.mock.calls)).not.toContain(
      'spoofed@example.com',
    );
  });

  it('controller source never forwards body.triggeredBy for control mutations', () => {
    const controllerPath = join(__dirname, '../zex-platform.controller.ts');
    const contents = readFileSync(controllerPath, 'utf8');

    expect(contents).not.toContain('body?.triggeredBy');
    expect(contents).not.toContain('body.triggeredBy');

    const pauseBlock = contents.slice(
      contents.indexOf("Post('agents/:agentId/pause')"),
      contents.indexOf("Post('agents/:agentId/resume')"),
    );
    const resumeBlock = contents.slice(
      contents.indexOf("Post('agents/:agentId/resume')"),
      contents.indexOf("Post('agent-actions/:actionId/undo')"),
    );
    const undoBlock = contents.slice(
      contents.indexOf("Post('agent-actions/:actionId/undo')"),
      contents.indexOf("Get('company-brains')") !== -1
        ? contents.indexOf("Get('company-brains')")
        : contents.indexOf("Post('actions/prospects/:candidateId/approve')"),
    );

    for (const block of [pauseBlock, resumeBlock, undoBlock]) {
      expect(block).toContain('this.actorLabel(user)');
      expect(block).not.toContain('@Body()');
      expect(block).not.toContain('triggeredBy');
    }
  });
});
