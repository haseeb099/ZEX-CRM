import { styled } from '@linaria/react';
import { useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { Status } from 'twenty-ui/data-display';
import { Button } from 'twenty-ui/input';
import { Card, CardContent } from 'twenty-ui/surfaces';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { ZexAgentActionRow } from '@/zex/components/ZexAgentActionRow';
import { type AgentOverviewItem } from '@/zex/types/agent-control.types';
import {
  agentStatusColor,
  formatAgentStatusLabel,
  formatPermissionModeLabel,
  formatRelativeTimestamp,
  pauseEffectCopy,
} from '@/zex/utils/format-agent-control-labels';

const StyledCard = styled(Card)`
  width: 100%;
`;

const StyledCardContent = styled(CardContent)`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
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
  font-size: ${themeCssVariables.font.size.lg};
  font-weight: ${themeCssVariables.font.weight.semiBold};
`;

const StyledDescription = styled.div`
  color: ${themeCssVariables.font.color.secondary};
  line-height: ${themeCssVariables.text.lineHeight.lg};
`;

const StyledMetrics = styled.div`
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-wrap: wrap;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[3]};
`;

const StyledSectionTitle = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledPermissionList = styled.ul`
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  list-style: none;
  margin: 0;
  padding: 0;
`;

const StyledPolicy = styled.div`
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-direction: column;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledActions = styled.div`
  align-items: flex-start;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledActionButtons = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledHint = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledHistory = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

type ZexAgentCardProps = {
  agent: AgentOverviewItem;
  onPause: (agentId: AgentOverviewItem['id']) => void;
  onResume: (agentId: AgentOverviewItem['id']) => void;
  onUndo: (actionId: string) => void;
  isPausePending: boolean;
  isResumePending: boolean;
  isUndoPending: (actionId: string) => boolean;
  isAnyPending: boolean;
};

export const ZexAgentCard = ({
  agent,
  onPause,
  onResume,
  onUndo,
  isPausePending,
  isResumePending,
  isUndoPending,
  isAnyPending,
}: ZexAgentCardProps) => {
  const [confirmPause, setConfirmPause] = useState(false);
  const isPaused = agent.controlState === 'PAUSED';

  return (
    <StyledCard rounded={true} fullWidth>
      <StyledCardContent>
        <StyledHeader>
          <Status
            text={formatAgentStatusLabel(agent.status)}
            color={agentStatusColor(agent.status)}
            weight="medium"
          />
          <StyledTitle>{agent.name}</StyledTitle>
        </StyledHeader>

        <StyledDescription>{agent.description}</StyledDescription>
        <StyledHint>{agent.health.detail}</StyledHint>

        <StyledMetrics>
          <span>Current work: {agent.metrics.currentWork}</span>
          <span>Approvals waiting: {agent.metrics.awaitingApproval}</span>
          <span>
            Failures / blocked:{' '}
            {agent.metrics.recentFailures + agent.metrics.recentBlocked}
          </span>
          <span>
            Last activity:{' '}
            {formatRelativeTimestamp(agent.metrics.lastActivityAt)}
          </span>
        </StyledMetrics>

        <div>
          <StyledSectionTitle>Capabilities &amp; safeguards</StyledSectionTitle>
          <StyledPermissionList>
            {agent.permissions.map((permission) => (
              <li key={permission.key}>
                {permission.label} —{' '}
                {formatPermissionModeLabel(permission.mode)}
              </li>
            ))}
          </StyledPermissionList>
        </div>

        <StyledPolicy>
          <StyledSectionTitle>Approval policy</StyledSectionTitle>
          <div>{agent.approvalPolicy.summary}</div>
          <div>
            Requires approval:{' '}
            {agent.approvalPolicy.requiresHumanApproval.join(', ') || 'None'}
          </div>
          <div>
            Never autonomous:{' '}
            {agent.approvalPolicy.neverAutonomous.join(', ') || 'None'}
          </div>
        </StyledPolicy>

        <StyledActions>
          <StyledActionButtons>
            {isPaused ? (
              <Button
                variant="primary"
                title={`Resume ${agent.name}`}
                disabled={isAnyPending}
                isLoading={isResumePending}
                onClick={() => onResume(agent.id)}
              />
            ) : confirmPause ? (
              <>
                <Button
                  variant="secondary"
                  title={`Confirm pause ${agent.name}`}
                  disabled={isAnyPending}
                  isLoading={isPausePending}
                  onClick={() => {
                    onPause(agent.id);
                    setConfirmPause(false);
                  }}
                />
                <Button
                  variant="tertiary"
                  title="Cancel"
                  disabled={isAnyPending}
                  onClick={() => setConfirmPause(false)}
                />
              </>
            ) : (
              <Button
                variant="secondary"
                title={`Pause ${agent.name}`}
                disabled={isAnyPending}
                onClick={() => setConfirmPause(true)}
              />
            )}
          </StyledActionButtons>
          {(confirmPause || isPaused) && (
            <StyledHint>{pauseEffectCopy(agent.id)}</StyledHint>
          )}
        </StyledActions>

        <div>
          <StyledSectionTitle>Recent actions</StyledSectionTitle>
          {agent.recentActions.length === 0 ? (
            <StyledHint>No recent agent actions.</StyledHint>
          ) : (
            <StyledHistory>
              {agent.recentActions.map((action) => (
                <ZexAgentActionRow
                  key={action.id}
                  action={action}
                  agentName={agent.name}
                  onUndo={onUndo}
                  isUndoPending={isUndoPending(action.id)}
                  isAnyPending={isAnyPending}
                />
              ))}
            </StyledHistory>
          )}
        </div>

        {isDefined(agent.metrics.currentWork) &&
          agent.metrics.currentWork === 0 &&
          agent.status === 'idle' && (
            <StyledHint>No current work for this agent.</StyledHint>
          )}
      </StyledCardContent>
    </StyledCard>
  );
};
