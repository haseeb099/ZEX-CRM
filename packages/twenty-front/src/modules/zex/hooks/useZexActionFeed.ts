import { useCallback, useEffect, useState } from 'react';

import { type ActionFeedResponse } from '@/zex/types/action-feed.types';
import { zexFetch } from '@/zex/utils/zexRestClient';

type UseZexActionFeedState = {
  data?: ActionFeedResponse;
  loading: boolean;
  error?: Error;
};

export const useZexActionFeed = () => {
  const [state, setState] = useState<UseZexActionFeedState>({
    loading: true,
  });

  const refetch = useCallback(async () => {
    setState((current) => ({
      ...current,
      loading: true,
      error: undefined,
    }));

    try {
      const response = await zexFetch('/action-feed');

      if (!response.ok) {
        throw new Error(`Action feed request failed (${response.status})`);
      }

      const data = (await response.json()) as ActionFeedResponse;

      setState({ data, loading: false });
    } catch (error) {
      setState({
        loading: false,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to load action feed'),
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
