import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ZexProspectsPage } from '@/zex/pages/ZexProspectsPage';

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
}));

jest.mock('@/zex/utils/zexRestClient', () => ({
  zexFetch: jest.fn(),
}));

const { zexFetch } = jest.requireMock('@/zex/utils/zexRestClient') as {
  zexFetch: jest.Mock;
};

const jsonResponse = (data: unknown, ok = true, status = 200) =>
  Promise.resolve({
    ok,
    status,
    json: async () => data,
  });

describe('ZexProspectsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows empty Company Brain setup when no brains exist', async () => {
    zexFetch.mockImplementation((path: string) => {
      if (path === '/company-brains') {
        return jsonResponse({ brains: [] });
      }

      return jsonResponse({}, false, 404);
    });

    render(<ZexProspectsPage />);

    expect(
      await screen.findByText(/No Company Brain yet/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Create Company Brain' }),
    ).toBeDisabled();
  });

  it('creates a company brain from the empty state', async () => {
    const user = userEvent.setup();
    let brains = [] as Array<{
      id: string;
      companyName: string;
      status: string;
    }>;

    zexFetch.mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/company-brains' && (!init || !init.method)) {
        return jsonResponse({ brains });
      }

      if (path === '/company-brains' && init?.method === 'POST') {
        brains = [
          { id: 'brain-1', companyName: 'Acme', status: 'draft' },
        ];

        return jsonResponse({ id: 'brain-1', companyName: 'Acme', status: 'draft' });
      }

      if (path === '/company-brains/brain-1') {
        return jsonResponse({
          id: 'brain-1',
          companyName: 'Acme',
          status: 'draft',
        });
      }

      return jsonResponse({}, false, 404);
    });

    render(<ZexProspectsPage />);

    await screen.findByText(/No Company Brain yet/i);

    await user.type(screen.getByPlaceholderText('Acme Inc'), 'Acme');
    await user.click(
      screen.getByRole('button', { name: 'Create Company Brain' }),
    );

    await waitFor(() => {
      expect(zexFetch).toHaveBeenCalledWith(
        '/company-brains',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    expect(await screen.findByText(/Using brain: Acme/i)).toBeInTheDocument();
  });

  it('surfaces brain list errors and allows retry', async () => {
    const user = userEvent.setup();

    zexFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ brains: [] }),
      });

    render(<ZexProspectsPage />);

    expect(
      await screen.findByText(/Company brains request failed/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(
      await screen.findByText(/No Company Brain yet/i),
    ).toBeInTheDocument();
  });

  it('requires explicit brain selection when multiple brains exist', async () => {
    zexFetch.mockImplementation((path: string) => {
      if (path === '/company-brains') {
        return jsonResponse({
          brains: [
            { id: 'brain-1', companyName: 'Acme', status: 'ready' },
            { id: 'brain-2', companyName: 'Beta', status: 'ready' },
          ],
        });
      }

      return jsonResponse({}, false, 404);
    });

    render(<ZexProspectsPage />);

    expect(
      await screen.findByText(/Select Company Brain/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveValue('');
    expect(zexFetch).not.toHaveBeenCalledWith(
      expect.stringMatching(/\/company-brains\/brain-/),
    );
  });

  it('runs discovery, polls, renders candidates, and supports approve/reject/create/research', async () => {
    const user = userEvent.setup();
    let candidate = {
      id: 'cand-1',
      companyName: 'Orbit Labs',
      domain: 'orbit.example',
      industry: 'SaaS',
      companySize: '51-200',
      geography: 'US',
      fitScore: 88,
      fitBand: 'STRONG',
      fitReasons: ['ICP industry match'],
      status: 'PROPOSED',
      dedupeStatus: 'NEW',
      buyerRoles: ['Economic Buyer'],
      evidence: ['Recent funding'],
    };

    zexFetch.mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/company-brains') {
        return jsonResponse({
          brains: [{ id: 'brain-1', companyName: 'Acme', status: 'ready' }],
        });
      }

      if (path === '/company-brains/brain-1') {
        return jsonResponse({
          id: 'brain-1',
          companyName: 'Acme',
          status: 'ready',
          payload: {
            icp: {
              industries: ['SaaS'],
              companySize: '51-200',
              geography: 'US',
              useCases: ['Outbound'],
              buyingTriggers: ['Hiring'],
              disqualifiers: ['Agency'],
            },
            personas: ['VP Sales'],
            qualificationRules: ['Must sell B2B'],
            messagingSummary: 'Help sales teams',
          },
        });
      }

      if (path === '/prospect-discovery' && init?.method === 'POST') {
        return jsonResponse({
          id: 'run-1',
          status: 'queued',
          companyBrainId: 'brain-1',
        });
      }

      if (path === '/prospect-discovery/run-1') {
        return jsonResponse({
          id: 'run-1',
          status: 'completed',
          candidates: [candidate],
        });
      }

      if (path === '/prospects/cand-1/why-now' && init?.method === 'POST') {
        return jsonResponse({
          overallScore: 91,
          fitScore: 88,
          intentScore: 70,
          timingScore: 80,
          confidence: 0.8,
          whyNow: 'Hiring surge in GTM',
          fitReasons: ['ICP match'],
          intentReasons: ['Job posts'],
          timingReasons: ['Funding'],
          signals: ['signal-1'],
        });
      }

      if (path === '/prospects/cand-1/why-now') {
        return jsonResponse({}, false, 404);
      }

      if (path === '/prospects/cand-1/approve') {
        candidate = { ...candidate, status: 'APPROVED' };

        return jsonResponse(candidate);
      }

      if (path === '/prospects/cand-1/create') {
        candidate = {
          ...candidate,
          status: 'CREATED',
          createdTwentyCompanyId: 'twenty-co-1',
        } as typeof candidate;

        return jsonResponse(candidate);
      }

      if (path === '/prospects/cand-1/research' && init?.method === 'POST') {
        return jsonResponse({
          status: 'COMPLETED',
          researchRunId: 'res-1',
          prospectCandidateId: 'cand-1',
        });
      }

      if (path === '/prospects/cand-1/research/latest') {
        return jsonResponse({
          status: 'COMPLETED',
          companySummary: 'Orbit is a GTM platform',
          whyRelevant: 'Matches ICP',
          whyNow: 'Hiring',
          keyFindings: ['Series B'],
          buyingCommitteeContext: ['Economic Buyer'],
          risksObjections: ['Budget'],
          outreachContext: ['Mention hiring'],
          doNotClaim: ['Closed lost history'],
          confidence: 0.75,
        });
      }

      return jsonResponse({}, false, 404);
    });

    render(<ZexProspectsPage />);

    expect(await screen.findByDisplayValue('SaaS')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Start Prospect Discovery' }),
    );

    expect(await screen.findByText(/Run id: run-1/i)).toBeInTheDocument();
    expect(await screen.findByText('Orbit Labs')).toBeInTheDocument();
    expect(screen.getByText(/Buyer roles \(abstract\): Economic Buyer/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Orbit Labs/i }));
    await user.click(screen.getByRole('button', { name: 'Score Why Now' }));

    expect(await screen.findByText(/Overall: 91/i)).toBeInTheDocument();
    expect(screen.getByText(/Hiring surge in GTM/i)).toBeInTheDocument();

    const approveButton = screen.getByRole('button', { name: 'Approve' });
    await user.click(approveButton);
    await user.click(approveButton);

    await waitFor(() => {
      const approveCalls = zexFetch.mock.calls.filter(
        ([path, init]) =>
          path === '/prospects/cand-1/approve' && init?.method === 'POST',
      );

      expect(approveCalls).toHaveLength(1);
    });

    expect(
      await screen.findByRole('button', { name: 'Create Company in Twenty' }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Create Company in Twenty' }),
    );

    expect(
      await screen.findByText(/Created Twenty company: twenty-co-1/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Start Research' }));

    expect(
      await screen.findByText(/Orbit is a GTM platform/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Outreach context \(guidance only\)/i),
    ).toBeInTheDocument();
  });

  it('disables unsupported actions for POSSIBLE_MATCH candidates', async () => {
    const user = userEvent.setup();

    zexFetch.mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/company-brains') {
        return jsonResponse({
          brains: [{ id: 'brain-1', companyName: 'Acme', status: 'ready' }],
        });
      }

      if (path === '/company-brains/brain-1') {
        return jsonResponse({
          id: 'brain-1',
          companyName: 'Acme',
          status: 'ready',
          payload: { icp: { industries: ['SaaS'] } },
        });
      }

      if (path === '/prospect-discovery' && init?.method === 'POST') {
        return jsonResponse({
          id: 'run-1',
          status: 'queued',
          companyBrainId: 'brain-1',
        });
      }

      if (path === '/prospect-discovery/run-1') {
        return jsonResponse({
          id: 'run-1',
          status: 'completed',
          candidates: [
            {
              id: 'cand-dup',
              companyName: 'Dup Co',
              status: 'PROPOSED',
              dedupeStatus: 'POSSIBLE_MATCH',
              existingTwentyCompanyId: 'existing-1',
            },
          ],
        });
      }

      return jsonResponse({}, false, 404);
    });

    render(<ZexProspectsPage />);

    await user.click(
      await screen.findByRole('button', { name: 'Start Prospect Discovery' }),
    );

    await user.click(await screen.findByRole('button', { name: /Dup Co/i }));

    expect(screen.getAllByText(/POSSIBLE_MATCH/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeDisabled();
    expect(
      screen.queryByRole('button', { name: 'Start Research' }),
    ).not.toBeInTheDocument();
  });

  it('rejects candidates without auto-creating a Twenty company', async () => {
    const user = userEvent.setup();
    let candidate = {
      id: 'cand-1',
      companyName: 'Reject Me',
      status: 'PROPOSED',
      dedupeStatus: 'NEW',
    };

    zexFetch.mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/company-brains') {
        return jsonResponse({
          brains: [{ id: 'brain-1', companyName: 'Acme', status: 'ready' }],
        });
      }

      if (path === '/company-brains/brain-1') {
        return jsonResponse({
          id: 'brain-1',
          companyName: 'Acme',
          status: 'ready',
          payload: { icp: {} },
        });
      }

      if (path === '/prospect-discovery' && init?.method === 'POST') {
        return jsonResponse({
          id: 'run-1',
          status: 'queued',
          companyBrainId: 'brain-1',
        });
      }

      if (path === '/prospect-discovery/run-1') {
        return jsonResponse({
          id: 'run-1',
          status: 'completed',
          candidates: [candidate],
        });
      }

      if (path === '/prospects/cand-1/reject') {
        candidate = { ...candidate, status: 'REJECTED' };

        return jsonResponse(candidate);
      }

      return jsonResponse({}, false, 404);
    });

    render(<ZexProspectsPage />);

    await user.click(
      await screen.findByRole('button', { name: 'Start Prospect Discovery' }),
    );
    await user.click(await screen.findByRole('button', { name: /Reject Me/i }));
    await user.click(screen.getByRole('button', { name: 'Reject' }));

    await waitFor(() => {
      expect(zexFetch).toHaveBeenCalledWith('/prospects/cand-1/reject', {
        method: 'POST',
      });
    });

    expect(
      zexFetch.mock.calls.some(([path]) => path === '/prospects/cand-1/create'),
    ).toBe(false);
  });

  it('saves ICP edits through PATCH without inventing merge logic', async () => {
    const user = userEvent.setup();

    zexFetch.mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/company-brains') {
        return jsonResponse({
          brains: [{ id: 'brain-1', companyName: 'Acme', status: 'ready' }],
        });
      }

      if (path === '/company-brains/brain-1' && init?.method === 'PATCH') {
        return jsonResponse({
          id: 'brain-1',
          companyName: 'Acme',
          status: 'ready',
          payload: {
            icp: {
              industries: ['Fintech'],
            },
            messagingSummary: 'Updated',
          },
        });
      }

      if (path === '/company-brains/brain-1') {
        return jsonResponse({
          id: 'brain-1',
          companyName: 'Acme',
          status: 'ready',
          payload: {
            icp: {
              industries: ['SaaS'],
            },
            messagingSummary: 'Original',
          },
        });
      }

      return jsonResponse({}, false, 404);
    });

    render(<ZexProspectsPage />);

    const industriesInput = await screen.findByDisplayValue('SaaS');

    await user.clear(industriesInput);
    await user.type(industriesInput, 'Fintech');
    await user.click(screen.getByRole('button', { name: 'Save ICP' }));

    await waitFor(() => {
      expect(zexFetch).toHaveBeenCalledWith(
        '/company-brains/brain-1',
        expect.objectContaining({ method: 'PATCH' }),
      );
    });

    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });

  it('shows discovery failure state', async () => {
    const user = userEvent.setup();

    zexFetch.mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/company-brains') {
        return jsonResponse({
          brains: [{ id: 'brain-1', companyName: 'Acme', status: 'ready' }],
        });
      }

      if (path === '/company-brains/brain-1') {
        return jsonResponse({
          id: 'brain-1',
          companyName: 'Acme',
          status: 'ready',
          payload: { icp: {} },
        });
      }

      if (path === '/prospect-discovery' && init?.method === 'POST') {
        return jsonResponse({
          id: 'run-fail',
          status: 'queued',
          companyBrainId: 'brain-1',
        });
      }

      if (path === '/prospect-discovery/run-fail') {
        return jsonResponse({
          id: 'run-fail',
          status: 'failed',
          lastError: 'Provider timeout',
        });
      }

      return jsonResponse({}, false, 404);
    });

    render(<ZexProspectsPage />);

    await user.click(
      await screen.findByRole('button', { name: 'Start Prospect Discovery' }),
    );

    expect(await screen.findByText(/Provider timeout/i)).toBeInTheDocument();
  });

  it('supports retry-create for FAILED candidates', async () => {
    const user = userEvent.setup();
    let candidate = {
      id: 'cand-1',
      companyName: 'Retry Co',
      status: 'FAILED',
      dedupeStatus: 'NEW',
      lastError: 'Create failed',
    };

    zexFetch.mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/company-brains') {
        return jsonResponse({
          brains: [{ id: 'brain-1', companyName: 'Acme', status: 'ready' }],
        });
      }

      if (path === '/company-brains/brain-1') {
        return jsonResponse({
          id: 'brain-1',
          companyName: 'Acme',
          status: 'ready',
          payload: { icp: {} },
        });
      }

      if (path === '/prospect-discovery' && init?.method === 'POST') {
        return jsonResponse({
          id: 'run-1',
          status: 'queued',
          companyBrainId: 'brain-1',
        });
      }

      if (path === '/prospect-discovery/run-1') {
        return jsonResponse({
          id: 'run-1',
          status: 'completed',
          candidates: [candidate],
        });
      }

      if (path === '/prospects/cand-1/retry-create') {
        candidate = {
          ...candidate,
          status: 'CREATED',
          createdTwentyCompanyId: 'co-retry',
        } as typeof candidate;

        return jsonResponse(candidate);
      }

      return jsonResponse({}, false, 404);
    });

    render(<ZexProspectsPage />);

    await user.click(
      await screen.findByRole('button', { name: 'Start Prospect Discovery' }),
    );
    await user.click(await screen.findByRole('button', { name: /Retry Co/i }));
    await user.click(screen.getByRole('button', { name: 'Retry create' }));

    expect(
      await screen.findByText(/Created Twenty company: co-retry/i),
    ).toBeInTheDocument();
  });
});
