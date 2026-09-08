import { styled } from '@linaria/react';
import { isDefined } from 'twenty-shared/utils';
import { Status } from 'twenty-ui/data-display';
import { Card, CardContent } from 'twenty-ui/surfaces';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { type ProspectCandidate } from '@/zex/types/prospects.types';
import {
  formatBuyerRoles,
  formatListValue,
  formatReasonList,
} from '@/zex/utils/format-prospect-fields';

const StyledCard = styled(Card)`
  width: 100%;
`;

const StyledCardContent = styled(CardContent)`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledTitle = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.lg};
  font-weight: ${themeCssVariables.font.weight.semiBold};
`;

const StyledMuted = styled.div`
  color: ${themeCssVariables.font.color.secondary};
`;

const StyledList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledCandidateButton = styled.button<{ $active: boolean }>`
  background: transparent;
  border: 1px solid
    ${({ $active }) =>
      $active
        ? themeCssVariables.font.color.secondary
        : themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[2]};
  text-align: left;
`;

const StyledHeader = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledCompany = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-weight: ${themeCssVariables.font.weight.semiBold};
`;

type ZexCandidateListProps = {
  candidates: ProspectCandidate[];
  selectedCandidateId: string | null;
  onSelect: (candidateId: string) => void;
  emptyMessage?: string;
};

const candidateStatusColor = (
  status: string,
): 'green' | 'orange' | 'red' | 'gray' => {
  if (status === 'APPROVED' || status === 'CREATED') return 'green';
  if (status === 'PROPOSED') return 'gray';
  if (status === 'DUPLICATE') return 'orange';
  if (status === 'REJECTED' || status === 'FAILED') return 'red';

  return 'gray';
};

export const ZexCandidateList = ({
  candidates,
  selectedCandidateId,
  onSelect,
  emptyMessage = 'No candidates yet. Start prospect discovery to populate this list.',
}: ZexCandidateListProps) => {
  return (
    <StyledCard>
      <StyledCardContent>
        <StyledTitle>Candidates</StyledTitle>
        {candidates.length === 0 ? (
          <StyledMuted>{emptyMessage}</StyledMuted>
        ) : (
          <StyledList>
            {candidates.map((candidate) => {
              const fitReasons = formatReasonList(candidate.fitReasons);
              const buyerRoles = formatBuyerRoles(candidate.buyerRoles);
              const evidence = formatReasonList(candidate.evidence);

              return (
                <StyledCandidateButton
                  key={candidate.id}
                  type="button"
                  $active={selectedCandidateId === candidate.id}
                  onClick={() => onSelect(candidate.id)}
                >
                  <StyledHeader>
                    <StyledCompany>
                      {candidate.companyName ?? 'Unnamed company'}
                    </StyledCompany>
                    {isDefined(candidate.status) && (
                      <Status
                        text={String(candidate.status)}
                        color={candidateStatusColor(String(candidate.status))}
                      />
                    )}
                    {isDefined(candidate.dedupeStatus) &&
                      candidate.dedupeStatus !== 'NEW' && (
                        <Status
                          text={String(candidate.dedupeStatus)}
                          color="orange"
                        />
                      )}
                  </StyledHeader>
                  <StyledMuted>
                    {[
                      candidate.domain ?? candidate.websiteUrl,
                      candidate.industry,
                      candidate.companySize,
                      candidate.geography,
                    ]
                      .filter(isDefined)
                      .join(' · ')}
                  </StyledMuted>
                  {(isDefined(candidate.fitScore) ||
                    isDefined(candidate.fitBand)) && (
                    <StyledMuted>
                      Fit:{' '}
                      {[candidate.fitScore, candidate.fitBand]
                        .filter(isDefined)
                        .join(' / ')}
                    </StyledMuted>
                  )}
                  {fitReasons.length > 0 && (
                    <StyledMuted>Reasons: {fitReasons.join('; ')}</StyledMuted>
                  )}
                  {evidence.length > 0 && (
                    <StyledMuted>
                      Evidence: {evidence.slice(0, 3).join('; ')}
                    </StyledMuted>
                  )}
                  {buyerRoles.length > 0 && (
                    <StyledMuted>
                      Buyer roles (abstract): {buyerRoles.join(', ')}
                    </StyledMuted>
                  )}
                  {isDefined(candidate.disqualifiers) &&
                    formatListValue(candidate.disqualifiers).length > 0 && (
                      <StyledMuted>
                        Disqualifiers:{' '}
                        {formatListValue(candidate.disqualifiers)}
                      </StyledMuted>
                    )}
                </StyledCandidateButton>
              );
            })}
          </StyledList>
        )}
      </StyledCardContent>
    </StyledCard>
  );
};
