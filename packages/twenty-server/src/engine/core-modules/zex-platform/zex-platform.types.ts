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
