import { useCallback, useEffect, useState } from 'react';

import { type AgentControlOverviewResponse } from '@/zex/types/agent-control.types';
import { zexFetch } from '@/zex/utils/zexRestClient';

type UseZexAgentControlState = {
  data?: AgentControlOverviewResponse;
  loading: boolean;
  error?: Error;
};

export const useZexAgentControl = () => {
  const [state, setState] = useState<UseZexAgentControlState>({
    loading: true,
  });

  const refetch = useCallback(async () => {
    setState((current) => ({
      ...current,
      loading: true,
      error: undefined,
    }));

    try {
      const response = await zexFetch('/agents');

      if (!response.ok) {
        throw new Error(`Agents request failed (${response.status})`);
      }

      const data = (await response.json()) as AgentControlOverviewResponse;

      setState({ data, loading: false });
    } catch (error) {
      setState({
        loading: false,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to load agent control center'),
      });
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    ...state,
    refetch,
  };
};
