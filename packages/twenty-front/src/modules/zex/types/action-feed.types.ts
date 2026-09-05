export const ACTION_FEED_VERSION = 'action-feed-v1';

export const ACTION_PRIORITIES = ['critical', 'high', 'medium', 'low'] as const;
export type ActionPriority = (typeof ACTION_PRIORITIES)[number];

export const ACTION_KINDS = [
  'approve_prospect',
  'reject_prospect',
  'approve_sdr_draft',
  'reject_sdr_draft',
  'review_reply',
  'confirm_meeting',
  'inspect_failure',
] as const;
export type ActionKind = (typeof ACTION_KINDS)[number];

export const ACTION_FEED_ITEM_TYPES = [
  'meeting_opportunity',
  'reply_review',
  'sdr_draft_approval',
  'prospect_approval',
  'workflow_blocked',
] as const;
export type ActionFeedItemType = (typeof ACTION_FEED_ITEM_TYPES)[number];

export type ActionEvidence = {
  label: string;
  text: string;
  sourceUrl?: string | null;
  sourceTitle?: string | null;
  findingId?: string | null;
};

export type ActionFeedItem = {
  id: string;
  type: ActionFeedItemType;
  priority: ActionPriority;
  rankScore: number;
  score?: number | null;
  title: string;
  summary: string;
  prospectCandidateId?: string | null;
  companyName?: string | null;
  whyNow?: string | null;
  evidence: ActionEvidence[];
  action: {
    kind: ActionKind;
    entityId: string;
    secondaryKind?: ActionKind | null;
  };
  preview?: Record<string, unknown> | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type ActionFeedSummary = {
  needsApproval: number;
  replies: number;
  meetings: number;
  blocked: number;
  total: number;
};

export type ActionFeedResponse = {
  version: string;
  tenantId: string;
  generatedAt: string;
  summary: ActionFeedSummary;
  items: ActionFeedItem[];
};

export type ZexActionMutationIntent = 'approve' | 'reject' | 'confirm';
