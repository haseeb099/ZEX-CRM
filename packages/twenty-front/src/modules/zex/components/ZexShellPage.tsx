import { styled } from '@linaria/react';
import { type ReactNode } from 'react';
import { type IconComponent } from 'twenty-ui/icon';
import { Section } from 'twenty-ui/layout';
import { H2Title } from 'twenty-ui/typography';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { PageCardHeader } from '@/ui/layout/page/components/PageCardHeader';
import { PageCardLayout } from '@/ui/layout/page/components/PageCardLayout';
import { PageTitle } from '@/ui/utilities/page-title/components/PageTitle';

const StyledContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
  padding: ${themeCssVariables.spacing[4]};
`;

const StyledIconWrapper = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
`;

type ZexShellPageProps = {
  title: string;
  subtitle: string;
  Icon: IconComponent;
  children: ReactNode;
};

export const ZexShellPage = ({
  title,
  subtitle,
  Icon,
  children,
}: ZexShellPageProps) => {
  return (
    <>
      <PageTitle title={title} />
      <PageCardLayout
        header={
          <PageCardHeader
            icon={
              <StyledIconWrapper>
                <Icon size={16} />
              </StyledIconWrapper>
            }
            title={title}
          />
        }
      >
        <StyledContent>
          <Section>
            <H2Title title={title} description={subtitle} />
          </Section>
          {children}
        </StyledContent>
      </PageCardLayout>
    </>
  );
};
