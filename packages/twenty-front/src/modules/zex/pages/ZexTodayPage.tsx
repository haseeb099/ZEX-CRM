import {
  IconBell,
  IconLego,
  IconListCheck,
  IconSun,
  IconTargetArrow,
} from 'twenty-ui/icon';

import { ZexPlaceholderCard } from '@/zex/components/ZexPlaceholderCard';
import { ZexPlaceholderGrid } from '@/zex/components/ZexPlaceholderGrid';
import { ZexShellPage } from '@/zex/components/ZexShellPage';

export const ZexTodayPage = () => {
  return (
    <ZexShellPage
      title="Today"
      subtitle="Your ZEX action home — what needs attention across pipeline, signals, and agents."
      Icon={IconSun}
    >
      <ZexPlaceholderGrid>
        <ZexPlaceholderCard
          title="Priority actions"
          description="Highest-impact next steps will appear here once Company Brain and Why-Now scoring are connected."
          Icon={IconListCheck}
          statusText="Ready soon"
          statusColor="orange"
        />
        <ZexPlaceholderCard
          title="New signals"
          description="Fresh intent and research signals will surface here. No live Platform feed yet."
          Icon={IconBell}
          statusText="Ready soon"
          statusColor="orange"
        />
        <ZexPlaceholderCard
          title="Agent activity"
          description="Recent Research, AI SDR, and Meeting / Deal agent activity will be summarized here."
          Icon={IconLego}
          statusText="Not configured"
          statusColor="gray"
        />
        <ZexPlaceholderCard
          title="Pipeline attention"
          description="Deals needing follow-up will be highlighted here from the native Opportunities pipeline."
          Icon={IconTargetArrow}
          statusText="Ready soon"
          statusColor="orange"
        />
      </ZexPlaceholderGrid>
    </ZexShellPage>
  );
};
