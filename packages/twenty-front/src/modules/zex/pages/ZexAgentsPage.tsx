import {
  IconLego,
  IconMail,
  IconSearch,
  IconCalendarEvent,
} from 'twenty-ui/icon';

import { ZexPlaceholderCard } from '@/zex/components/ZexPlaceholderCard';
import { ZexPlaceholderGrid } from '@/zex/components/ZexPlaceholderGrid';
import { ZexShellPage } from '@/zex/components/ZexShellPage';

export const ZexAgentsPage = () => {
  return (
    <ZexShellPage
      title="Agents"
      subtitle="Agent status and control surface for ZEX autonomous revenue workflows. Agents are not active yet."
      Icon={IconLego}
    >
      <ZexPlaceholderGrid>
        <ZexPlaceholderCard
          title="Research Agent"
          description="Will research accounts and produce evidence-backed briefs. Not configured in this workspace yet."
          Icon={IconSearch}
          statusText="Not configured"
          statusColor="gray"
        />
        <ZexPlaceholderCard
          title="AI SDR"
          description="Will draft and request approval for outbound sequences. Sending is not enabled."
          Icon={IconMail}
          statusText="Ready soon"
          statusColor="orange"
        />
        <ZexPlaceholderCard
          title="Meeting / Deal Agent"
          description="Will summarize meetings and surface deal risks. Control Center wiring comes later."
          Icon={IconCalendarEvent}
          statusText="Ready soon"
          statusColor="orange"
        />
      </ZexPlaceholderGrid>
    </ZexShellPage>
  );
};
