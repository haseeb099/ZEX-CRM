import { readFileSync } from 'fs';
import { join } from 'path';

import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { ZexPlatformController } from 'src/engine/core-modules/zex-platform/zex-platform.controller';
import { ZexPlatformService } from 'src/engine/core-modules/zex-platform/zex-platform.service';

describe('ZexPlatformController prospects bridge', () => {
  let controller: ZexPlatformController;

  const listCompanyBrains = jest.fn();
  const createCompanyBrain = jest.fn();
  const startProspectDiscovery = jest.fn();
  const scoreProspectWhyNow = jest.fn();
  const startProspectResearch = jest.fn();
  const approveProspectCandidate = jest.fn();
  const rejectProspectCandidate = jest.fn();
  const createProspectCandidateInCrm = jest.fn();
  const retryCreateProspectCandidate = jest.fn();

  const workspace = { id: 'workspace-a' } as WorkspaceEntity;

  beforeEach(() => {
    jest.clearAllMocks();

    controller = new ZexPlatformController({
      listCompanyBrains,
      createCompanyBrain,
      startProspectDiscovery,
      scoreProspectWhyNow,
      startProspectResearch,
      approveProspectCandidate,
      rejectProspectCandidate,
      createProspectCandidateInCrm,
      retryCreateProspectCandidate,
    } as unknown as ZexPlatformService);
  });

  it('lists and creates brains from AuthWorkspace only', async () => {
    listCompanyBrains.mockResolvedValue({ brains: [] });
    createCompanyBrain.mockResolvedValue({ id: 'brain-1' });

    await controller.listCompanyBrains(workspace);
    await controller.createCompanyBrain(workspace, {
      companyName: 'Acme',
    });

    expect(listCompanyBrains).toHaveBeenCalledWith('workspace-a');
    expect(createCompanyBrain).toHaveBeenCalledWith('workspace-a', {
      companyName: 'Acme',
    });
  });

  it('starts discovery with workspace id and body brain id only', async () => {
    startProspectDiscovery.mockResolvedValue({
      id: 'run-1',
      status: 'queued',
      companyBrainId: 'brain-1',
    });

    await controller.startProspectDiscovery(workspace, {
      companyBrainId: 'brain-1',
      limit: 5,
    });

    expect(startProspectDiscovery).toHaveBeenCalledWith('workspace-a', {
      companyBrainId: 'brain-1',
      limit: 5,
    });
  });

  it('defaults why-now to sync:true and strips fixture from body', async () => {
    scoreProspectWhyNow.mockResolvedValue({ overallScore: 1 });

    await controller.scoreProspectWhyNow(workspace, 'cand-1', {
      // @ts-expect-error intentional spoof attempt
      fixture: true,
      collectSignals: true,
    });

    expect(scoreProspectWhyNow).toHaveBeenCalledWith('workspace-a', 'cand-1', {
      sync: true,
      collectSignals: true,
    });
    expect(JSON.stringify(scoreProspectWhyNow.mock.calls)).not.toContain(
      'fixture',
    );
  });

  it('strips research fixture flags before forwarding', async () => {
    startProspectResearch.mockResolvedValue({
      status: 'queued',
      researchRunId: 'res-1',
      prospectCandidateId: 'cand-1',
    });

    await controller.startProspectResearch(workspace, 'cand-1', {
      // @ts-expect-error intentional spoof attempt
      fixture: true,
      sync: false,
    });

    expect(startProspectResearch).toHaveBeenCalledWith(
      'workspace-a',
      'cand-1',
      {
        sync: false,
      },
    );
    expect(JSON.stringify(startProspectResearch.mock.calls)).not.toContain(
      'fixture',
    );
  });

  it('approve/reject/create/retry-create take no body and no tenantId', async () => {
    approveProspectCandidate.mockResolvedValue({ status: 'APPROVED' });
    rejectProspectCandidate.mockResolvedValue({ status: 'REJECTED' });
    createProspectCandidateInCrm.mockResolvedValue({ status: 'CREATED' });
    retryCreateProspectCandidate.mockResolvedValue({ status: 'CREATED' });

    await controller.approveProspectOnProspectsRoute(workspace, 'cand-1');
    await controller.rejectProspectOnProspectsRoute(workspace, 'cand-1');
    await controller.createProspectInCrm(workspace, 'cand-1');
    await controller.retryCreateProspectInCrm(workspace, 'cand-1');

    expect(approveProspectCandidate).toHaveBeenCalledWith(
      'workspace-a',
      'cand-1',
    );
    expect(rejectProspectCandidate).toHaveBeenCalledWith(
      'workspace-a',
      'cand-1',
    );
    expect(createProspectCandidateInCrm).toHaveBeenCalledWith(
      'workspace-a',
      'cand-1',
    );
    expect(retryCreateProspectCandidate).toHaveBeenCalledWith(
      'workspace-a',
      'cand-1',
    );

    expect(controller.approveProspectOnProspectsRoute.length).toBe(2);
    expect(controller.createProspectInCrm.length).toBe(2);
  });

  it('controller source never accepts browser tenantId query/body params', () => {
    const controllerPath = join(__dirname, '../zex-platform.controller.ts');
    const contents = readFileSync(controllerPath, 'utf8');

    expect(contents).not.toContain('tenantId');
    expect(contents).not.toContain('ZEX_PLATFORM_TENANT_ID');
    expect(contents).not.toContain('ADMIN_API_KEY');
  });
});
