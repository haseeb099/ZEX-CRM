import { useCallback, useRef, useState } from 'react';

import {
  type ProspectCandidate,
  type ResearchPackage,
  type ResearchQueuedResponse,
  type WhyNowSnapshot,
  isResearchEligibleStatus,
  isTerminalResearchStatus,
} from '@/zex/types/prospects.types';
import { zexFetch } from '@/zex/utils/zexRestClient';

const POLL_INTERVAL_MS = 2000;

export type ProspectCandidateMutationIntent =
  | 'approve'
  | 'reject'
  | 'create'
  | 'retry-create'
  | 'why-now'
  | 'research';

type UseZexProspectCandidateActionsState = {
  pendingKey: string | null;
  mutationError: string | null;
  whyNowByCandidateId: Record<string, WhyNowSnapshot | undefined>;
  researchByCandidateId: Record<string, ResearchPackage | undefined>;
  researchRunIdByCandidateId: Record<string, string | undefined>;
  researchLoadingByCandidateId: Record<string, boolean>;
};

export const useZexProspectCandidateActions = (
  onCandidateUpdated: (candidate: ProspectCandidate) => void | Promise<void>,
) => {
  const [state, setState] = useState<UseZexProspectCandidateActionsState>({
    pendingKey: null,
    mutationError: null,
    whyNowByCandidateId: {},
    researchByCandidateId: {},
    researchRunIdByCandidateId: {},
    researchLoadingByCandidateId: {},
  });
  const pendingLockRef = useRef(false);
  const researchPollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearResearchPoll = useCallback(() => {
    if (researchPollRef.current) {
      clearTimeout(researchPollRef.current);
      researchPollRef.current = null;
    }
  }, []);

  const isPending = useCallback(
    (intent: ProspectCandidateMutationIntent, candidateId: string) =>
      state.pendingKey === `${intent}:${candidateId}`,
    [state.pendingKey],
  );

  const mutateCandidate = useCallback(
    async (
      intent: 'approve' | 'reject' | 'create' | 'retry-create',
      candidateId: string,
    ) => {
      if (pendingLockRef.current) {
        return;
      }

      pendingLockRef.current = true;
      setState((current) => ({
        ...current,
        pendingKey: `${intent}:${candidateId}`,
        mutationError: null,
      }));

      try {
        const response = await zexFetch(
          `/prospects/${encodeURIComponent(candidateId)}/${intent}`,
          { method: 'POST' },
        );

        if (!response.ok) {
          throw new Error(`${intent} failed (${response.status})`);
        }

        const candidate = (await response.json()) as ProspectCandidate;

        await onCandidateUpdated(candidate);
      } catch (error) {
        setState((current) => ({
          ...current,
          mutationError:
            error instanceof Error ? error.message : `${intent} failed`,
        }));
      } finally {
        pendingLockRef.current = false;
        setState((current) => ({
          ...current,
          pendingKey: null,
        }));
      }
    },
    [onCandidateUpdated],
  );

  const scoreWhyNow = useCallback(async (candidateId: string) => {
    if (pendingLockRef.current) {
      return;
    }

    pendingLockRef.current = true;
    setState((current) => ({
      ...current,
      pendingKey: `why-now:${candidateId}`,
      mutationError: null,
    }));

    try {
      const response = await zexFetch(
        `/prospects/${encodeURIComponent(candidateId)}/why-now`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sync: true }),
        },
      );

      if (!response.ok) {
        throw new Error(`Why-Now scoring failed (${response.status})`);
      }

      const snapshot = (await response.json()) as WhyNowSnapshot;

      setState((current) => ({
        ...current,
        whyNowByCandidateId: {
          ...current.whyNowByCandidateId,
          [candidateId]: snapshot,
        },
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        mutationError:
          error instanceof Error ? error.message : 'Why-Now scoring failed',
      }));
    } finally {
      pendingLockRef.current = false;
      setState((current) => ({
        ...current,
        pendingKey: null,
      }));
    }
  }, []);

  const loadWhyNow = useCallback(async (candidateId: string) => {
    try {
      const response = await zexFetch(
        `/prospects/${encodeURIComponent(candidateId)}/why-now`,
      );

      if (!response.ok) {
        return;
      }

      const snapshot = (await response.json()) as WhyNowSnapshot;

      setState((current) => ({
        ...current,
        whyNowByCandidateId: {
          ...current.whyNowByCandidateId,
          [candidateId]: snapshot,
        },
      }));
    } catch {
      // Latest snapshot is optional until scored.
    }
  }, []);

  const pollResearch = useCallback(
    async (candidateId: string, runId: string) => {
      try {
        const response = await zexFetch(
          `/prospects/${encodeURIComponent(candidateId)}/research/${encodeURIComponent(runId)}`,
        );

        if (!response.ok) {
          throw new Error(`Research poll failed (${response.status})`);
        }

        const research = (await response.json()) as ResearchPackage;

        setState((current) => ({
          ...current,
          researchByCandidateId: {
            ...current.researchByCandidateId,
            [candidateId]: research,
          },
          researchLoadingByCandidateId: {
            ...current.researchLoadingByCandidateId,
            [candidateId]: !isTerminalResearchStatus(research.status),
          },
        }));

        if (!isTerminalResearchStatus(research.status)) {
          researchPollRef.current = setTimeout(() => {
            void pollResearch(candidateId, runId);
          }, POLL_INTERVAL_MS);
        }
      } catch (error) {
        setState((current) => ({
          ...current,
          researchLoadingByCandidateId: {
            ...current.researchLoadingByCandidateId,
            [candidateId]: false,
          },
          mutationError:
            error instanceof Error ? error.message : 'Research poll failed',
        }));
      }
    },
    [],
  );

  const startResearch = useCallback(
    async (candidate: ProspectCandidate) => {
      if (
        !isResearchEligibleStatus(candidate.status) ||
        pendingLockRef.current
      ) {
        return;
      }

      pendingLockRef.current = true;
      clearResearchPoll();
      setState((current) => ({
        ...current,
        pendingKey: `research:${candidate.id}`,
        mutationError: null,
        researchLoadingByCandidateId: {
          ...current.researchLoadingByCandidateId,
          [candidate.id]: true,
        },
      }));

      try {
        const response = await zexFetch(
          `/prospects/${encodeURIComponent(candidate.id)}/research`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          },
        );

        if (!response.ok) {
          throw new Error(`Start research failed (${response.status})`);
        }

        const queued = (await response.json()) as ResearchQueuedResponse;

        setState((current) => ({
          ...current,
          researchRunIdByCandidateId: {
            ...current.researchRunIdByCandidateId,
            [candidate.id]: queued.researchRunId,
          },
        }));

        if (queued.status === 'COMPLETED' || queued.status === 'completed') {
          const latest = await zexFetch(
            `/prospects/${encodeURIComponent(candidate.id)}/research/latest`,
          );

          if (latest.ok) {
            const research = (await latest.json()) as ResearchPackage;

            setState((current) => ({
              ...current,
              researchByCandidateId: {
                ...current.researchByCandidateId,
                [candidate.id]: research,
              },
              researchLoadingByCandidateId: {
                ...current.researchLoadingByCandidateId,
                [candidate.id]: false,
              },
            }));
          }
        } else {
          await pollResearch(candidate.id, queued.researchRunId);
        }
      } catch (error) {
        setState((current) => ({
          ...current,
          researchLoadingByCandidateId: {
            ...current.researchLoadingByCandidateId,
            [candidate.id]: false,
          },
          mutationError:
            error instanceof Error ? error.message : 'Start research failed',
        }));
      } finally {
        pendingLockRef.current = false;
        setState((current) => ({
          ...current,
          pendingKey: null,
        }));
      }
    },
    [clearResearchPoll, pollResearch],
  );

  const loadLatestResearch = useCallback(async (candidateId: string) => {
    try {
      const response = await zexFetch(
        `/prospects/${encodeURIComponent(candidateId)}/research/latest`,
      );

      if (!response.ok) {
        return;
      }

      const research = (await response.json()) as ResearchPackage;

      setState((current) => ({
        ...current,
        researchByCandidateId: {
          ...current.researchByCandidateId,
          [candidateId]: research,
        },
      }));
    } catch {
      // Latest completed research is optional.
    }
  }, []);

  return {
    ...state,
    isPending,
    isAnyPending: state.pendingKey !== null,
    approve: (candidateId: string) => mutateCandidate('approve', candidateId),
    reject: (candidateId: string) => mutateCandidate('reject', candidateId),
    createInCrm: (candidateId: string) =>
      mutateCandidate('create', candidateId),
    retryCreate: (candidateId: string) =>
      mutateCandidate('retry-create', candidateId),
    scoreWhyNow,
    loadWhyNow,
    startResearch,
    loadLatestResearch,
    clearMutationError: () =>
      setState((current) => ({ ...current, mutationError: null })),
  };
};
