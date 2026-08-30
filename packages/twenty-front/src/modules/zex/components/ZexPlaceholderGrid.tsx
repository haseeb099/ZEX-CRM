import { styled } from '@linaria/react';
import { type ReactNode } from 'react';
import { MOBILE_VIEWPORT, themeCssVariables } from 'twenty-ui/theme-constants';

const StyledGrid = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns: repeat(2, minmax(0, 1fr));

  @media (max-width: ${MOBILE_VIEWPORT}px) {
    grid-template-columns: 1fr;
  }
`;

type ZexPlaceholderGridProps = {
  children: ReactNode;
};

export const ZexPlaceholderGrid = ({ children }: ZexPlaceholderGridProps) => {
  return <StyledGrid>{children}</StyledGrid>;
};
