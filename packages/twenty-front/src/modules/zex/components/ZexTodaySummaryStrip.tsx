import { styled } from '@linaria/react';
import { Pill } from 'twenty-ui/data-display';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { type ActionFeedSummary } from '@/zex/types/action-feed.types';

const StyledStrip = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

type ZexTodaySummaryStripProps = {
  summary?: ActionFeedSummary;
};

export const ZexTodaySummaryStrip = ({
  summary,
}: ZexTodaySummaryStripProps) => {
  if (!summary) {
    return null;
  }

  const chips = [
    { label: 'Needs approval', value: summary.needsApproval },
    { label: 'Replies', value: summary.replies },
    { label: 'Meetings', value: summary.meetings },
    { label: 'Blocked', value: summary.blocked },
  ];

  return (
    <StyledStrip>
      {chips.map((chip) => (
        <Pill key={chip.label} label={`${chip.label}: ${chip.value}`} />
      ))}
    </StyledStrip>
  );
};
