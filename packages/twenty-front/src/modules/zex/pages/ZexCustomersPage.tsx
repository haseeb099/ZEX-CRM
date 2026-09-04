import { AppPath } from 'twenty-shared/types';
import { getAppPath } from 'twenty-shared/utils';
import { IconBuildingSkyscraper, IconUsers } from 'twenty-ui/icon';
import { UndecoratedLink } from 'twenty-ui/navigation';

import { SettingsCard } from '@/settings/components/SettingsCard';
import { ZexPlaceholderCard } from '@/zex/components/ZexPlaceholderCard';
import { ZexPlaceholderGrid } from '@/zex/components/ZexPlaceholderGrid';
import { ZexShellPage } from '@/zex/components/ZexShellPage';

export const ZexCustomersPage = () => {
  const companiesPath = getAppPath(AppPath.RecordIndexPage, {
    objectNamePlural: 'companies',
  });
  const peoplePath = getAppPath(AppPath.RecordIndexPage, {
    objectNamePlural: 'people',
  });

  return (
    <ZexShellPage
      title="Customers"
      subtitle="Existing customer relationships — reuse native Companies and People records, no duplicate CRM data."
      Icon={IconBuildingSkyscraper}
    >
      <ZexPlaceholderCard
        title="Customer Memory"
        description="Account context from ZEX-Platform will enrich this view later. Open Companies for the live relationship records today."
        statusText="Ready soon"
        statusColor="orange"
      />
      <ZexPlaceholderGrid>
        <UndecoratedLink to={companiesPath} fullWidth>
          <SettingsCard
            title="Companies"
            description="Open native Companies for customer accounts."
            Icon={<IconBuildingSkyscraper size={16} />}
          />
        </UndecoratedLink>
        <UndecoratedLink to={peoplePath} fullWidth>
          <SettingsCard
            title="People"
            description="Open native People for customer contacts."
            Icon={<IconUsers size={16} />}
          />
        </UndecoratedLink>
      </ZexPlaceholderGrid>
    </ZexShellPage>
  );
};
