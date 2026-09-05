import { useCallback, useRef, useState } from 'react';

import { type AgentId } from '@/zex/types/agent-control.types';
import { zexFetch } from '@/zex/utils/zexRestClient';

export type ZexAgentMutationIntent = 'pause' | 'resume' | 'undo';

const buildMutationPath = (
  intent: ZexAgentMutationIntent,
  targetId: string,
): string => {
  if (intent === 'undo') {
    return `/agent-actions/${encodeURIComponent(targetId)}/undo`;
  }

  return `/agents/${encodeURIComponent(targetId)}/${intent}`;
};

export const useZexAgentMutation = (refetch: () => Promise<void>) => {
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const pendingLockRef = useRef(false);

  const mutate = useCallback(
    async (intent: ZexAgentMutationIntent, targetId: string) => {
      if (pendingLockRef.current) {
        return;
      }

      const key = `${intent}:${targetId}`;

      pendingLockRef.current = true;
      setPendingKey(key);
      setMutationError(null);

      try {
        const response = await zexFetch(buildMutationPath(intent, targetId), {
          method: 'POST',
        });

        if (!response.ok) {
          throw new Error(`Agent action failed (${response.status})`);
        }

        await refetch();
      } catch (error) {
        setMutationError(
          error instanceof Error ? error.message : 'Agent action failed',
        );
      } finally {
        pendingLockRef.current = false;
        setPendingKey(null);
      }
    },
    [refetch],
  );

  const isPending = useCallback(
    (intent: ZexAgentMutationIntent, targetId: string) =>
      pendingKey === `${intent}:${targetId}`,
    [pendingKey],
  );

  const pause = useCallback(
    (agentId: AgentId) => mutate('pause', agentId),
    [mutate],
  );

  const resume = useCallback(
    (agentId: AgentId) => mutate('resume', agentId),
    [mutate],
  );

  const undo = useCallback(
    (actionId: string) => mutate('undo', actionId),
    [mutate],
  );

  return {
    pause,
    resume,
    undo,
    isPending,
    isAnyPending: pendingKey !== null,
    mutationError,
    clearMutationError: () => setMutationError(null),
  };
};
