import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { ZexRoutes } from '@/zex/components/ZexRoutes';
import { ZEX_APP_PATH } from '@/zex/constants/zex-app-path';

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

jest.mock('@/settings/components/SettingsCard', () => ({
  SettingsCard: ({ title }: { title: string }) => <div>{title}</div>,
}));

jest.mock('@/zex/utils/zexRestClient', () => ({
  zexFetch: jest.fn().mockImplementation(async (path: string) => {
    if (path === '/agents') {
      return {
        ok: true,
        json: async () => ({
          version: 'agent-control-v1',
          tenantId: 'tenant-1',
          generatedAt: '2026-09-05T12:00:00.000Z',
          agents: [
            {
              id: 'research_agent',
              name: 'Research Agent',
              description: 'Source-backed research.',
              status: 'idle',
              controlState: 'ACTIVE',
              health: { operational: true, detail: 'Idle' },
              permissions: [],
              approvalPolicy: {
                summary: 'Prospect approved first',
                requiresHumanApproval: [],
                neverAutonomous: [],
              },
              metrics: {
                currentWork: 0,
                recentFailures: 0,
                recentBlocked: 0,
                awaitingApproval: 0,
                lastActivityAt: null,
              },
              recentActions: [],
            },
            {
              id: 'ai_sdr',
              name: 'AI SDR',
              description: 'Approval-first outreach.',
              status: 'idle',
              controlState: 'ACTIVE',
              health: { operational: true, detail: 'Idle' },
              permissions: [],
              approvalPolicy: {
                summary: 'No auto-send',
                requiresHumanApproval: [],
                neverAutonomous: [],
              },
              metrics: {
                currentWork: 0,
                recentFailures: 0,
                recentBlocked: 0,
                awaitingApproval: 0,
                lastActivityAt: null,
              },
              recentActions: [],
            },
          ],
        }),
      };
    }

    return {
      ok: true,
      json: async () => ({
        version: 'action-feed-v1',
        tenantId: 'tenant-1',
        generatedAt: '2026-09-04T12:00:00.000Z',
        summary: {
          needsApproval: 0,
          replies: 0,
          meetings: 0,
          blocked: 0,
          total: 0,
        },
        items: [],
      }),
    };
  }),
}));

jest.mock('react-loading-skeleton', () => ({
  __esModule: true,
  default: () => null,
  SkeletonTheme: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

jest.mock('twenty-ui/input', () => ({
  Button: ({ title, onClick }: { title?: string; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      {title}
    </button>
  ),
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

const renderAt = (path: string) => {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/zex/*" element={<ZexRoutes />} />
        <Route
          path="/objects/opportunities"
          element={<div>Native Opportunities</div>}
        />
      </Routes>
    </MemoryRouter>,
  );
};

describe('ZexRoutes', () => {
  it('renders Today shell', async () => {
    renderAt(ZEX_APP_PATH.Today);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Today' }),
    ).toBeTruthy();
    expect(
      await screen.findByText('Your highest-priority revenue actions'),
    ).toBeTruthy();
  });

  it('renders Prospects shell', () => {
    renderAt(ZEX_APP_PATH.Prospects);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Prospects' }),
    ).toBeTruthy();
  });

  it('renders Customers shell', () => {
    renderAt(ZEX_APP_PATH.Customers);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Customers' }),
    ).toBeTruthy();
  });

  it('redirects Pipeline to native Opportunities', () => {
    renderAt(ZEX_APP_PATH.Pipeline);
    expect(screen.getByText('Native Opportunities')).toBeTruthy();
  });

  it('renders Agents control center from Platform overview', async () => {
    renderAt(ZEX_APP_PATH.Agents);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Agents' }),
    ).toBeTruthy();
    expect(await screen.findByText('Research Agent')).toBeTruthy();
    expect(screen.getByText('AI SDR')).toBeTruthy();
    expect(
      screen.getByText(
        'Monitor ZEX agents, approvals, permissions and recent actions.',
      ),
    ).toBeTruthy();
  });

  it('defaults unknown /zex paths to Today', () => {
    renderAt('/zex/unknown');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Today' }),
    ).toBeTruthy();
  });
});
