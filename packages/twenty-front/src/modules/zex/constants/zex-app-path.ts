// ZEX-owned front routes. Kept outside AppPath to minimize twenty-shared churn;
// AppPath also registers the catch-all for collision-safety and router typing.
export const ZEX_APP_PATH = {
  Root: '/zex',
  Today: '/zex/today',
  Prospects: '/zex/prospects',
  Customers: '/zex/customers',
  Pipeline: '/zex/pipeline',
  Agents: '/zex/agents',
} as const;

export type ZexAppPath = (typeof ZEX_APP_PATH)[keyof typeof ZEX_APP_PATH];
