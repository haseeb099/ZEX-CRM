import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ZexTodayPage } from '@/zex/pages/ZexTodayPage';
import {
  type ActionFeedItem,
  type ActionFeedResponse,
} from '@/zex/types/action-feed.types';

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

jest.mock('@/zex/components/ZexActionFeedLoading', () => ({
  ZexActionFeedLoading: () => <div data-testid="zex-feed-loading">Loading</div>,
}));

jest.mock('@/zex/components/ZexActionFeedEmpty', () => ({
  ZexActionFeedEmpty: () => <div>You&apos;re caught up</div>,
}));

jest.mock('@/zex/components/ZexActionFeedError', () => ({
  ZexActionFeedError: ({
    message,
    onRetry,
  }: {
    message?: string;
    onRetry: () => void;
  }) => (
    <div>
      <div>Action feed unavailable</div>
      <div>{message}</div>
      <button type="button" onClick={onRetry}>
        Retry
      </button>
    </div>
  ),
}));

jest.mock('@/zex/components/ZexTodaySummaryStrip', () => ({
  ZexTodaySummaryStrip: ({
    summary,
  }: {
    summary?: { needsApproval: number };
  }) => (summary ? <div>Needs approval: {summary.needsApproval}</div> : null),
}));

jest.mock('@/zex/components/ZexActionFeedCard', () => ({
  ZexActionFeedCard: ({
    item,
    onMutate,
    isAnyPending,
  }: {
    item: {
      id: string;
      title: string;
      action: { kind: string; entityId: string };
    };
    onMutate: (
      item: {
        id: string;
        title: string;
        action: { kind: string; entityId: string };
      },
      intent: 'approve' | 'reject' | 'confirm',
    ) => void;
    isAnyPending: boolean;
  }) => (
    <div>
      <span>{item.title}</span>
      {item.action.kind === 'approve_prospect' && (
        <button
          type="button"
          disabled={isAnyPending}
          onClick={() => onMutate(item, 'approve')}
        >
          Approve
        </button>
      )}
    </div>
  ),
}));

jest.mock('@/zex/utils/zexRestClient', () => ({
  zexFetch: jest.fn(),
}));

const { zexFetch } = jest.requireMock('@/zex/utils/zexRestClient') as {
  zexFetch: jest.Mock;
};

const sampleItem: ActionFeedItem = {
  id: 'item-1',
  type: 'prospect_approval',
  priority: 'medium',
  rankScore: 400,
  title: 'Approve Acme prospect',
  summary: 'Strong ICP fit from latest discovery run.',
  companyName: 'Acme Corp',
  whyNow: 'Recent funding signal',
  evidence: [{ label: 'Signal', text: 'Series B announced' }],
  action: {
    kind: 'approve_prospect',
    entityId: 'candidate-1',
    secondaryKind: 'reject_prospect',
  },
  status: 'pending',
  createdAt: '2026-09-04T12:00:00.000Z',
  updatedAt: '2026-09-04T12:00:00.000Z',
};

const feedResponse: ActionFeedResponse = {
  version: 'action-feed-v1',
  tenantId: 'tenant-1',
  generatedAt: '2026-09-04T12:00:00.000Z',
  summary: {
    needsApproval: 1,
    replies: 0,
    meetings: 0,
    blocked: 0,
    total: 1,
  },
  items: [sampleItem],
};

describe('ZexTodayPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading skeleton while fetching', () => {
    zexFetch.mockReturnValue(new Promise(() => undefined));

    render(<ZexTodayPage />);

    expect(screen.getByTestId('zex-feed-loading')).toBeTruthy();
  });

  it('shows empty state when feed has no items', async () => {
    zexFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ...feedResponse,
        items: [],
        summary: {
          needsApproval: 0,
          replies: 0,
          meetings: 0,
          blocked: 0,
          total: 0,
        },
      }),
    });

    render(<ZexTodayPage />);

    expect(await screen.findByText("You're caught up")).toBeTruthy();
  });

  it('renders feed items and summary strip', async () => {
    zexFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => feedResponse,
    });

    render(<ZexTodayPage />);

    expect(await screen.findByText('Approve Acme prospect')).toBeTruthy();
    expect(screen.getByText('Needs approval: 1')).toBeTruthy();
    expect(
      screen.getByText('Your highest-priority revenue actions'),
    ).toBeTruthy();
  });

  it('calls approve mutation and refetches feed', async () => {
    zexFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => feedResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...feedResponse,
          items: [],
          summary: {
            needsApproval: 0,
            replies: 0,
            meetings: 0,
            blocked: 0,
            total: 0,
          },
        }),
      });

    render(<ZexTodayPage />);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Approve' }),
    );

    await waitFor(() => {
      expect(zexFetch).toHaveBeenCalledWith(
        '/actions/prospects/candidate-1/approve',
        { method: 'POST' },
      );
    });

    expect(zexFetch).toHaveBeenCalledTimes(3);
  });

  it('shows error with retry', async () => {
    zexFetch.mockRejectedValueOnce(new Error('Network down'));

    render(<ZexTodayPage />);

    expect(await screen.findByText('Action feed unavailable')).toBeTruthy();
    expect(screen.getByText('Network down')).toBeTruthy();

    zexFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => feedResponse,
    });

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('Approve Acme prospect')).toBeTruthy();
  });

  it('prevents double submit while mutation is pending', async () => {
    let resolveApprove: (value: {
      ok: boolean;
      json: () => Promise<unknown>;
    }) => void;

    zexFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => feedResponse,
      })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveApprove = resolve;
          }),
      );

    render(<ZexTodayPage />);

    const approveButton = await screen.findByRole('button', {
      name: 'Approve',
    });

    await userEvent.click(approveButton);
    await userEvent.click(approveButton);

    expect(zexFetch).toHaveBeenCalledTimes(2);

    resolveApprove!({
      ok: true,
      json: async () => ({}),
    });

    await waitFor(() => {
      expect(zexFetch.mock.calls.length).toBeGreaterThanOrEqual(3);
    });
  });
});
