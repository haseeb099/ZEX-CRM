import {
  IconBuildingSkyscraper,
  IconLego,
  IconSun,
  IconTargetArrow,
  IconUsers,
  type IconComponent,
} from 'twenty-ui/icon';

import { ZEX_APP_PATH } from '@/zex/constants/zex-app-path';

export type ZexNavigationItemId =
  | 'today'
  | 'prospects'
  | 'customers'
  | 'pipeline'
  | 'agents';

export type ZexNavigationItem = {
  id: ZexNavigationItemId;
  label: string;
  path: string;
  Icon: IconComponent;
};

// Primary ZEX customer navigation — order is product-critical.
export const ZEX_NAVIGATION_ITEMS: ZexNavigationItem[] = [
  {
    id: 'today',
    label: 'Today',
    path: ZEX_APP_PATH.Today,
    Icon: IconSun,
  },
  {
    id: 'prospects',
    label: 'Prospects',
    path: ZEX_APP_PATH.Prospects,
    Icon: IconUsers,
  },
  {
    id: 'customers',
    label: 'Customers',
    path: ZEX_APP_PATH.Customers,
    Icon: IconBuildingSkyscraper,
  },
  {
    id: 'pipeline',
    label: 'Pipeline',
    // Own ZEX path redirects to Opportunities — avoids dual-active with native Opportunities nav.
    path: ZEX_APP_PATH.Pipeline,
    Icon: IconTargetArrow,
  },
  {
    id: 'agents',
    label: 'Agents',
    path: ZEX_APP_PATH.Agents,
    Icon: IconLego,
  },
];
