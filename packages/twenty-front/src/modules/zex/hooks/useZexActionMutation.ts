import { useCallback, useRef, useState } from 'react';

import {
  type ActionFeedItem,
  type ZexActionMutationIntent,
} from '@/zex/types/action-feed.types';
import { zexFetch } from '@/zex/utils/zexRestClient';

const buildMutationPath = (
  item: ActionFeedItem,
  intent: ZexActionMutationIntent,
): string | null => {
  const entityId = item.action.entityId;

  switch (item.action.kind) {
    case 'approve_prospect':
      if (intent !== 'approve') return null;
      return `/actions/prospects/${encodeURIComponent(entityId)}/approve`;
    case 'reject_prospect':
      if (intent !== 'reject') return null;
      return `/actions/prospects/${encodeURIComponent(entityId)}/reject`;
    case 'approve_sdr_draft':
      if (intent !== 'approve') return null;
      return `/actions/sdr-drafts/${encodeURIComponent(entityId)}/approve`;
    case 'reject_sdr_draft':
      if (intent !== 'reject') return null;
      return `/actions/sdr-drafts/${encodeURIComponent(entityId)}/reject`;
    case 'confirm_meeting':
      if (intent !== 'confirm') return null;
      {
        const sequenceId =
          typeof item.preview?.sequenceId === 'string'
            ? item.preview.sequenceId
            : entityId;
        return `/actions/sequences/${encodeURIComponent(sequenceId)}/confirm-meeting`;
      }
    default:
      return null;
  }
};

export const useZexActionMutation = (refetch: () => Promise<void>) => {
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const pendingLockRef = useRef(false);

  const mutate = useCallback(
    async (item: ActionFeedItem, intent: ZexActionMutationIntent) => {
      const path = buildMutationPath(item, intent);

      if (!path || pendingLockRef.current) {
        return;
      }

      const key = `${item.id}:${intent}`;

      pendingLockRef.current = true;
      setPendingKey(key);
      setMutationError(null);

      try {
        const response = await zexFetch(path, { method: 'POST' });

        if (!response.ok) {
          throw new Error(`Action failed (${response.status})`);
        }

        await refetch();
      } catch (error) {
        setMutationError(
          error instanceof Error ? error.message : 'Action failed',
        );
      } finally {
        pendingLockRef.current = false;
        setPendingKey(null);
      }
    },
    [refetch],
  );

  const isPending = useCallback(
    (item: ActionFeedItem, intent: ZexActionMutationIntent) =>
      pendingKey === `${item.id}:${intent}`,
    [pendingKey],
  );

  return {
    mutate,
    isPending,
    isAnyPending: pendingKey !== null,
    mutationError,
    clearMutationError: () => setMutationError(null),
  };
};
