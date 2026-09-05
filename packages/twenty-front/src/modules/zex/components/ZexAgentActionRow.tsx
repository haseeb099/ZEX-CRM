import { styled } from '@linaria/react';
import { useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { isNonEmptyString } from '@sniptt/guards';
import { Status } from 'twenty-ui/data-display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { type AgentAction } from '@/zex/types/agent-control.types';
import {
  formatApprovalStateLabel,
  formatConfidenceLabel,
  formatRelativeTimestamp,
} from '@/zex/utils/format-agent-control-labels';

const StyledRow = styled.div`
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledHeader = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledTitle = styled.div`
  color: ${themeCssVariables.font.color.primary};
  flex: 1;
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledMeta = styled.div`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledDetail = styled.div`
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding-top: ${themeCssVariables.spacing[2]};
`;

const StyledEvidence = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
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

type ZexAgentActionRowProps = {
  action: AgentAction;
  agentName?: string;
  onUndo: (actionId: string) => void;
  isUndoPending: boolean;
  isAnyPending: boolean;
};

export const ZexAgentActionRow = ({
  action,
  agentName,
  onUndo,
  isUndoPending,
  isAnyPending,
}: ZexAgentActionRowProps) => {
  const [expanded, setExpanded] = useState(false);
  const confidenceLabel = formatConfidenceLabel(action.confidence);
  const showUndo =
    action.reversible === true && action.undo.status === 'available';
  // Only Platform `available` is actionable. Never infer undoability locally.
  const irreversibleLabel = showUndo
    ? null
    : action.undo.status === 'undone'
      ? 'Already undone'
      : action.undo.status === 'superseded'
        ? 'Superseded by newer control action'
        : 'Not reversible';

  return (
    <StyledRow>
      <StyledHeader>
        <Status text={action.status} color="gray" weight="medium" />
        <Status
          text={formatApprovalStateLabel(action.approvalState)}
          color="blue"
          weight="medium"
        />
        <StyledTitle>{action.actionType}</StyledTitle>
      </StyledHeader>

      <StyledMeta>
        {isDefined(agentName) ? `${agentName} · ` : ''}
        {formatRelativeTimestamp(action.occurredAt)}
        {isDefined(action.subject.summary) &&
        isNonEmptyString(action.subject.summary)
          ? ` · ${action.subject.summary}`
          : ''}
      </StyledMeta>

      {isDefined(confidenceLabel) && <StyledMeta>{confidenceLabel}</StyledMeta>}

      <StyledActions>
        <Button
          variant="tertiary"
          title={expanded ? 'Hide details' : 'Show details'}
          onClick={() => setExpanded((value) => !value)}
        />
        {showUndo && (
          <Button
            variant="secondary"
            title="Undo"
            disabled={isAnyPending}
            isLoading={isUndoPending}
            onClick={() => onUndo(action.id)}
          />
        )}
        {isDefined(irreversibleLabel) && !showUndo && (
          <Status text={irreversibleLabel} color="gray" weight="medium" />
        )}
      </StyledActions>

      {expanded && (
        <StyledDetail>
          {isDefined(action.permissionKey) && (
            <StyledMeta>Capability: {action.permissionKey}</StyledMeta>
          )}
          <StyledMeta>Triggered by: {action.triggeredBy}</StyledMeta>
          {isDefined(action.subject.resourceType) && (
            <StyledMeta>
              Resource: {action.subject.resourceType}
              {isDefined(action.subject.resourceId)
                ? ` (${action.subject.resourceId})`
                : ''}
            </StyledMeta>
          )}
          {isDefined(action.mutationSummary.message) && (
            <StyledMeta>{action.mutationSummary.message}</StyledMeta>
          )}
          <StyledMeta>Audit: {action.auditLogId}</StyledMeta>

          {action.evidenceSummary.length > 0 && (
            <StyledEvidence>
              {action.evidenceSummary.map((evidence) => (
                <StyledEvidenceItem key={`${evidence.label}-${evidence.text}`}>
                  <StyledEvidenceLabel>{evidence.label}</StyledEvidenceLabel>
                  <div>{evidence.text}</div>
                  {isDefined(evidence.whyNow) &&
                    isNonEmptyString(evidence.whyNow) && (
                      <StyledMeta>Why-Now: {evidence.whyNow}</StyledMeta>
                    )}
                  {isDefined(evidence.doNotClaim) &&
                    evidence.doNotClaim.length > 0 && (
                      <StyledMeta>
                        Do not claim: {evidence.doNotClaim.join('; ')}
                      </StyledMeta>
                    )}
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
        </StyledDetail>
      )}
    </StyledRow>
  );
};
