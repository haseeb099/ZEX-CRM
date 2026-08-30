import { styled } from '@linaria/react';
import { type ReactNode } from 'react';
import { Status } from 'twenty-ui/data-display';
import { type IconComponent } from 'twenty-ui/icon';
import { Card, CardContent } from 'twenty-ui/surfaces';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { isDefined } from 'twenty-shared/utils';

const StyledCard = styled(Card)`
  width: 100%;
`;

const StyledCardContent = styled(CardContent)`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledHeader = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledTitle = styled.div`
  color: ${themeCssVariables.font.color.primary};
  flex: 1;
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledDescription = styled.div`
  color: ${themeCssVariables.font.color.secondary};
  line-height: ${themeCssVariables.text.lineHeight.lg};
`;

const StyledIcon = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
`;

type ZexPlaceholderCardProps = {
  title: string;
  description: string;
  Icon?: IconComponent;
  statusText?: string;
  statusColor?: 'gray' | 'orange' | 'turquoise' | 'blue';
  action?: ReactNode;
};

export const ZexPlaceholderCard = ({
  title,
  description,
  Icon,
  statusText,
  statusColor = 'gray',
  action,
}: ZexPlaceholderCardProps) => {
  return (
    <StyledCard rounded={true} fullWidth>
      <StyledCardContent>
        <StyledHeader>
          {isDefined(Icon) && (
            <StyledIcon>
              <Icon size={16} />
            </StyledIcon>
          )}
          <StyledTitle>{title}</StyledTitle>
          {isDefined(statusText) && (
            <Status text={statusText} color={statusColor} weight="medium" />
          )}
        </StyledHeader>
        <StyledDescription>{description}</StyledDescription>
        {action}
      </StyledCardContent>
    </StyledCard>
  );
};
