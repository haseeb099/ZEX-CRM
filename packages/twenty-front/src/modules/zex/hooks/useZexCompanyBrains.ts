import { useCallback, useEffect, useState } from 'react';

import {
  type CompanyBrainListResponse,
  type CreateCompanyBrainRequest,
} from '@/zex/types/prospects.types';
import { zexFetch } from '@/zex/utils/zexRestClient';

type UseZexCompanyBrainsState = {
  data?: CompanyBrainListResponse;
  loading: boolean;
  error?: Error;
  creating: boolean;
  createError?: string | null;
};

export const useZexCompanyBrains = () => {
  const [state, setState] = useState<UseZexCompanyBrainsState>({
    loading: true,
    creating: false,
  });

  const refetch = useCallback(async () => {
    setState((current) => ({
      ...current,
      loading: true,
      error: undefined,
    }));

    try {
      const response = await zexFetch('/company-brains');

      if (!response.ok) {
        throw new Error(`Company brains request failed (${response.status})`);
      }

      const data = (await response.json()) as CompanyBrainListResponse;

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
            : new Error('Failed to load company brains'),
      }));
    }
  }, []);

  const createBrain = useCallback(
    async (body: CreateCompanyBrainRequest) => {
      setState((current) => ({
        ...current,
        creating: true,
        createError: null,
      }));

      try {
        const response = await zexFetch('/company-brains', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          throw new Error(`Create company brain failed (${response.status})`);
        }

        const created = (await response.json()) as { id?: string };

        await refetch();

        return created;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Failed to create company brain';

        setState((current) => ({
          ...current,
          createError: message,
        }));

        throw error;
      } finally {
        setState((current) => ({
          ...current,
          creating: false,
        }));
      }
    },
    [refetch],
  );

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    ...state,
    refetch,
    createBrain,
  };
};
