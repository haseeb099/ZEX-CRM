import { styled } from '@linaria/react';
import { isDefined } from 'twenty-shared/utils';
import { Status } from 'twenty-ui/data-display';
import { Button } from 'twenty-ui/input';
import { Card, CardContent } from 'twenty-ui/surfaces';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import {
  type ProspectCandidate,
  type ResearchPackage,
  type WhyNowSnapshot,
  isResearchEligibleStatus,
} from '@/zex/types/prospects.types';
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
  gap: ${themeCssVariables.spacing[3]};
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

const StyledError = styled.div`
  color: ${themeCssVariables.font.color.secondary};
`;

const StyledSectionTitle = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledScore = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.lg};
  font-weight: ${themeCssVariables.font.weight.semiBold};
`;

const StyledRow = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledList = styled.ul`
  color: ${themeCssVariables.font.color.secondary};
  margin: 0;
  padding-left: ${themeCssVariables.spacing[4]};
`;

type ZexCandidateDetailProps = {
  candidate?: ProspectCandidate;
  whyNow?: WhyNowSnapshot;
  research?: ResearchPackage;
  researchLoading?: boolean;
  mutationError?: string | null;
  isAnyPending: boolean;
  isApprovePending: boolean;
  isRejectPending: boolean;
  isCreatePending: boolean;
  isRetryPending: boolean;
  isWhyNowPending: boolean;
  isResearchPending: boolean;
  onApprove: () => void;
  onReject: () => void;
  onCreate: () => void;
  onRetryCreate: () => void;
  onScoreWhyNow: () => void;
  onStartResearch: () => void;
};

export const ZexCandidateDetail = ({
  candidate,
  whyNow,
  research,
  researchLoading,
  mutationError,
  isAnyPending,
  isApprovePending,
  isRejectPending,
  isCreatePending,
  isRetryPending,
  isWhyNowPending,
  isResearchPending,
  onApprove,
  onReject,
  onCreate,
  onRetryCreate,
  onScoreWhyNow,
  onStartResearch,
}: ZexCandidateDetailProps) => {
  if (!candidate) {
    return (
      <StyledCard>
        <StyledCardContent>
          <StyledTitle>Candidate detail</StyledTitle>
          <StyledMuted>Select a candidate to review actions.</StyledMuted>
        </StyledCardContent>
      </StyledCard>
    );
  }

  const status = String(candidate.status ?? '');
  const dedupeStatus = String(candidate.dedupeStatus ?? '');
  const isDuplicateLike =
    status === 'DUPLICATE' ||
    dedupeStatus === 'EXACT_MATCH' ||
    dedupeStatus === 'POSSIBLE_MATCH';
  const canApproveReject =
    status === 'PROPOSED' &&
    dedupeStatus !== 'EXACT_MATCH' &&
    status !== 'DUPLICATE';
  const canCreate = status === 'APPROVED';
  const canRetryCreate = status === 'FAILED';
  const canResearch = isResearchEligibleStatus(status);
  const buyerRoles = formatBuyerRoles(candidate.buyerRoles);

  return (
    <StyledCard>
      <StyledCardContent>
        <StyledTitle>{candidate.companyName ?? 'Candidate'}</StyledTitle>
        <StyledRow>
          {status && <Status text={status} color="gray" />}
          {dedupeStatus && dedupeStatus !== 'NEW' && (
            <Status text={dedupeStatus} color="orange" />
          )}
        </StyledRow>

        {isDuplicateLike && (
          <StyledMuted>
            Duplicate / possible match surfaced from Platform. Unsupported
            override actions are disabled — review existing CRM company id when
            present.
            {candidate.existingTwentyCompanyId
              ? ` Existing company: ${candidate.existingTwentyCompanyId}`
              : ''}
          </StyledMuted>
        )}

        {candidate.description && (
          <StyledMuted>{candidate.description}</StyledMuted>
        )}

        {buyerRoles.length > 0 && (
          <StyledMuted>
            Abstract buyer roles (not named contacts): {buyerRoles.join(', ')}
          </StyledMuted>
        )}

        {candidate.lastError && (
          <StyledError role="alert">{candidate.lastError}</StyledError>
        )}

        {candidate.createdTwentyCompanyId && (
          <StyledMuted>
            Created Twenty company: {candidate.createdTwentyCompanyId}
          </StyledMuted>
        )}

        <StyledSectionTitle>Why-Now</StyledSectionTitle>
        <StyledRow>
          <Button
            title={whyNow ? 'Refresh Why Now' : 'Score Why Now'}
            onClick={onScoreWhyNow}
            disabled={isAnyPending}
            isLoading={isWhyNowPending}
          />
        </StyledRow>
        {whyNow ? (
          <>
            <StyledScore>
              Overall:{' '}
              {isDefined(whyNow.overallScore) ? whyNow.overallScore : '—'}
            </StyledScore>
            <StyledMuted>
              Fit {whyNow.fitScore ?? '—'} · Intent {whyNow.intentScore ?? '—'}{' '}
              · Timing {whyNow.timingScore ?? '—'}
              {isDefined(whyNow.confidence)
                ? ` · Confidence ${whyNow.confidence}`
                : ''}
            </StyledMuted>
            {whyNow.whyNow && <StyledMuted>{whyNow.whyNow}</StyledMuted>}
            {formatReasonList(whyNow.fitReasons).length > 0 && (
              <StyledList>
                {formatReasonList(whyNow.fitReasons).map((reason) => (
                  <li key={`fit-${reason}`}>{reason}</li>
                ))}
              </StyledList>
            )}
            {formatReasonList(whyNow.intentReasons).length > 0 && (
              <StyledList>
                {formatReasonList(whyNow.intentReasons).map((reason) => (
                  <li key={`intent-${reason}`}>{reason}</li>
                ))}
              </StyledList>
            )}
            {formatReasonList(whyNow.timingReasons).length > 0 && (
              <StyledList>
                {formatReasonList(whyNow.timingReasons).map((reason) => (
                  <li key={`timing-${reason}`}>{reason}</li>
                ))}
              </StyledList>
            )}
            {Array.isArray(whyNow.signals) && whyNow.signals.length > 0 && (
              <StyledMuted>
                Signals: {formatListValue(whyNow.signals)}
              </StyledMuted>
            )}
          </>
        ) : (
          <StyledMuted>No Why-Now snapshot yet.</StyledMuted>
        )}

        <StyledSectionTitle>Approval</StyledSectionTitle>
        <StyledRow>
          <Button
            title="Approve"
            onClick={onApprove}
            disabled={!canApproveReject || isAnyPending || isDuplicateLike}
            isLoading={isApprovePending}
          />
          <Button
            title="Reject"
            variant="secondary"
            onClick={onReject}
            disabled={!canApproveReject || isAnyPending || isDuplicateLike}
            isLoading={isRejectPending}
          />
          {canCreate && (
            <Button
              title="Create Company in Twenty"
              onClick={onCreate}
              disabled={isAnyPending}
              isLoading={isCreatePending}
            />
          )}
          {canRetryCreate && (
            <Button
              title="Retry create"
              variant="secondary"
              onClick={onRetryCreate}
              disabled={isAnyPending}
              isLoading={isRetryPending}
            />
          )}
        </StyledRow>

        <StyledSectionTitle>Research</StyledSectionTitle>
        {!canResearch && (
          <StyledMuted>
            Research is available only for APPROVED or CREATED candidates.
          </StyledMuted>
        )}
        {canResearch && (
          <StyledRow>
            <Button
              title="Start Research"
              onClick={onStartResearch}
              disabled={isAnyPending || researchLoading}
              isLoading={isResearchPending || researchLoading}
            />
          </StyledRow>
        )}
        {researchLoading && <StyledMuted>Research in progress…</StyledMuted>}
        {research && (
          <>
            {research.companySummary && (
              <StyledMuted>{research.companySummary}</StyledMuted>
            )}
            {research.whyRelevant && (
              <StyledMuted>Why relevant: {research.whyRelevant}</StyledMuted>
            )}
            {research.whyNow && (
              <StyledMuted>Why now: {research.whyNow}</StyledMuted>
            )}
            {formatReasonList(research.keyFindings).length > 0 && (
              <StyledList>
                {formatReasonList(research.keyFindings).map((finding) => (
                  <li key={finding}>{finding}</li>
                ))}
              </StyledList>
            )}
            {isDefined(research.buyingCommitteeContext) && (
              <StyledMuted>
                Buying committee:{' '}
                {formatListValue(research.buyingCommitteeContext)}
              </StyledMuted>
            )}
            {isDefined(research.risksObjections) && (
              <StyledMuted>
                Risks / objections: {formatListValue(research.risksObjections)}
              </StyledMuted>
            )}
            {isDefined(research.outreachContext) && (
              <StyledMuted>
                Outreach context (guidance only):{' '}
                {formatListValue(research.outreachContext)}
              </StyledMuted>
            )}
            {isDefined(research.doNotClaim) && (
              <StyledMuted>
                Do not claim: {formatListValue(research.doNotClaim)}
              </StyledMuted>
            )}
            {isDefined(research.confidence) && (
              <StyledMuted>Confidence: {research.confidence}</StyledMuted>
            )}
          </>
        )}

        {mutationError && (
          <StyledError role="alert">{mutationError}</StyledError>
        )}
      </StyledCardContent>
    </StyledCard>
  );
};
