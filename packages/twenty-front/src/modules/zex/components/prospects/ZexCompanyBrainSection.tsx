import { styled } from '@linaria/react';
import { useState } from 'react';
import { Status } from 'twenty-ui/data-display';
import { Button } from 'twenty-ui/input';
import { Card, CardContent } from 'twenty-ui/surfaces';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import {
  type CompanyBrainDetail,
  type CompanyBrainSummary,
} from '@/zex/types/prospects.types';

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

const StyledForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
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
  min-height: 80px;
  padding: ${themeCssVariables.spacing[2]};
`;

const StyledRow = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledSelect = styled.select`
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  padding: ${themeCssVariables.spacing[2]};
`;

type ZexCompanyBrainSectionProps = {
  brains?: CompanyBrainSummary[];
  brainsLoading: boolean;
  brainsError?: Error;
  selectedBrainId: string | null;
  onSelectBrainId: (brainId: string) => void;
  onCreateBrain: (input: {
    companyName: string;
    websiteUrl?: string;
    pastedText?: string;
  }) => Promise<void>;
  creating: boolean;
  createError?: string | null;
  brainDetail?: CompanyBrainDetail;
  brainDetailLoading: boolean;
  brainDetailError?: Error;
  analyzing: boolean;
  analysisError?: string | null;
  onAnalyze: () => void;
  onRegenerate: () => void;
  onAddSource: (input: {
    sourceType: 'PASTED_TEXT' | 'URL';
    text?: string;
    sourceUrl?: string;
  }) => Promise<void>;
  onRetryList: () => void;
};

const brainStatusColor = (
  status: string,
): 'green' | 'orange' | 'red' | 'gray' => {
  if (status === 'ready') return 'green';
  if (status === 'analyzing') return 'orange';
  if (status === 'failed') return 'red';

  return 'gray';
};

export const ZexCompanyBrainSection = ({
  brains,
  brainsLoading,
  brainsError,
  selectedBrainId,
  onSelectBrainId,
  onCreateBrain,
  creating,
  createError,
  brainDetail,
  brainDetailLoading,
  brainDetailError,
  analyzing,
  analysisError,
  onAnalyze,
  onRegenerate,
  onAddSource,
  onRetryList,
}: ZexCompanyBrainSectionProps) => {
  const [companyName, setCompanyName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [sourceText, setSourceText] = useState('');

  const hasBrains = (brains?.length ?? 0) > 0;

  return (
    <StyledCard>
      <StyledCardContent>
        <StyledTitle>Company Brain</StyledTitle>

        {brainsLoading && !brains && <StyledMuted>Loading brains…</StyledMuted>}

        {brainsError && !brains && (
          <StyledError role="alert">
            {brainsError.message}{' '}
            <Button title="Retry" onClick={onRetryList} variant="secondary" />
          </StyledError>
        )}

        {!brainsLoading && brains && !hasBrains && (
          <StyledForm>
            <StyledMuted>
              No Company Brain yet. Create one to unlock ICP and prospect
              discovery. Discovery run IDs are kept in this page session only.
            </StyledMuted>
            <StyledLabel>
              Company name
              <StyledInput
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder="Acme Inc"
              />
            </StyledLabel>
            <StyledLabel>
              Website
              <StyledInput
                value={websiteUrl}
                onChange={(event) => setWebsiteUrl(event.target.value)}
                placeholder="https://acme.example"
              />
            </StyledLabel>
            <StyledLabel>
              Optional context
              <StyledTextArea
                value={pastedText}
                onChange={(event) => setPastedText(event.target.value)}
                placeholder="Paste product or ICP notes"
              />
            </StyledLabel>
            {createError && (
              <StyledError role="alert">{createError}</StyledError>
            )}
            <Button
              title="Create Company Brain"
              onClick={() => {
                void onCreateBrain({
                  companyName: companyName.trim(),
                  websiteUrl: websiteUrl.trim() || undefined,
                  pastedText: pastedText.trim() || undefined,
                });
              }}
              disabled={creating || companyName.trim().length === 0}
              isLoading={creating}
            />
          </StyledForm>
        )}

        {hasBrains && (
          <>
            {(brains?.length ?? 0) > 1 && (
              <StyledLabel>
                Select Company Brain
                <StyledSelect
                  value={selectedBrainId ?? ''}
                  onChange={(event) => onSelectBrainId(event.target.value)}
                >
                  <option value="" disabled={true}>
                    Choose a brain…
                  </option>
                  {brains?.map((brain) => (
                    <option key={brain.id} value={brain.id}>
                      {brain.companyName} ({brain.status})
                    </option>
                  ))}
                </StyledSelect>
              </StyledLabel>
            )}

            {(brains?.length ?? 0) === 1 && selectedBrainId && (
              <StyledMuted>Using brain: {brains?.[0]?.companyName}</StyledMuted>
            )}

            {brainDetailLoading && !brainDetail && (
              <StyledMuted>Loading brain detail…</StyledMuted>
            )}

            {brainDetailError && (
              <StyledError role="alert">{brainDetailError.message}</StyledError>
            )}

            {brainDetail && (
              <>
                <StyledRow>
                  <Status
                    text={String(brainDetail.status)}
                    color={brainStatusColor(String(brainDetail.status))}
                  />
                  {brainDetail.websiteUrl && (
                    <StyledMuted>{brainDetail.websiteUrl}</StyledMuted>
                  )}
                </StyledRow>

                {(brainDetail.status === 'draft' ||
                  brainDetail.status === 'failed') && (
                  <StyledForm>
                    <StyledLabel>
                      Add context (pasted text)
                      <StyledTextArea
                        value={sourceText}
                        onChange={(event) => setSourceText(event.target.value)}
                      />
                    </StyledLabel>
                    <StyledRow>
                      <Button
                        title="Add source"
                        variant="secondary"
                        disabled={sourceText.trim().length === 0}
                        onClick={() => {
                          void onAddSource({
                            sourceType: 'PASTED_TEXT',
                            text: sourceText.trim(),
                          }).then(() => setSourceText(''));
                        }}
                      />
                      <Button
                        title="Analyze"
                        onClick={onAnalyze}
                        disabled={analyzing}
                        isLoading={analyzing}
                      />
                      {brainDetail.status === 'failed' && (
                        <Button
                          title="Regenerate"
                          variant="secondary"
                          onClick={onRegenerate}
                          disabled={analyzing}
                        />
                      )}
                    </StyledRow>
                  </StyledForm>
                )}

                {(brainDetail.status === 'analyzing' || analyzing) && (
                  <StyledMuted>Analysis in progress…</StyledMuted>
                )}

                {brainDetail.status === 'failed' && brainDetail.lastError && (
                  <StyledError role="alert">
                    {brainDetail.lastError}
                  </StyledError>
                )}

                {analysisError && (
                  <StyledError role="alert">{analysisError}</StyledError>
                )}
              </>
            )}
          </>
        )}
      </StyledCardContent>
    </StyledCard>
  );
};
