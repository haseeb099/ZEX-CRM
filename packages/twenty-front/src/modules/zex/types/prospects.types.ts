export type CompanyBrainStatus = 'draft' | 'analyzing' | 'ready' | 'failed';

export type CompanyBrainSummary = {
  id: string;
  companyName: string;
  websiteUrl?: string | null;
  status: CompanyBrainStatus | string;
  version?: number | string;
  lastAnalyzedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CompanyBrainListResponse = {
  brains: CompanyBrainSummary[];
};

export type CreateCompanyBrainRequest = {
  companyName: string;
  websiteUrl?: string;
  pastedText?: string;
  analyze?: boolean;
  sync?: boolean;
};

export type CompanyBrainIcp = {
  industries?: string[];
  companySize?: string | string[] | null;
  geography?: string | string[] | null;
  useCases?: string[];
  buyingTriggers?: string[];
  disqualifiers?: string[];
  [key: string]: unknown;
};

export type CompanyBrainDetail = {
  id: string;
  companyName: string;
  websiteUrl?: string | null;
  status: CompanyBrainStatus | string;
  version?: number | string;
  payload?: {
    icp?: CompanyBrainIcp;
    personas?: unknown[];
    qualificationRules?: unknown[];
    messagingSummary?: string;
    [key: string]: unknown;
  } | null;
  userOverrides?: Record<string, unknown> | null;
  lastAnalyzedAt?: string | null;
  lastError?: string | null;
  sources?: unknown[];
  recentAnalysisJobs?: Array<{
    id?: string;
    status?: string;
    [key: string]: unknown;
  }>;
  icp?: CompanyBrainIcp;
  personas?: unknown[];
  qualificationRules?: unknown[];
  messagingSummary?: string;
  [key: string]: unknown;
};

export type PatchCompanyBrainRequest = {
  companyName?: string;
  websiteUrl?: string;
  icp?: CompanyBrainIcp;
  personas?: unknown[];
  qualificationRules?: unknown[];
  messagingSummary?: string;
};

export type DiscoveryRunStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed';

export type DiscoveryRunQueuedResponse = {
  id: string;
  status: DiscoveryRunStatus | string;
  bullJobId?: string;
  companyBrainId: string;
};

export type ProspectCandidateStatus =
  | 'PROPOSED'
  | 'DUPLICATE'
  | 'APPROVED'
  | 'REJECTED'
  | 'CREATED'
  | 'FAILED';

export type ProspectDedupeStatus = 'NEW' | 'EXACT_MATCH' | 'POSSIBLE_MATCH';

export type ProspectCandidate = {
  id: string;
  companyName?: string | null;
  domain?: string | null;
  websiteUrl?: string | null;
  industry?: string | null;
  companySize?: string | null;
  geography?: string | null;
  description?: string | null;
  fitScore?: number | null;
  fitBand?: string | null;
  fitReasons?: unknown;
  disqualifiers?: unknown;
  status?: ProspectCandidateStatus | string;
  dedupeStatus?: ProspectDedupeStatus | string;
  existingTwentyCompanyId?: string | null;
  createdTwentyCompanyId?: string | null;
  evidence?: unknown;
  buyerRoles?: unknown;
  lastError?: string | null;
  discoveryRunId?: string | null;
  [key: string]: unknown;
};

export type DiscoveryRunResponse = {
  id: string;
  status: DiscoveryRunStatus | string;
  companyBrainId?: string;
  candidateSummary?: Record<string, unknown>;
  candidates?: ProspectCandidate[];
  lastError?: string | null;
  [key: string]: unknown;
};

export type WhyNowSnapshot = {
  fitScore?: number | null;
  intentScore?: number | null;
  timingScore?: number | null;
  overallScore?: number | null;
  confidence?: number | null;
  whyNow?: string | null;
  fitReasons?: unknown;
  intentReasons?: unknown;
  timingReasons?: unknown;
  signalIds?: unknown;
  scoringVersion?: string | null;
  signals?: unknown[];
  [key: string]: unknown;
};

export type ResearchQueuedResponse = {
  status: string;
  jobId?: string;
  researchRunId: string;
  prospectCandidateId: string;
};

export type ResearchPackage = {
  status?: string;
  companySummary?: string | null;
  whyRelevant?: string | null;
  whyNow?: string | null;
  whyNowSnapshotId?: string | null;
  keyFindings?: unknown;
  buyingCommitteeContext?: unknown;
  risksObjections?: unknown;
  outreachContext?: unknown;
  confidence?: number | null;
  researchVersion?: string | null;
  findingIds?: unknown;
  doNotClaim?: unknown;
  [key: string]: unknown;
};

export const isResearchEligibleStatus = (
  status: string | null | undefined,
): boolean => status === 'APPROVED' || status === 'CREATED';

export const isTerminalDiscoveryStatus = (
  status: string | null | undefined,
): boolean => status === 'completed' || status === 'failed';

export const isTerminalAnalysisJobStatus = (
  status: string | null | undefined,
): boolean => status === 'completed' || status === 'failed';

export const isTerminalResearchStatus = (
  status: string | null | undefined,
): boolean =>
  status === 'COMPLETED' ||
  status === 'FAILED' ||
  status === 'BLOCKED' ||
  status === 'completed' ||
  status === 'failed' ||
  status === 'blocked';
