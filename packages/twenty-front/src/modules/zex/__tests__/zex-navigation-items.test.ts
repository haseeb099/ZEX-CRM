import { AppPath } from 'twenty-shared/types';

import { ZEX_APP_PATH } from '@/zex/constants/zex-app-path';
import { ZEX_NAVIGATION_ITEMS } from '@/zex/constants/zex-navigation-items';

describe('ZEX navigation shell', () => {
  it('exposes exactly Today, Prospects, Customers, Pipeline, Agents in order', () => {
    expect(ZEX_NAVIGATION_ITEMS.map((item) => item.label)).toEqual([
      'Today',
      'Prospects',
      'Customers',
      'Pipeline',
      'Agents',
    ]);
    expect(ZEX_NAVIGATION_ITEMS).toHaveLength(5);
  });

  it('maps navigation items to the expected route targets', () => {
    expect(ZEX_NAVIGATION_ITEMS.map((item) => item.path)).toEqual([
      ZEX_APP_PATH.Today,
      ZEX_APP_PATH.Prospects,
      ZEX_APP_PATH.Customers,
      ZEX_APP_PATH.Pipeline,
      ZEX_APP_PATH.Agents,
    ]);
  });

  it('keeps ZEX shell paths under the authenticated /zex prefix', () => {
    const zexOwnedPaths = [
      ZEX_APP_PATH.Today,
      ZEX_APP_PATH.Prospects,
      ZEX_APP_PATH.Customers,
      ZEX_APP_PATH.Pipeline,
      ZEX_APP_PATH.Agents,
    ];

    for (const path of zexOwnedPaths) {
      expect(path.startsWith('/zex/')).toBe(true);
      expect(path.includes('://')).toBe(false);
    }
  });

  it('registers AppPath ZEX entries for collision safety', () => {
    expect(AppPath.ZexCatchAll).toBe('/zex/*');
    expect(AppPath.ZexToday).toBe(ZEX_APP_PATH.Today);
    expect(AppPath.ZexProspects).toBe(ZEX_APP_PATH.Prospects);
    expect(AppPath.ZexCustomers).toBe(ZEX_APP_PATH.Customers);
    expect(AppPath.ZexPipeline).toBe(ZEX_APP_PATH.Pipeline);
    expect(AppPath.ZexAgents).toBe(ZEX_APP_PATH.Agents);
  });

  it('aliases Pipeline through /zex/pipeline then native Opportunities', () => {
    const pipelineItem = ZEX_NAVIGATION_ITEMS.find(
      (item) => item.id === 'pipeline',
    );

    expect(pipelineItem?.path).toBe(ZEX_APP_PATH.Pipeline);
    expect(pipelineItem?.label).toBe('Pipeline');
  });
});
