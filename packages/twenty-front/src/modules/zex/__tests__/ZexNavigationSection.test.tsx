import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { ZexNavigationSection } from '@/zex/components/ZexNavigationSection';
import { ZEX_NAVIGATION_LABELS } from '@/zex/constants/zex-navigation-items';

jest.mock(
  '@/ui/navigation/navigation-drawer/components/NavigationDrawerItem',
  () => ({
    NavigationDrawerItem: ({ label, to }: { label: string; to?: string }) => (
      <a href={to} data-testid={`nav-${label}`}>
        {label}
      </a>
    ),
  }),
);

jest.mock(
  '@/ui/navigation/navigation-drawer/components/NavigationDrawerSection',
  () => ({
    NavigationDrawerSection: ({ children }: { children: React.ReactNode }) => (
      <nav data-testid="zex-nav">{children}</nav>
    ),
  }),
);

jest.mock(
  '@/ui/navigation/navigation-drawer/components/NavigationDrawerSectionTitle',
  () => ({
    NavigationDrawerSectionTitle: ({ label }: { label: string }) => (
      <h2>{label}</h2>
    ),
  }),
);

describe('ZexNavigationSection', () => {
  it('renders ZEX section with the five primary items in order', () => {
    render(
      <MemoryRouter>
        <ZexNavigationSection />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'ZEX' })).toBeTruthy();

    const nav = screen.getByTestId('zex-nav');
    const labels = Array.from(nav.querySelectorAll('a')).map(
      (anchor) => anchor.textContent,
    );

    expect(labels).toEqual(ZEX_NAVIGATION_LABELS);
  });
});
