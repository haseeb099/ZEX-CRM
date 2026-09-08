import { styled } from '@linaria/react';
import { Status } from 'twenty-ui/data-display';
import { Button } from 'twenty-ui/input';
import { Card, CardContent } from 'twenty-ui/surfaces';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { type DiscoveryRunResponse } from '@/zex/types/prospects.types';

const StyledCard = styled(Card)`
  width: 100%;
`;

const StyledCardContent = styled(CardContent)`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledTitle = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.lg};
  font-weight: ${themeCssVariables.font.weight.semiBold};
`;

const StyledMuted = styled.div`
  color: ${themeCssVariables.font.color.secondary};
`;

const StyledError = styled.div`
  color: ${themeCssVariables.font.color.secondary};
`;

const StyledRow = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

type ZexDiscoverySectionProps = {
  brainReady: boolean;
  runId: string | null;
  run?: DiscoveryRunResponse;
  starting: boolean;
  loading: boolean;
  error?: string | null;
  onStart: () => void;
};

const discoveryStatusColor = (
  status: string,
): 'green' | 'orange' | 'red' | 'gray' => {
  if (status === 'completed') return 'green';
  if (status === 'processing' || status === 'queued') return 'orange';
  if (status === 'failed') return 'red';

  return 'gray';
};

export const ZexDiscoverySection = ({
  brainReady,
  runId,
  run,
  starting,
  loading,
  error,
  onStart,
}: ZexDiscoverySectionProps) => {
  return (
    <StyledCard>
      <StyledCardContent>
        <StyledTitle>Prospect Discovery</StyledTitle>
        {!brainReady && (
          <StyledMuted>
            Select a ready Company Brain before starting discovery.
          </StyledMuted>
        )}
        {brainReady && (
          <>
            <StyledMuted>
              Discovery is explicit. The returned run id is retained in this
              page session only — refresh loses it because Platform has no
              latest-run endpoint.
            </StyledMuted>
            <StyledRow>
              <Button
                title="Start Prospect Discovery"
                onClick={onStart}
                disabled={starting || loading}
                isLoading={starting || loading}
              />
              {runId && <StyledMuted>Run id: {runId}</StyledMuted>}
              {run?.status && (
                <Status
                  text={String(run.status)}
                  color={discoveryStatusColor(String(run.status))}
                />
              )}
            </StyledRow>
            {error && <StyledError role="alert">{error}</StyledError>}
          </>
        )}
      </StyledCardContent>
    </StyledCard>
  );
};
