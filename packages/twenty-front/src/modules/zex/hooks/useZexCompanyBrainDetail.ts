import { useCallback, useEffect, useRef, useState } from 'react';

import {
  type CompanyBrainDetail,
  type PatchCompanyBrainRequest,
  isTerminalAnalysisJobStatus,
} from '@/zex/types/prospects.types';
import { zexFetch } from '@/zex/utils/zexRestClient';

const POLL_INTERVAL_MS = 2000;

type UseZexCompanyBrainDetailState = {
  data?: CompanyBrainDetail;
  loading: boolean;
  error?: Error;
  saveState: 'idle' | 'saving' | 'saved' | 'error';
  saveError?: string | null;
  analyzing: boolean;
  analysisError?: string | null;
};

export const useZexCompanyBrainDetail = (brainId: string | null) => {
  const [state, setState] = useState<UseZexCompanyBrainDetailState>({
    loading: false,
    saveState: 'idle',
    analyzing: false,
  });
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mutationLockRef = useRef(false);

  const clearPoll = useCallback(() => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  }, []);

  const refetch = useCallback(async () => {
    if (!brainId) {
      setState((current) => ({
        ...current,
        data: undefined,
        loading: false,
        error: undefined,
      }));

      return;
    }

    setState((current) => ({
      ...current,
      loading: true,
      error: undefined,
    }));

    try {
      const response = await zexFetch(
        `/company-brains/${encodeURIComponent(brainId)}`,
      );

      if (!response.ok) {
        throw new Error(`Company brain request failed (${response.status})`);
      }

      const data = (await response.json()) as CompanyBrainDetail;

      setState((current) => ({
        ...current,
        data,
        loading: false,
        error: undefined,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to load company brain'),
      }));
    }
  }, [brainId]);

  const pollAnalysisJob = useCallback(
    async (jobId: string) => {
      if (!brainId) {
        return;
      }

      const response = await zexFetch(
        `/company-brains/${encodeURIComponent(brainId)}/analysis-jobs/${encodeURIComponent(jobId)}`,
      );

      if (!response.ok) {
        throw new Error(`Analysis job request failed (${response.status})`);
      }

      const job = (await response.json()) as { status?: string };

      if (!isTerminalAnalysisJobStatus(job.status)) {
        pollTimeoutRef.current = setTimeout(() => {
          void pollAnalysisJob(jobId);
        }, POLL_INTERVAL_MS);

        return;
      }

      setState((current) => ({
        ...current,
        analyzing: false,
        analysisError:
          job.status === 'failed' ? 'Analysis failed' : current.analysisError,
      }));
      await refetch();
    },
    [brainId, refetch],
  );

  const analyze = useCallback(async () => {
    if (!brainId || mutationLockRef.current) {
      return;
    }

    mutationLockRef.current = true;
    clearPoll();
    setState((current) => ({
      ...current,
      analyzing: true,
      analysisError: null,
    }));

    try {
      const response = await zexFetch(
        `/company-brains/${encodeURIComponent(brainId)}/analyze`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        },
      );

      if (!response.ok) {
        throw new Error(`Analyze failed (${response.status})`);
      }

      const queued = (await response.json()) as {
        analysisJobId?: string;
        status?: string;
      };

      if (queued.analysisJobId) {
        await pollAnalysisJob(queued.analysisJobId);
      } else {
        await refetch();
        setState((current) => ({
          ...current,
          analyzing: false,
        }));
      }
    } catch (error) {
      setState((current) => ({
        ...current,
        analyzing: false,
        analysisError:
          error instanceof Error ? error.message : 'Analyze failed',
      }));
    } finally {
      mutationLockRef.current = false;
    }
  }, [brainId, clearPoll, pollAnalysisJob, refetch]);

  const regenerate = useCallback(async () => {
    if (!brainId || mutationLockRef.current) {
      return;
    }

    mutationLockRef.current = true;
    setState((current) => ({
      ...current,
      analyzing: true,
      analysisError: null,
    }));

    try {
      const response = await zexFetch(
        `/company-brains/${encodeURIComponent(brainId)}/regenerate`,
        { method: 'POST' },
      );

      if (!response.ok) {
        throw new Error(`Regenerate failed (${response.status})`);
      }

      await refetch();
    } catch (error) {
      setState((current) => ({
        ...current,
        analysisError:
          error instanceof Error ? error.message : 'Regenerate failed',
      }));
    } finally {
      mutationLockRef.current = false;
      setState((current) => ({
        ...current,
        analyzing: false,
      }));
    }
  }, [brainId, refetch]);

  const patchBrain = useCallback(
    async (body: PatchCompanyBrainRequest) => {
      if (!brainId || mutationLockRef.current) {
        return;
      }

      mutationLockRef.current = true;
      setState((current) => ({
        ...current,
        saveState: 'saving',
        saveError: null,
      }));

      try {
        const response = await zexFetch(
          `/company-brains/${encodeURIComponent(brainId)}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          },
        );

        if (!response.ok) {
          throw new Error(`Save failed (${response.status})`);
        }

        const data = (await response.json()) as CompanyBrainDetail;

        setState((current) => ({
          ...current,
          data,
          saveState: 'saved',
        }));
      } catch (error) {
        setState((current) => ({
          ...current,
          saveState: 'error',
          saveError:
            error instanceof Error ? error.message : 'Failed to save ICP',
        }));
      } finally {
        mutationLockRef.current = false;
      }
    },
    [brainId],
  );

  const addSource = useCallback(
    async (body: {
      sourceType: 'WEBSITE' | 'URL' | 'PASTED_TEXT' | 'DOCUMENT_TEXT';
      sourceUrl?: string;
      text?: string;
      title?: string;
    }) => {
      if (!brainId || mutationLockRef.current) {
        return;
      }

      mutationLockRef.current = true;

      try {
        const response = await zexFetch(
          `/company-brains/${encodeURIComponent(brainId)}/sources`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          },
        );

        if (!response.ok) {
          throw new Error(`Add source failed (${response.status})`);
        }

        await refetch();
      } finally {
        mutationLockRef.current = false;
      }
    },
    [brainId, refetch],
  );

  useEffect(() => {
    clearPoll();
    void refetch();

    return () => {
      clearPoll();
    };
  }, [brainId, clearPoll, refetch]);

  useEffect(() => {
    if (state.data?.status === 'analyzing' && !state.analyzing) {
      const latestJob = state.data.recentAnalysisJobs?.[0];
      const jobId =
        typeof latestJob?.id === 'string' ? latestJob.id : undefined;

      if (jobId && !isTerminalAnalysisJobStatus(latestJob?.status)) {
        setState((current) => ({ ...current, analyzing: true }));
        void pollAnalysisJob(jobId);
      }
    }
  }, [state.data, state.analyzing, pollAnalysisJob]);

  return {
    ...state,
    refetch,
    analyze,
    regenerate,
    patchBrain,
    addSource,
  };
};
