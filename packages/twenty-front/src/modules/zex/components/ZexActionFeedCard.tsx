import { styled } from '@linaria/react';
import { useState } from 'react';
import { Status } from 'twenty-ui/data-display';
import { Button } from 'twenty-ui/input';
import { Card, CardContent } from 'twenty-ui/surfaces';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { isDefined } from 'twenty-shared/utils';

import {
  type ActionFeedItem,
  type ActionPriority,
  type ZexActionMutationIntent,
} from '@/zex/types/action-feed.types';

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

const StyledSummary = styled.div`
  color: ${themeCssVariables.font.color.secondary};
  line-height: ${themeCssVariables.text.lineHeight.lg};
`;

const StyledWhyNow = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledEvidence = styled.div`
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding-top: ${themeCssVariables.spacing[2]};
`;

const StyledEvidenceItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledEvidenceLabel = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
  text-transform: uppercase;
`;

const StyledActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const priorityColor = (
  priority: ActionPriority,
): 'gray' | 'orange' | 'turquoise' | 'blue' => {
  switch (priority) {
    case 'critical':
      return 'orange';
    case 'high':
      return 'turquoise';
    case 'medium':
      return 'blue';
    default:
      return 'gray';
  }
};

type ZexActionFeedCardProps = {
  item: ActionFeedItem;
  onMutate: (item: ActionFeedItem, intent: ZexActionMutationIntent) => void;
  isPending: (item: ActionFeedItem, intent: ZexActionMutationIntent) => boolean;
  isAnyPending: boolean;
};

export const ZexActionFeedCard = ({
  item,
  onMutate,
  isPending,
  isAnyPending,
}: ZexActionFeedCardProps) => {
  const [evidenceExpanded, setEvidenceExpanded] = useState(false);

  const showApprove =
    item.action.kind === 'approve_prospect' ||
    item.action.kind === 'approve_sdr_draft' ||
    item.action.kind === 'confirm_meeting';
  const showReject =
    item.action.kind === 'reject_prospect' ||
    item.action.kind === 'reject_sdr_draft' ||
    (isDefined(item.action.secondaryKind) &&
      (item.action.secondaryKind === 'reject_prospect' ||
        item.action.secondaryKind === 'reject_sdr_draft'));
  const isReviewOnly = item.action.kind === 'review_reply';

  const approveIntent: ZexActionMutationIntent =
    item.action.kind === 'confirm_meeting' ? 'confirm' : 'approve';

  const approveLabel =
    item.action.kind === 'confirm_meeting' ? 'Confirm meeting' : 'Approve';

  const rejectKind =
    item.action.kind === 'reject_prospect' ||
    item.action.kind === 'reject_sdr_draft'
      ? item.action.kind
      : item.action.secondaryKind;

  const rejectItem: ActionFeedItem =
    rejectKind && rejectKind !== item.action.kind
      ? {
          ...item,
          action: {
            ...item.action,
            kind: rejectKind,
          },
        }
      : item;

  return (
    <StyledCard rounded={true} fullWidth>
      <StyledCardContent>
        <StyledHeader>
          <Status
            text={item.priority}
            color={priorityColor(item.priority)}
            weight="medium"
          />
          {isDefined(item.companyName) && (
            <Status text={item.companyName} color="gray" weight="medium" />
          )}
          <StyledTitle>{item.title}</StyledTitle>
        </StyledHeader>

        <StyledSummary>{item.summary}</StyledSummary>

        {isDefined(item.whyNow) && item.whyNow.length > 0 && (
          <StyledWhyNow>{item.whyNow}</StyledWhyNow>
        )}

        {item.evidence.length > 0 && (
          <>
            <Button
              variant="tertiary"
              title={evidenceExpanded ? 'Hide evidence' : 'Show evidence'}
              onClick={() => setEvidenceExpanded((value) => !value)}
            />
            {evidenceExpanded && (
              <StyledEvidence>
                {item.evidence.map((evidence) => (
                  <StyledEvidenceItem
                    key={`${evidence.label}-${evidence.text}`}
                  >
                    <StyledEvidenceLabel>{evidence.label}</StyledEvidenceLabel>
                    <div>{evidence.text}</div>
                    {isDefined(evidence.sourceUrl) && (
                      <a
                        href={evidence.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {evidence.sourceTitle ?? evidence.sourceUrl}
                      </a>
                    )}
                  </StyledEvidenceItem>
                ))}
              </StyledEvidence>
            )}
          </>
        )}

        <StyledActions>
          {isReviewOnly && (
            <Button
              variant="secondary"
              title="Review"
              onClick={() => setEvidenceExpanded(true)}
            />
          )}

          {showApprove && (
            <Button
              variant="primary"
              title={approveLabel}
              disabled={isAnyPending}
              isLoading={isPending(item, approveIntent)}
              onClick={() => onMutate(item, approveIntent)}
            />
          )}

          {showReject && (
            <Button
              variant="secondary"
              title="Reject"
              disabled={isAnyPending}
              isLoading={isPending(rejectItem, 'reject')}
              onClick={() => onMutate(rejectItem, 'reject')}
            />
          )}
        </StyledActions>
      </StyledCardContent>
    </StyledCard>
  );
};
