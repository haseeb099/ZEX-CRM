export type ZexPlatformTenantResolveResponse = {
  tenantId: string;
  workspaceId?: string;
};

export type ZexPlatformActionEvidence = {
  label: string;
  text: string;
  sourceUrl?: string | null;
  sourceTitle?: string | null;
  findingId?: string | null;
};

export type ZexPlatformActionFeedItem = {
  id: string;
  type: string;
  priority: string;
  rankScore: number;
  score?: number | null;
  title: string;
  summary: string;
  prospectCandidateId?: string | null;
  companyName?: string | null;
  whyNow?: string | null;
  evidence: ZexPlatformActionEvidence[];
  action: {
    kind: string;
    entityId: string;
    secondaryKind?: string | null;
  };
  preview?: Record<string, unknown> | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type ZexPlatformActionFeedResponse = {
  version: string;
  tenantId: string;
  generatedAt: string;
  summary: {
    needsApproval: number;
    replies: number;
    meetings: number;
    blocked: number;
    total: number;
  };
  items: ZexPlatformActionFeedItem[];
};

// Agent Control Center (ZEX-39) — mirrors Platform agent-control-v1

export type ZexPlatformAgentId = 'research_agent' | 'ai_sdr';

export type ZexPlatformAgentStatus =
  | 'paused'
  | 'blocked'
  | 'degraded'
  | 'active'
  | 'idle';

export type ZexPlatformAgentControlState = 'ACTIVE' | 'PAUSED';

export type ZexPlatformPermissionMode =
  | 'allowed'
  | 'approval_required'
  | 'not_allowed'
  | 'human_only';

export type ZexPlatformAgentPermission = {
  key: string;
  label: string;
  mode: ZexPlatformPermissionMode;
  description: string;
};

export type ZexPlatformAgentApprovalPolicy = {
  summary: string;
  requiresHumanApproval: string[];
  neverAutonomous: string[];
};

export type ZexPlatformConfidenceValue = number | null | 'not_applicable';

export type ZexPlatformAgentActionEvidence = {
  label: string;
  text: string;
  sourceUrl?: string | null;
  sourceTitle?: string | null;
  evidenceType?: string | null;
  findingId?: string | null;
  draftVersion?: number | null;
  contentHash?: string | null;
  whyNow?: string | null;
  replyClassification?: string | null;
  meetingStatus?: string | null;
  doNotClaim?: string[] | null;
};

export type ZexPlatformUndoState = {
  status: 'none' | 'available' | 'undone' | 'superseded' | 'not_reversible';
  undoneByActionId?: string | null;
  undoneAt?: string | null;
};

export type ZexPlatformAgentAction = {
  id: string;
  agentId: ZexPlatformAgentId | null;
  actionType: string;
  status: string;
  occurredAt: string;
  updatedAt: string;
  subject: {
    resourceType: string | null;
    resourceId: string | null;
    summary: string | null;
  };
  evidenceSummary: ZexPlatformAgentActionEvidence[];
  confidence: ZexPlatformConfidenceValue;
  permissionKey: string | null;
  approvalState: string | null;
  triggeredBy: string;
  mutationSummary: {
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
    success: boolean;
    message: string | null;
  };
  reversible: boolean;
  undo: ZexPlatformUndoState;
  auditLogId: string;
};

export type ZexPlatformAgentMetrics = {
  currentWork: number;
  recentFailures: number;
  recentBlocked: number;
  awaitingApproval: number;
  lastActivityAt: string | null;
};

export type ZexPlatformAgentOverviewItem = {
  id: ZexPlatformAgentId;
  name: string;
  description: string;
  status: ZexPlatformAgentStatus;
  controlState: ZexPlatformAgentControlState;
  health: {
    operational: boolean;
    detail: string;
  };
  permissions: ZexPlatformAgentPermission[];
  approvalPolicy: ZexPlatformAgentApprovalPolicy;
  metrics: ZexPlatformAgentMetrics;
  recentActions: ZexPlatformAgentAction[];
};

export type ZexPlatformAgentControlOverviewResponse = {
  version: string;
  tenantId: string;
  generatedAt: string;
  agents: ZexPlatformAgentOverviewItem[];
};

export type ZexPlatformAgentActionsResponse = {
  version: string;
  tenantId: string;
  total: number;
  limit: number;
  offset: number;
  actions: ZexPlatformAgentAction[];
};

export type ZexPlatformAgentControlMutationResponse = {
  agentId: ZexPlatformAgentId;
  state: ZexPlatformAgentControlState;
  idempotent: boolean;
  actionId?: string;
  reversible?: boolean;
  auditLogId?: string;
};

export type ZexPlatformAgentUndoResponse = {
  undone: boolean;
  idempotent: boolean;
  actionId: string;
  undoActionId: string;
  agentId: ZexPlatformAgentId;
  state: ZexPlatformAgentControlState;
  auditLogId?: string;
};

// Company Brain / Prospect Discovery / Why-Now / Research (ZEX Prospects)

export type ZexPlatformCompanyBrainStatus =
  | 'draft'
  | 'analyzing'
  | 'ready'
  | 'failed';

export type ZexPlatformCompanyBrainSummary = {
  id: string;
  companyName: string;
  websiteUrl?: string | null;
  status: ZexPlatformCompanyBrainStatus | string;
  version?: number | string;
  lastAnalyzedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ZexPlatformCompanyBrainListResponse = {
  brains: ZexPlatformCompanyBrainSummary[];
};

export type ZexPlatformCreateCompanyBrainRequest = {
  companyName: string;
  websiteUrl?: string;
  extraUrls?: string[];
  pastedText?: string;
  documentText?: string;
  analyze?: boolean;
  sync?: boolean;
};

export type ZexPlatformCompanyBrainSourceType =
  | 'WEBSITE'
  | 'URL'
  | 'PASTED_TEXT'
  | 'DOCUMENT_TEXT';

export type ZexPlatformAddCompanyBrainSourceRequest = {
  sourceType: ZexPlatformCompanyBrainSourceType;
  sourceUrl?: string;
  title?: string;
  text?: string;
};

export type ZexPlatformPatchCompanyBrainRequest = {
  companyName?: string;
  websiteUrl?: string;
  icp?: Record<string, unknown>;
  personas?: unknown[];
  painPoints?: unknown[];
  competitors?: unknown[];
  qualificationRules?: unknown[];
  messagingSummary?: string;
};

export type ZexPlatformDiscoveryRunStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed';

export type ZexPlatformStartDiscoveryRequest = {
  companyBrainId: string;
  limit?: number;
  sync?: boolean;
};

export type ZexPlatformDiscoveryRunQueuedResponse = {
  id: string;
  status: ZexPlatformDiscoveryRunStatus | string;
  bullJobId?: string;
  companyBrainId: string;
};

export type ZexPlatformProspectCandidateStatus =
  | 'PROPOSED'
  | 'DUPLICATE'
  | 'APPROVED'
  | 'REJECTED'
  | 'CREATED'
  | 'FAILED';

export type ZexPlatformProspectDedupeStatus =
  | 'NEW'
  | 'EXACT_MATCH'
  | 'POSSIBLE_MATCH';

export type ZexPlatformProspectCandidate = {
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
  status?: ZexPlatformProspectCandidateStatus | string;
  dedupeStatus?: ZexPlatformProspectDedupeStatus | string;
  existingTwentyCompanyId?: string | null;
  createdTwentyCompanyId?: string | null;
  evidence?: unknown;
  buyerRoles?: unknown;
  lastError?: string | null;
  discoveryRunId?: string | null;
  [key: string]: unknown;
};

export type ZexPlatformDiscoveryRunResponse = {
  id: string;
  status: ZexPlatformDiscoveryRunStatus | string;
  companyBrainId?: string;
  candidateSummary?: Record<string, unknown>;
  candidates?: ZexPlatformProspectCandidate[];
  lastError?: string | null;
  [key: string]: unknown;
};

export type ZexPlatformWhyNowRequest = {
  sync?: boolean;
  collectSignals?: boolean;
};

export type ZexPlatformWhyNowSnapshot = {
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

export type ZexPlatformResearchRequest = {
  sync?: boolean;
};

export type ZexPlatformResearchQueuedResponse = {
  status: string;
  jobId?: string;
  researchRunId: string;
  prospectCandidateId: string;
};

export type ZexPlatformResearchRunStatus =
  | 'QUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'BLOCKED';

export type ZexPlatformResearchPackage = {
  status?: ZexPlatformResearchRunStatus | string;
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
