import { styled } from '@linaria/react';
import { IconLego } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { ZexAgentCard } from '@/zex/components/ZexAgentCard';
import { ZexAgentControlError } from '@/zex/components/ZexAgentControlError';
import { ZexAgentControlLoading } from '@/zex/components/ZexAgentControlLoading';
import { ZexShellPage } from '@/zex/components/ZexShellPage';
import { useZexAgentControl } from '@/zex/hooks/useZexAgentControl';
import { useZexAgentMutation } from '@/zex/hooks/useZexAgentMutation';

const StyledAgentList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
`;

const StyledMutationError = styled.div`
  color: ${themeCssVariables.font.color.secondary};
  padding: ${themeCssVariables.spacing[2]} 0;
`;

const StyledEmpty = styled.div`
  color: ${themeCssVariables.font.color.secondary};
  padding: ${themeCssVariables.spacing[2]} 0;
`;

export const ZexAgentsPage = () => {
  const { data, loading, error, refetch } = useZexAgentControl();
  const { pause, resume, undo, isPending, isAnyPending, mutationError } =
    useZexAgentMutation(refetch);

  return (
    <ZexShellPage
      title="Agents"
      subtitle="Monitor ZEX agents, approvals, permissions and recent actions."
      Icon={IconLego}
    >
      {loading && !data && <ZexAgentControlLoading />}

      {error && !data && (
        <ZexAgentControlError
          message={error.message}
          onRetry={() => void refetch()}
        />
      )}

      {data && (
        <>
          {mutationError && (
            <StyledMutationError role="alert">
              {mutationError}
            </StyledMutationError>
          )}

          {data.agents.length === 0 ? (
            <StyledEmpty>
              No implemented agents reported by Platform.
            </StyledEmpty>
          ) : (
            <StyledAgentList>
              {data.agents.map((agent) => (
                <ZexAgentCard
                  key={agent.id}
                  agent={agent}
                  onPause={(agentId) => void pause(agentId)}
                  onResume={(agentId) => void resume(agentId)}
                  onUndo={(actionId) => void undo(actionId)}
                  isPausePending={isPending('pause', agent.id)}
                  isResumePending={isPending('resume', agent.id)}
                  isUndoPending={(actionId) => isPending('undo', actionId)}
                  isAnyPending={isAnyPending}
                />
              ))}
            </StyledAgentList>
          )}
        </>
      )}
    </ZexShellPage>
  );
};
