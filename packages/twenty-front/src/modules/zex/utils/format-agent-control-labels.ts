import { isDefined } from 'twenty-shared/utils';

import {
  type AgentStatus,
  type ConfidenceValue,
  type PermissionMode,
} from '@/zex/types/agent-control.types';

export const formatAgentStatusLabel = (status: AgentStatus): string => {
  switch (status) {
    case 'paused':
      return 'Paused';
    case 'blocked':
      return 'Blocked';
    case 'degraded':
      return 'Degraded';
    case 'active':
      return 'Active';
    case 'idle':
      return 'Idle';
    default:
      return status;
  }
};

export const agentStatusColor = (
  status: AgentStatus,
): 'gray' | 'orange' | 'turquoise' | 'blue' | 'red' => {
  switch (status) {
    case 'paused':
      return 'orange';
    case 'blocked':
      return 'red';
    case 'degraded':
      return 'orange';
    case 'active':
      return 'turquoise';
    case 'idle':
      return 'gray';
    default:
      return 'gray';
  }
};

export const formatPermissionModeLabel = (mode: PermissionMode): string => {
  switch (mode) {
    case 'allowed':
      return 'Allowed';
    case 'approval_required':
      return 'Approval required';
    case 'not_allowed':
      return 'Not allowed';
    case 'human_only':
      return 'Human only';
    default:
      return mode;
  }
};

export const formatApprovalStateLabel = (
  approvalState: string | null,
): string => {
  if (!isDefined(approvalState) || approvalState.length === 0) {
    return 'Not applicable';
  }

  switch (approvalState) {
    case 'awaiting_approval':
      return 'Awaiting approval';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    case 'superseded':
      return 'Superseded';
    case 'approval_revoked':
      return 'Approval revoked';
    case 'sent':
      return 'Sent';
    case 'meeting_awaiting_confirmation':
      return 'Meeting awaiting confirmation';
    case 'meeting_booked':
      return 'Meeting booked';
    case 'send_blocked':
      return 'Send blocked';
    case 'not_required':
      return 'Not required';
    default:
      return approvalState.replaceAll('_', ' ');
  }
};

export const formatConfidenceLabel = (
  confidence: ConfidenceValue,
): string | null => {
  if (confidence === 'not_applicable') {
    return 'Confidence: not applicable';
  }

  if (confidence === null) {
    return null;
  }

  return `Confidence: ${Math.round(confidence * 100)}%`;
};

export const formatRelativeTimestamp = (iso: string | null): string => {
  if (!isDefined(iso)) {
    return 'No recent activity';
  }

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown time';
  }

  return date.toLocaleString();
};

export const pauseEffectCopy = (agentId: string): string => {
  if (agentId === 'ai_sdr') {
    return 'Pausing stops new AI SDR drafts and outbound progression. Inbound reply and unsubscribe safety processing continues. Existing history remains visible.';
  }

  return 'Pausing stops new agent work. Existing history remains visible.';
};
