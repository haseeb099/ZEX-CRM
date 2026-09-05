export const AGENT_CONTROL_VERSION = 'agent-control-v1';

export type AgentId = 'research_agent' | 'ai_sdr';

export type AgentStatus = 'paused' | 'blocked' | 'degraded' | 'active' | 'idle';

export type AgentControlState = 'ACTIVE' | 'PAUSED';

export type PermissionMode =
  | 'allowed'
  | 'approval_required'
  | 'not_allowed'
  | 'human_only';

export type AgentPermission = {
  key: string;
  label: string;
  mode: PermissionMode;
  description: string;
};

export type AgentApprovalPolicy = {
  summary: string;
  requiresHumanApproval: string[];
  neverAutonomous: string[];
};

export type ConfidenceValue = number | null | 'not_applicable';

export type AgentActionEvidence = {
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

export type UndoState = {
  status: 'none' | 'available' | 'undone' | 'not_reversible';
  undoneByActionId?: string | null;
  undoneAt?: string | null;
};

export type AgentAction = {
  id: string;
  agentId: AgentId | null;
  actionType: string;
  status: string;
  occurredAt: string;
  updatedAt: string;
  subject: {
    resourceType: string | null;
    resourceId: string | null;
    summary: string | null;
  };
  evidenceSummary: AgentActionEvidence[];
  confidence: ConfidenceValue;
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
  undo: UndoState;
  auditLogId: string;
};

export type AgentMetrics = {
  currentWork: number;
  recentFailures: number;
  recentBlocked: number;
  awaitingApproval: number;
  lastActivityAt: string | null;
};

export type AgentOverviewItem = {
  id: AgentId;
  name: string;
  description: string;
  status: AgentStatus;
  controlState: AgentControlState;
  health: {
    operational: boolean;
    detail: string;
  };
  permissions: AgentPermission[];
  approvalPolicy: AgentApprovalPolicy;
  metrics: AgentMetrics;
  recentActions: AgentAction[];
};

export type AgentControlOverviewResponse = {
  version: string;
  tenantId: string;
  generatedAt: string;
  agents: AgentOverviewItem[];
};
