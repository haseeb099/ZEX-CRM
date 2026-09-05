import { styled } from '@linaria/react';
import { IconSun } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledEmpty = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[8]};
  text-align: center;
`;

const StyledTitle = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

export const ZexActionFeedEmpty = () => {
  return (
    <StyledEmpty>
      <IconSun size={24} />
      <StyledTitle>You&apos;re caught up</StyledTitle>
      <div>No priority revenue actions need your attention right now.</div>
    </StyledEmpty>
  );
};
