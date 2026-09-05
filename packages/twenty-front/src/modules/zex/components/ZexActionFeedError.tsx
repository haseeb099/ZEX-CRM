import { styled } from '@linaria/react';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledError = styled.div`
  align-items: flex-start;
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[4]};
`;

const StyledTitle = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

type ZexActionFeedErrorProps = {
  message?: string;
  onRetry: () => void;
};

export const ZexActionFeedError = ({
  message = 'Could not load your action feed.',
  onRetry,
}: ZexActionFeedErrorProps) => {
  return (
    <StyledError>
      <StyledTitle>Action feed unavailable</StyledTitle>
      <div>{message}</div>
      <Button variant="secondary" title="Retry" onClick={onRetry} />
    </StyledError>
  );
};
