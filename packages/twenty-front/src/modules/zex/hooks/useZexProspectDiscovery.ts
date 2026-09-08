import { useCallback, useEffect, useRef, useState } from 'react';

import {
  type DiscoveryRunQueuedResponse,
  type DiscoveryRunResponse,
  type ProspectCandidate,
  isTerminalDiscoveryStatus,
} from '@/zex/types/prospects.types';
import { zexFetch } from '@/zex/utils/zexRestClient';

const POLL_INTERVAL_MS = 2000;

type UseZexProspectDiscoveryState = {
  runId: string | null;
  run?: DiscoveryRunResponse;
  candidates: ProspectCandidate[];
  loading: boolean;
  starting: boolean;
  error?: string | null;
};

export const useZexProspectDiscovery = (brainId: string | null) => {
  const [state, setState] = useState<UseZexProspectDiscoveryState>({
    runId: null,
    candidates: [],
    loading: false,
    starting: false,
  });
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startLockRef = useRef(false);

  const clearPoll = useCallback(() => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  }, []);

  const applyRun = useCallback((run: DiscoveryRunResponse) => {
    const candidatesFromRun = Array.isArray(run.candidates)
      ? run.candidates
      : [];

    setState((current) => ({
      ...current,
      run,
      runId: run.id,
      candidates: candidatesFromRun.length
        ? candidatesFromRun
        : current.candidates,
      loading: !isTerminalDiscoveryStatus(run.status),
      error:
        run.status === 'failed'
          ? (run.lastError ?? 'Discovery failed')
          : current.error,
    }));
  }, []);

  const fetchCandidates = useCallback(async (runId: string) => {
    const response = await zexFetch(
      `/prospect-discovery/${encodeURIComponent(runId)}/candidates`,
    );

    if (!response.ok) {
      throw new Error(`Candidates request failed (${response.status})`);
    }

    const data = (await response.json()) as {
      candidates?: ProspectCandidate[];
    };

    setState((current) => ({
      ...current,
      candidates: Array.isArray(data.candidates) ? data.candidates : [],
    }));
  }, []);

  const pollRun = useCallback(
    async (runId: string) => {
      try {
        const response = await zexFetch(
          `/prospect-discovery/${encodeURIComponent(runId)}`,
        );

        if (!response.ok) {
          throw new Error(`Discovery run request failed (${response.status})`);
        }

        const run = (await response.json()) as DiscoveryRunResponse;

        applyRun(run);

        if (!isTerminalDiscoveryStatus(run.status)) {
          pollTimeoutRef.current = setTimeout(() => {
            void pollRun(runId);
          }, POLL_INTERVAL_MS);

          return;
        }

        if (run.status === 'completed') {
          if (!Array.isArray(run.candidates) || run.candidates.length === 0) {
            await fetchCandidates(runId);
          }

          setState((current) => ({
            ...current,
            loading: false,
          }));
        }
      } catch (error) {
        setState((current) => ({
          ...current,
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to poll discovery run',
        }));
      }
    },
    [applyRun, fetchCandidates],
  );

  const startDiscovery = useCallback(
    async (limit = 20) => {
      if (!brainId || startLockRef.current) {
        return;
      }

      startLockRef.current = true;
      clearPoll();
      setState((current) => ({
        ...current,
        starting: true,
        loading: true,
        error: null,
        candidates: [],
        run: undefined,
      }));

      try {
        const response = await zexFetch('/prospect-discovery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyBrainId: brainId,
            limit,
          }),
        });

        if (!response.ok) {
          throw new Error(`Start discovery failed (${response.status})`);
        }

        const queued = (await response.json()) as DiscoveryRunQueuedResponse;

        // Retain runId in page state — Platform has no "latest run" API.
        setState((current) => ({
          ...current,
          runId: queued.id,
          starting: false,
          run: {
            id: queued.id,
            status: queued.status,
            companyBrainId: queued.companyBrainId,
          },
        }));

        await pollRun(queued.id);
      } catch (error) {
        setState((current) => ({
          ...current,
          starting: false,
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to start discovery',
        }));
      } finally {
        startLockRef.current = false;
      }
    },
    [brainId, clearPoll, pollRun],
  );

  const refreshRun = useCallback(async () => {
    if (!state.runId) {
      return;
    }

    await pollRun(state.runId);
  }, [pollRun, state.runId]);

  const upsertCandidate = useCallback((candidate: ProspectCandidate) => {
    setState((current) => ({
      ...current,
      candidates: current.candidates.map((existing) =>
        existing.id === candidate.id ? { ...existing, ...candidate } : existing,
      ),
    }));
  }, []);

  useEffect(() => {
    clearPoll();
    setState({
      runId: null,
      candidates: [],
      loading: false,
      starting: false,
      run: undefined,
      error: null,
    });

    return () => {
      clearPoll();
    };
  }, [brainId, clearPoll]);

  return {
    ...state,
    startDiscovery,
    refreshRun,
    upsertCandidate,
  };
};
