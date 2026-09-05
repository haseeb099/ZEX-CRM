import { styled } from '@linaria/react';
import { IconSun } from 'twenty-ui/icon';

import { ZexActionFeedCard } from '@/zex/components/ZexActionFeedCard';
import { ZexActionFeedEmpty } from '@/zex/components/ZexActionFeedEmpty';
import { ZexActionFeedError } from '@/zex/components/ZexActionFeedError';
import { ZexActionFeedLoading } from '@/zex/components/ZexActionFeedLoading';
import { ZexShellPage } from '@/zex/components/ZexShellPage';
import { ZexTodaySummaryStrip } from '@/zex/components/ZexTodaySummaryStrip';
import { useZexActionFeed } from '@/zex/hooks/useZexActionFeed';
import { useZexActionMutation } from '@/zex/hooks/useZexActionMutation';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledFeedList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
`;

const StyledMutationError = styled.div`
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[2]} 0;
`;

export const ZexTodayPage = () => {
  const { data, loading, error, refetch } = useZexActionFeed();
  const { mutate, isPending, isAnyPending, mutationError } =
    useZexActionMutation(refetch);

  return (
    <ZexShellPage
      title="Today"
      subtitle="Your highest-priority revenue actions"
      Icon={IconSun}
    >
      {loading && !data && <ZexActionFeedLoading />}

      {error && !data && (
        <ZexActionFeedError
          message={error.message}
          onRetry={() => void refetch()}
        />
      )}

      {data && (
        <>
          <ZexTodaySummaryStrip summary={data.summary} />

          {mutationError && (
            <StyledMutationError role="alert">
              <div>{mutationError}</div>
            </StyledMutationError>
          )}

          {data.items.length === 0 ? (
            <ZexActionFeedEmpty />
          ) : (
            <StyledFeedList>
              {data.items.map((item) => (
                <ZexActionFeedCard
                  key={item.id}
                  item={item}
                  onMutate={(feedItem, intent) => void mutate(feedItem, intent)}
                  isPending={isPending}
                  isAnyPending={isAnyPending}
                />
              ))}
            </StyledFeedList>
          )}
        </>
      )}
    </ZexShellPage>
  );
};
