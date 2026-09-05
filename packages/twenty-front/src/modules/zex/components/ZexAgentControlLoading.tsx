import { styled } from '@linaria/react';
import { useContext } from 'react';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import { ThemeContext, themeCssVariables } from 'twenty-ui/theme-constants';

const StyledList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
`;

const StyledCard = styled.div`
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]};
`;

export const ZexAgentControlLoading = () => {
  const { theme } = useContext(ThemeContext);

  return (
    <StyledList aria-busy="true" aria-label="Loading agents">
      {[0, 1].map((index) => (
        <StyledCard key={index}>
          <SkeletonTheme
            baseColor={theme.background.tertiary}
            highlightColor={theme.background.transparent.lighter}
            borderRadius={8}
          >
            <Skeleton height={16} width="30%" />
            <Skeleton height={20} width="55%" />
            <Skeleton height={14} count={3} />
            <Skeleton height={32} width={140} />
          </SkeletonTheme>
        </StyledCard>
      ))}
    </StyledList>
  );
};
