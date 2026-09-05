import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ZexAgentsPage } from '@/zex/pages/ZexAgentsPage';
import {
  type AgentAction,
  type AgentControlOverviewResponse,
  type AgentOverviewItem,
} from '@/zex/types/agent-control.types';

jest.mock('@linaria/react', () => require('./linaria-mock').linariaMock);

jest.mock('@/ui/utilities/page-title/components/PageTitle', () => ({
  PageTitle: () => null,
}));

jest.mock('@/ui/layout/page/components/PageCardLayout', () => ({
  PageCardLayout: ({
    header,
    children,
  }: {
    header: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      {header}
      {children}
    </div>
  ),
}));

jest.mock('@/ui/layout/page/components/PageCardHeader', () => ({
  PageCardHeader: ({ title }: { title?: React.ReactNode }) => <h1>{title}</h1>,
}));

jest.mock('twenty-ui/data-display', () => ({
  Status: ({ text }: { text: string }) => <span>{text}</span>,
  Pill: ({ label }: { label: string }) => <span>{label}</span>,
}));

jest.mock('twenty-ui/surfaces', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock('twenty-ui/typography', () => ({
  H2Title: ({
    title,
    description,
  }: {
    title: string;
    description?: string;
  }) => (
    <div>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  ),
}));

jest.mock('twenty-ui/layout', () => ({
  Section: ({ children }: { children: React.ReactNode }) => (
    <section>{children}</section>
  ),
}));

jest.mock('twenty-ui/input', () => ({
  Button: ({
    title,
    onClick,
    disabled,
    isLoading,
  }: {
    title?: string;
    onClick?: () => void;
    disabled?: boolean;
    isLoading?: boolean;
  }) => (
    <button type="button" disabled={disabled || isLoading} onClick={onClick}>
      {title}
    </button>
  ),
}));

jest.mock('react-loading-skeleton', () => ({
  __esModule: true,
  default: () => <div data-testid="skeleton" />,
  SkeletonTheme: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

jest.mock('twenty-ui/theme-constants', () => ({
  themeCssVariables: {
    spacing: { 1: '4px', 2: '8px', 3: '12px', 4: '16px' },
    font: {
      color: {
        primary: '#000',
        secondary: '#666',
        tertiary: '#999',
      },
      size: { xs: '12px', sm: '13px', lg: '16px' },
      weight: { medium: '500', semiBold: '600' },
    },
    text: { lineHeight: { lg: '1.5' } },
    border: {
      color: { light: '#eee' },
      radius: { md: '8px' },
    },
  },
  ThemeContext: {
    Consumer: ({
      children,
    }: {
      children: (value: { theme: object }) => React.ReactNode;
    }) =>
      children({
        theme: {
          background: {
            tertiary: '#eee',
            transparent: { lighter: '#f5f5f5' },
          },
        },
      }),
  },
}));

jest.mock('react', () => {
  const actual = jest.requireActual('react');

  return {
    ...actual,
    useContext: () => ({
      theme: {
        background: {
          tertiary: '#eee',
          transparent: { lighter: '#f5f5f5' },
        },
      },
    }),
  };
});

jest.mock('@/zex/utils/zexRestClient', () => ({
  zexFetch: jest.fn(),
}));

const { zexFetch } = jest.requireMock('@/zex/utils/zexRestClient') as {
  zexFetch: jest.Mock;
};

const reversiblePauseAction: AgentAction = {
  id: 'action-pause-1',
  agentId: 'research_agent',
  actionType: 'agent_control_paused',
  status: 'completed',
  occurredAt: '2026-09-05T10:00:00.000Z',
  updatedAt: '2026-09-05T10:00:00.000Z',
  subject: {
    resourceType: 'TenantAgentControl',
    resourceId: 'ctrl-1',
    summary: 'Paused research agent',
  },
  evidenceSummary: [],
  confidence: 'not_applicable',
  permissionKey: 'agent_control',
  approvalState: null,
  triggeredBy: 'user@zex.test',
  mutationSummary: {
    before: { state: 'ACTIVE' },
    after: { state: 'PAUSED', reversible: true },
    success: true,
    message: 'Paused',
  },
  reversible: true,
  undo: { status: 'available' },
  auditLogId: 'action-pause-1',
};

const irreversibleSentAction: AgentAction = {
  id: 'action-sent-1',
  agentId: 'ai_sdr',
  actionType: 'sdr_sent',
  status: 'completed',
  occurredAt: '2026-09-05T09:00:00.000Z',
  updatedAt: '2026-09-05T09:00:00.000Z',
  subject: {
    resourceType: 'SdrDraft',
    resourceId: 'draft-1',
    summary: 'Outreach sent',
  },
  evidenceSummary: [
    {
      label: 'Draft context',
      text: 'Exact approved draft sent',
      draftVersion: 2,
      doNotClaim: ['pricing guarantee'],
    },
  ],
  confidence: null,
  permissionKey: 'send_outreach',
  approvalState: 'sent',
  triggeredBy: 'system',
  mutationSummary: {
    before: null,
    after: { status: 'SENT' },
    success: true,
    message: 'Sent',
  },
  reversible: false,
  undo: { status: 'not_reversible' },
  auditLogId: 'action-sent-1',
};

const researchAgent: AgentOverviewItem = {
  id: 'research_agent',
  name: 'Research Agent',
  description: 'Source-backed research for approved prospects.',
  status: 'active',
  controlState: 'ACTIVE',
  health: { operational: true, detail: 'Current work in progress' },
  permissions: [
    {
      key: 'research_accounts',
      label: 'Research approved accounts',
      mode: 'allowed',
      description: 'Allowed',
    },
    {
      key: 'write_research_findings',
      label: 'Write research findings',
      mode: 'allowed',
      description: 'Allowed',
    },
    {
      key: 'mutate_crm',
      label: 'Mutate CRM',
      mode: 'not_allowed',
      description: 'Not allowed',
    },
  ],
  approvalPolicy: {
    summary: 'Prospect must already be APPROVED/CREATED.',
    requiresHumanApproval: ['prospect_approval_before_research'],
    neverAutonomous: ['crm_write', 'email_send'],
  },
  metrics: {
    currentWork: 1,
    recentFailures: 0,
    recentBlocked: 0,
    awaitingApproval: 0,
    lastActivityAt: '2026-09-05T10:00:00.000Z',
  },
  recentActions: [reversiblePauseAction],
};

const aiSdrAgent: AgentOverviewItem = {
  id: 'ai_sdr',
  name: 'AI SDR',
  description: 'Approval-first outreach.',
  status: 'idle',
  controlState: 'ACTIVE',
  health: { operational: true, detail: 'Idle — no current work' },
  permissions: [
    {
      key: 'draft_outreach',
      label: 'Create personalized drafts',
      mode: 'allowed',
      description: 'Allowed',
    },
    {
      key: 'send_outreach',
      label: 'Send outreach',
      mode: 'approval_required',
      description: 'Approval required',
    },
    {
      key: 'book_meeting',
      label: 'Book meeting',
      mode: 'approval_required',
      description: 'Approval required',
    },
  ],
  approvalPolicy: {
    summary: 'No outbound send without explicit human approval.',
    requiresHumanApproval: ['draft_approval_before_send', 'meeting_confirm'],
    neverAutonomous: ['email_send_without_approval', 'auto_send'],
  },
  metrics: {
    currentWork: 0,
    recentFailures: 0,
    recentBlocked: 0,
    awaitingApproval: 2,
    lastActivityAt: '2026-09-05T09:00:00.000Z',
  },
  recentActions: [irreversibleSentAction],
};

const overviewResponse: AgentControlOverviewResponse = {
  version: 'agent-control-v1',
  tenantId: 'tenant-1',
  generatedAt: '2026-09-05T12:00:00.000Z',
  agents: [researchAgent, aiSdrAgent],
};

describe('ZexAgentsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading skeleton while fetching Platform agents', () => {
    zexFetch.mockReturnValue(new Promise(() => undefined));

    render(<ZexAgentsPage />);

    expect(screen.getByLabelText('Loading agents')).toBeTruthy();
  });

  it('loads live Platform agent overview data', async () => {
    zexFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => overviewResponse,
    });

    render(<ZexAgentsPage />);

    expect(await screen.findByText('Research Agent')).toBeTruthy();
    expect(screen.getByText('AI SDR')).toBeTruthy();
    expect(
      screen.getByText(
        'Monitor ZEX agents, approvals, permissions and recent actions.',
      ),
    ).toBeTruthy();
    expect(zexFetch).toHaveBeenCalledWith('/agents');
  });

  it('renders status badges, capabilities, and approval policy', async () => {
    zexFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => overviewResponse,
    });

    render(<ZexAgentsPage />);

    expect(await screen.findByText('Active')).toBeTruthy();
    expect(screen.getByText('Idle')).toBeTruthy();
    expect(
      screen.getByText('Research approved accounts — Allowed'),
    ).toBeTruthy();
    expect(screen.getByText('Mutate CRM — Not allowed')).toBeTruthy();
    expect(screen.getByText('Send outreach — Approval required')).toBeTruthy();
    expect(
      screen.getByText('Prospect must already be APPROVED/CREATED.'),
    ).toBeTruthy();
    expect(
      screen.getByText('No outbound send without explicit human approval.'),
    ).toBeTruthy();
  });

  it('shows recent action history with confidence and evidence expansion', async () => {
    zexFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => overviewResponse,
    });

    render(<ZexAgentsPage />);

    expect(await screen.findByText('agent_control_paused')).toBeTruthy();
    expect(screen.getByText('sdr_sent')).toBeTruthy();
    expect(screen.getByText('Confidence: not applicable')).toBeTruthy();
    expect(screen.getAllByText('Not reversible').length).toBeGreaterThan(0);

    await userEvent.click(
      screen.getAllByRole('button', { name: 'Show details' })[1],
    );

    expect(await screen.findByText('Exact approved draft sent')).toBeTruthy();
    expect(screen.getByText('Do not claim: pricing guarantee')).toBeTruthy();
  });

  it('shows Undo only when reversible=true and available', async () => {
    zexFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => overviewResponse,
    });

    render(<ZexAgentsPage />);

    expect(await screen.findByRole('button', { name: 'Undo' })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Undo' })).toHaveLength(1);
  });

  it('labels superseded/undone/not_reversible without offering Undo', async () => {
    const supersededAction: AgentAction = {
      ...reversiblePauseAction,
      id: 'action-superseded-1',
      auditLogId: 'action-superseded-1',
      undo: { status: 'superseded' },
    };
    const undoneAction: AgentAction = {
      ...reversiblePauseAction,
      id: 'action-undone-1',
      auditLogId: 'action-undone-1',
      actionType: 'agent_control_resumed',
      undo: {
        status: 'undone',
        undoneByActionId: 'undo-older',
        undoneAt: '2026-09-05T11:30:00.000Z',
      },
    };

    zexFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ...overviewResponse,
        agents: [
          {
            ...researchAgent,
            recentActions: [
              supersededAction,
              undoneAction,
              irreversibleSentAction,
            ],
          },
        ],
      }),
    });

    render(<ZexAgentsPage />);

    expect(
      await screen.findByText('Superseded by newer control action'),
    ).toBeTruthy();
    expect(screen.getByText('Already undone')).toBeTruthy();
    expect(screen.getByText('Not reversible')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
  });

  it('pauses with confirmation, pending protection, then refetches', async () => {
    let resolvePause: (value: {
      ok: boolean;
      json: () => Promise<unknown>;
    }) => void;

    zexFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => overviewResponse,
      })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolvePause = resolve;
          }),
      )
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...overviewResponse,
          agents: [
            {
              ...researchAgent,
              status: 'paused',
              controlState: 'PAUSED',
              health: {
                operational: false,
                detail: 'Paused — new agent work blocked',
              },
            },
            aiSdrAgent,
          ],
        }),
      });

    render(<ZexAgentsPage />);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Pause Research Agent' }),
    );

    expect(screen.getByText(/Pausing stops new agent work/)).toBeTruthy();

    const confirmButton = screen.getByRole('button', {
      name: 'Confirm pause Research Agent',
    });

    await userEvent.click(confirmButton);
    await userEvent.click(confirmButton);

    expect(
      zexFetch.mock.calls.filter(
        (call) =>
          call[0] === '/agents/research_agent/pause' &&
          call[1]?.method === 'POST',
      ),
    ).toHaveLength(1);

    resolvePause!({
      ok: true,
      json: async () => ({}),
    });

    expect(await screen.findByText('Paused')).toBeTruthy();
    expect(
      await screen.findByRole('button', { name: 'Resume Research Agent' }),
    ).toBeTruthy();
  });

  it('resumes paused agent and refetches', async () => {
    zexFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...overviewResponse,
          agents: [
            {
              ...researchAgent,
              status: 'paused',
              controlState: 'PAUSED',
              health: {
                operational: false,
                detail: 'Paused — new agent work blocked',
              },
            },
            aiSdrAgent,
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => overviewResponse,
      });

    render(<ZexAgentsPage />);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Resume Research Agent' }),
    );

    await waitFor(() => {
      expect(zexFetch).toHaveBeenCalledWith('/agents/research_agent/resume', {
        method: 'POST',
      });
    });
  });

  it('undos reversible action, refetches, and keeps history', async () => {
    zexFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => overviewResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...overviewResponse,
          agents: [
            {
              ...researchAgent,
              recentActions: [
                {
                  ...reversiblePauseAction,
                  undo: {
                    status: 'undone',
                    undoneByActionId: 'undo-1',
                    undoneAt: '2026-09-05T11:00:00.000Z',
                  },
                },
                {
                  id: 'undo-1',
                  agentId: 'research_agent',
                  actionType: 'agent_control_undo',
                  status: 'completed',
                  occurredAt: '2026-09-05T11:00:00.000Z',
                  updatedAt: '2026-09-05T11:00:00.000Z',
                  subject: {
                    resourceType: 'TenantAgentControl',
                    resourceId: 'ctrl-1',
                    summary: 'Undid pause',
                  },
                  evidenceSummary: [],
                  confidence: 'not_applicable',
                  permissionKey: 'agent_control',
                  approvalState: null,
                  triggeredBy: 'user@zex.test',
                  mutationSummary: {
                    before: { state: 'PAUSED' },
                    after: { state: 'ACTIVE', undoOf: 'action-pause-1' },
                    success: true,
                    message: 'Undone',
                  },
                  reversible: false,
                  undo: { status: 'not_reversible' },
                  auditLogId: 'undo-1',
                },
              ],
            },
            aiSdrAgent,
          ],
        }),
      });

    render(<ZexAgentsPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Undo' }));

    await waitFor(() => {
      expect(zexFetch).toHaveBeenCalledWith(
        '/agent-actions/action-pause-1/undo',
        {
          method: 'POST',
        },
      );
    });

    expect(await screen.findByText('agent_control_paused')).toBeTruthy();
    expect(await screen.findByText('agent_control_undo')).toBeTruthy();
    expect(screen.getByText('Already undone')).toBeTruthy();
  });

  it('shows empty recent history and no-current-work states', async () => {
    zexFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ...overviewResponse,
        agents: [
          {
            ...aiSdrAgent,
            recentActions: [],
          },
        ],
      }),
    });

    render(<ZexAgentsPage />);

    expect(await screen.findByText('No recent agent actions.')).toBeTruthy();
    expect(screen.getByText('No current work for this agent.')).toBeTruthy();
  });

  it('shows error with Retry when Platform bridge fails', async () => {
    zexFetch.mockRejectedValueOnce(new Error('Bridge unavailable'));

    render(<ZexAgentsPage />);

    expect(await screen.findByText('Agent control unavailable')).toBeTruthy();
    expect(screen.getByText('Bridge unavailable')).toBeTruthy();

    zexFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => overviewResponse,
    });

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('Research Agent')).toBeTruthy();
  });
});
