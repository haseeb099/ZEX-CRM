import { useEffect, useMemo, useState } from 'react';
import { IconUsers } from 'twenty-ui/icon';

import { ZexCandidateDetail } from '@/zex/components/prospects/ZexCandidateDetail';
import { ZexCandidateList } from '@/zex/components/prospects/ZexCandidateList';
import { ZexCompanyBrainSection } from '@/zex/components/prospects/ZexCompanyBrainSection';
import { ZexDiscoverySection } from '@/zex/components/prospects/ZexDiscoverySection';
import { ZexIcpSection } from '@/zex/components/prospects/ZexIcpSection';
import { ZexShellPage } from '@/zex/components/ZexShellPage';
import { useZexCompanyBrainDetail } from '@/zex/hooks/useZexCompanyBrainDetail';
import { useZexCompanyBrains } from '@/zex/hooks/useZexCompanyBrains';
import { useZexProspectCandidateActions } from '@/zex/hooks/useZexProspectCandidateActions';
import { useZexProspectDiscovery } from '@/zex/hooks/useZexProspectDiscovery';
import { type ProspectCandidate } from '@/zex/types/prospects.types';

export const ZexProspectsPage = () => {
  const {
    data: brainsData,
    loading: brainsLoading,
    error: brainsError,
    creating,
    createError,
    refetch: refetchBrains,
    createBrain,
  } = useZexCompanyBrains();

  const [selectedBrainId, setSelectedBrainId] = useState<string | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(
    null,
  );

  const brains = brainsData?.brains;

  useEffect(() => {
    if (!brains) {
      return;
    }

    if (brains.length === 1) {
      setSelectedBrainId(brains[0].id);

      return;
    }

    if (
      brains.length > 1 &&
      selectedBrainId &&
      !brains.some((brain) => brain.id === selectedBrainId)
    ) {
      setSelectedBrainId(null);
    }

    if (brains.length === 0) {
      setSelectedBrainId(null);
    }
  }, [brains, selectedBrainId]);

  const {
    data: brainDetail,
    loading: brainDetailLoading,
    error: brainDetailError,
    saveState,
    saveError,
    analyzing,
    analysisError,
    analyze,
    regenerate,
    patchBrain,
    addSource,
  } = useZexCompanyBrainDetail(selectedBrainId);

  const {
    runId,
    run,
    candidates,
    loading: discoveryLoading,
    starting,
    error: discoveryError,
    startDiscovery,
    upsertCandidate,
    refreshRun,
  } = useZexProspectDiscovery(selectedBrainId);

  const handleCandidateUpdated = async (candidate: ProspectCandidate) => {
    upsertCandidate(candidate);
    await refreshRun();
  };

  const actions = useZexProspectCandidateActions(handleCandidateUpdated);

  const selectedCandidate = useMemo(
    () =>
      candidates.find((candidate) => candidate.id === selectedCandidateId) ??
      undefined,
    [candidates, selectedCandidateId],
  );

  useEffect(() => {
    if (!selectedCandidateId) {
      return;
    }

    void actions.loadWhyNow(selectedCandidateId);

    if (
      selectedCandidate?.status === 'APPROVED' ||
      selectedCandidate?.status === 'CREATED'
    ) {
      void actions.loadLatestResearch(selectedCandidateId);
    }
    // Intentionally depend on selection / status only — actions methods are stable enough for this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCandidateId, selectedCandidate?.status]);

  return (
    <ZexShellPage
      title="Prospects"
      subtitle="Company Brain → ICP → Discovery → Why-Now → approval → optional Twenty Company → Research."
      Icon={IconUsers}
    >
      <ZexCompanyBrainSection
        brains={brains}
        brainsLoading={brainsLoading}
        brainsError={brainsError}
        selectedBrainId={selectedBrainId}
        onSelectBrainId={setSelectedBrainId}
        creating={creating}
        createError={createError}
        onCreateBrain={async (input) => {
          const created = await createBrain({
            companyName: input.companyName,
            websiteUrl: input.websiteUrl,
            pastedText: input.pastedText,
          });

          if (created.id) {
            setSelectedBrainId(created.id);
          }
        }}
        brainDetail={brainDetail}
        brainDetailLoading={brainDetailLoading}
        brainDetailError={brainDetailError}
        analyzing={analyzing}
        analysisError={analysisError}
        onAnalyze={() => void analyze()}
        onRegenerate={() => void regenerate()}
        onAddSource={addSource}
        onRetryList={() => void refetchBrains()}
      />

      <ZexIcpSection
        brain={brainDetail}
        saveState={saveState}
        saveError={saveError}
        onSave={patchBrain}
      />

      <ZexDiscoverySection
        brainReady={brainDetail?.status === 'ready'}
        runId={runId}
        run={run}
        starting={starting}
        loading={discoveryLoading}
        error={discoveryError}
        onStart={() => void startDiscovery()}
      />

      <ZexCandidateList
        candidates={candidates}
        selectedCandidateId={selectedCandidateId}
        onSelect={setSelectedCandidateId}
      />

      <ZexCandidateDetail
        candidate={selectedCandidate}
        whyNow={
          selectedCandidateId
            ? actions.whyNowByCandidateId[selectedCandidateId]
            : undefined
        }
        research={
          selectedCandidateId
            ? actions.researchByCandidateId[selectedCandidateId]
            : undefined
        }
        researchLoading={
          selectedCandidateId
            ? actions.researchLoadingByCandidateId[selectedCandidateId]
            : false
        }
        mutationError={actions.mutationError}
        isAnyPending={actions.isAnyPending}
        isApprovePending={
          !!selectedCandidateId &&
          actions.isPending('approve', selectedCandidateId)
        }
        isRejectPending={
          !!selectedCandidateId &&
          actions.isPending('reject', selectedCandidateId)
        }
        isCreatePending={
          !!selectedCandidateId &&
          actions.isPending('create', selectedCandidateId)
        }
        isRetryPending={
          !!selectedCandidateId &&
          actions.isPending('retry-create', selectedCandidateId)
        }
        isWhyNowPending={
          !!selectedCandidateId &&
          actions.isPending('why-now', selectedCandidateId)
        }
        isResearchPending={
          !!selectedCandidateId &&
          actions.isPending('research', selectedCandidateId)
        }
        onApprove={() => {
          if (selectedCandidateId) {
            void actions.approve(selectedCandidateId);
          }
        }}
        onReject={() => {
          if (selectedCandidateId) {
            void actions.reject(selectedCandidateId);
          }
        }}
        onCreate={() => {
          if (selectedCandidateId) {
            void actions.createInCrm(selectedCandidateId);
          }
        }}
        onRetryCreate={() => {
          if (selectedCandidateId) {
            void actions.retryCreate(selectedCandidateId);
          }
        }}
        onScoreWhyNow={() => {
          if (selectedCandidateId) {
            void actions.scoreWhyNow(selectedCandidateId);
          }
        }}
        onStartResearch={() => {
          if (selectedCandidate) {
            void actions.startResearch(selectedCandidate);
          }
        }}
      />
    </ZexShellPage>
  );
};
