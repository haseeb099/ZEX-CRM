import { styled } from '@linaria/react';
import { useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { Button } from 'twenty-ui/input';
import { Card, CardContent } from 'twenty-ui/surfaces';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import {
  type CompanyBrainDetail,
  type CompanyBrainIcp,
  type PatchCompanyBrainRequest,
} from '@/zex/types/prospects.types';
import {
  formatListValue,
  parseCommaSeparated,
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

const StyledGrid = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
`;

const StyledLabel = styled.label`
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-direction: column;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledInput = styled.input`
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  padding: ${themeCssVariables.spacing[2]};
`;

const StyledTextArea = styled.textarea`
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  min-height: 72px;
  padding: ${themeCssVariables.spacing[2]};
`;

const StyledRow = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
`;

const resolveIcp = (brain?: CompanyBrainDetail): CompanyBrainIcp => {
  if (!brain) {
    return {};
  }

  if (brain.payload?.icp && typeof brain.payload.icp === 'object') {
    return brain.payload.icp;
  }

  if (brain.icp && typeof brain.icp === 'object') {
    return brain.icp;
  }

  return {};
};

type ZexIcpSectionProps = {
  brain?: CompanyBrainDetail;
  saveState: 'idle' | 'saving' | 'saved' | 'error';
  saveError?: string | null;
  onSave: (body: PatchCompanyBrainRequest) => Promise<void>;
};

export const ZexIcpSection = ({
  brain,
  saveState,
  saveError,
  onSave,
}: ZexIcpSectionProps) => {
  const icp = resolveIcp(brain);
  const [draftKey, setDraftKey] = useState<string | null>(null);
  const [industries, setIndustries] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [geography, setGeography] = useState('');
  const [useCases, setUseCases] = useState('');
  const [buyingTriggers, setBuyingTriggers] = useState('');
  const [disqualifiers, setDisqualifiers] = useState('');
  const [messagingSummary, setMessagingSummary] = useState('');

  const brainDraftKey = brain
    ? `${brain.id}:${brain.status}:${brain.updatedAt ?? ''}:${JSON.stringify(icp)}`
    : null;

  if (brainDraftKey !== draftKey) {
    setDraftKey(brainDraftKey);
    setIndustries(formatListValue(icp.industries));
    setCompanySize(formatListValue(icp.companySize));
    setGeography(formatListValue(icp.geography));
    setUseCases(formatListValue(icp.useCases));
    setBuyingTriggers(formatListValue(icp.buyingTriggers));
    setDisqualifiers(formatListValue(icp.disqualifiers));
    setMessagingSummary(
      typeof brain?.payload?.messagingSummary === 'string'
        ? brain.payload.messagingSummary
        : typeof brain?.messagingSummary === 'string'
          ? brain.messagingSummary
          : '',
    );
  }

  if (!brain || brain.status !== 'ready') {
    return (
      <StyledCard>
        <StyledCardContent>
          <StyledTitle>ICP</StyledTitle>
          <StyledMuted>
            ICP appears once a Company Brain reaches ready status.
          </StyledMuted>
        </StyledCardContent>
      </StyledCard>
    );
  }

  const personas = brain.payload?.personas ?? brain.personas;
  const qualificationRules =
    brain.payload?.qualificationRules ?? brain.qualificationRules;

  return (
    <StyledCard>
      <StyledCardContent>
        <StyledTitle>ICP</StyledTitle>
        <StyledGrid>
          <StyledLabel>
            Industries
            <StyledInput
              value={industries}
              onChange={(event) => setIndustries(event.target.value)}
            />
          </StyledLabel>
          <StyledLabel>
            Company size
            <StyledInput
              value={companySize}
              onChange={(event) => setCompanySize(event.target.value)}
            />
          </StyledLabel>
          <StyledLabel>
            Geography
            <StyledInput
              value={geography}
              onChange={(event) => setGeography(event.target.value)}
            />
          </StyledLabel>
          <StyledLabel>
            Use cases
            <StyledInput
              value={useCases}
              onChange={(event) => setUseCases(event.target.value)}
            />
          </StyledLabel>
          <StyledLabel>
            Buying triggers
            <StyledInput
              value={buyingTriggers}
              onChange={(event) => setBuyingTriggers(event.target.value)}
            />
          </StyledLabel>
          <StyledLabel>
            Disqualifiers
            <StyledInput
              value={disqualifiers}
              onChange={(event) => setDisqualifiers(event.target.value)}
            />
          </StyledLabel>
        </StyledGrid>

        <StyledLabel>
          Messaging summary
          <StyledTextArea
            value={messagingSummary}
            onChange={(event) => setMessagingSummary(event.target.value)}
          />
        </StyledLabel>

        {isDefined(personas) && (
          <StyledMuted>
            Personas: {formatListValue(personas) || 'None provided'}
          </StyledMuted>
        )}

        {isDefined(qualificationRules) && (
          <StyledMuted>
            Qualification rules:{' '}
            {formatListValue(qualificationRules) || 'None provided'}
          </StyledMuted>
        )}

        <StyledRow>
          <Button
            title="Save ICP"
            disabled={saveState === 'saving'}
            isLoading={saveState === 'saving'}
            onClick={() => {
              void onSave({
                icp: {
                  industries: parseCommaSeparated(industries),
                  companySize: companySize.trim() || undefined,
                  geography: geography.trim() || undefined,
                  useCases: parseCommaSeparated(useCases),
                  buyingTriggers: parseCommaSeparated(buyingTriggers),
                  disqualifiers: parseCommaSeparated(disqualifiers),
                },
                ...(messagingSummary.trim().length > 0
                  ? { messagingSummary: messagingSummary.trim() }
                  : {}),
              });
            }}
          />
          <StyledMuted>
            {saveState === 'saving' && 'Saving…'}
            {saveState === 'saved' && 'Saved'}
            {saveState === 'error' && (saveError ?? 'Save failed')}
          </StyledMuted>
        </StyledRow>
      </StyledCardContent>
    </StyledCard>
  );
};
