import { AppPath } from 'twenty-shared/types';
import { getAppPath } from 'twenty-shared/utils';
import { IconBuildingSkyscraper, IconUsers } from 'twenty-ui/icon';
import { UndecoratedLink } from 'twenty-ui/navigation';

import { SettingsCard } from '@/settings/components/SettingsCard';
import { ZexPlaceholderCard } from '@/zex/components/ZexPlaceholderCard';
import { ZexPlaceholderGrid } from '@/zex/components/ZexPlaceholderGrid';
import { ZexShellPage } from '@/zex/components/ZexShellPage';

export const ZexProspectsPage = () => {
  const peoplePath = getAppPath(AppPath.RecordIndexPage, {
    objectNamePlural: 'people',
  });
  const companiesPath = getAppPath(AppPath.RecordIndexPage, {
    objectNamePlural: 'companies',
  });

  return (
    <ZexShellPage
      title="Prospects"
      subtitle="Pre-opportunity accounts and people being researched or worked — opens native Twenty records."
      Icon={IconUsers}
    >
      <ZexPlaceholderCard
        title="Prospect discovery"
        description="Automated ICP discovery and enrichment will land here. For now, work prospects through People and Companies."
        statusText="Ready soon"
        statusColor="orange"
      />
      <ZexPlaceholderGrid>
        <UndecoratedLink to={peoplePath} fullWidth>
          <SettingsCard
            title="People"
            description="Open the native People list for prospect contacts."
            Icon={<IconUsers size={16} />}
          />
        </UndecoratedLink>
        <UndecoratedLink to={companiesPath} fullWidth>
          <SettingsCard
            title="Companies"
            description="Open the native Companies list for prospect accounts."
            Icon={<IconBuildingSkyscraper size={16} />}
          />
        </UndecoratedLink>
      </ZexPlaceholderGrid>
    </ZexShellPage>
  );
};
