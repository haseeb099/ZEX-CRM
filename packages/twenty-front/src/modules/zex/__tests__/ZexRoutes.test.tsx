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
  zexFetch: jest.fn().mockResolvedValue({
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

  it('renders Agents shell with not-configured states', () => {
    renderAt(ZEX_APP_PATH.Agents);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Agents' }),
    ).toBeTruthy();
    expect(screen.getByText('Research Agent')).toBeTruthy();
    expect(screen.getAllByText('Not configured').length).toBeGreaterThan(0);
  });

  it('defaults unknown /zex paths to Today', () => {
    renderAt('/zex/unknown');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Today' }),
    ).toBeTruthy();
  });
});
