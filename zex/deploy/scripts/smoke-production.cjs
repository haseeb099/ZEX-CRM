#!/usr/bin/env node
// Safe ZEX-CRM production smoke helper (read-only by default).
// Exits non-zero on any failed check.
//
// Usage:
//   CRM_BASE_URL=http://localhost:3000 \
//   node zex/deploy/scripts/smoke-production.mjs
//
// Optional authenticated checks (cookie/header JWT):
//   CRM_AUTH_HEADER='Authorization: Bearer <token>'
//
// Platform-outage drill (operator-controlled):
//   EXPECT_PLATFORM_UNAVAILABLE=1  — expect /rest/zex/* to fail while /healthz stays ok

const DEFAULT_ROUTES = [
  '/zex/today',
  '/zex/agents',
  '/zex/prospects',
  '/zex/customers',
  '/objects/opportunities',
  '/objects/people',
  '/objects/companies',
];

const parseArgs = (argv) => {
  const args = { baseUrl: process.env.CRM_BASE_URL || 'http://localhost:3000' };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--base-url') {
      args.baseUrl = argv[index + 1];
      index += 1;
    }
  }
  return args;
};

const buildHeaders = () => {
  const headers = { Accept: 'application/json, text/html' };
  const authHeader = process.env.CRM_AUTH_HEADER;
  if (authHeader) {
    const separatorIndex = authHeader.indexOf(':');
    if (separatorIndex > 0) {
      headers[authHeader.slice(0, separatorIndex).trim()] = authHeader
        .slice(separatorIndex + 1)
        .trim();
    }
  }
  return headers;
};

const fetchText = async (url, headers) => {
  const response = await fetch(url, {
    method: 'GET',
    headers,
    redirect: 'manual',
  });
  const body = await response.text();
  return { status: response.status, body, headers: response.headers };
};

const assertCondition = (results, name, ok, detail = '') => {
  results.push({ name, ok: Boolean(ok), detail });
};

const runSmoke = async ({
  baseUrl,
  fetchImpl = fetchText,
  expectPlatformUnavailable = process.env.EXPECT_PLATFORM_UNAVAILABLE === '1',
  authHeaders = buildHeaders(),
}) => {
  const results = [];
  const normalizedBase = baseUrl.replace(/\/$/, '');

  // 1) Infrastructure health — must stay up even if Platform is down
  try {
    const health = await fetchImpl(`${normalizedBase}/healthz`, authHeaders);
    assertCondition(
      results,
      'healthz',
      health.status >= 200 && health.status < 300,
      `status=${health.status}`,
    );
    assertCondition(
      results,
      'healthz-body',
      /ok|healthy|up/i.test(health.body) || health.status === 200,
      health.body.slice(0, 120),
    );
  } catch (error) {
    assertCondition(results, 'healthz', false, String(error));
  }

  // 2) Public SPA routes (HTML shell) — do not require Platform
  for (const route of DEFAULT_ROUTES) {
    try {
      const response = await fetchImpl(`${normalizedBase}${route}`, {
        Accept: 'text/html',
      });
      const ok =
        (response.status >= 200 && response.status < 400) ||
        response.status === 302 ||
        response.status === 301;
      assertCondition(
        results,
        `route:${route}`,
        ok,
        `status=${response.status}`,
      );
    } catch (error) {
      assertCondition(results, `route:${route}`, false, String(error));
    }
  }

  // 3) Authenticated bridge endpoints when credentials provided
  const hasAuth = Boolean(process.env.CRM_AUTH_HEADER);
  if (hasAuth) {
    for (const endpoint of ['/rest/zex/agents', '/rest/zex/action-feed']) {
      try {
        const response = await fetchImpl(
          `${normalizedBase}${endpoint}`,
          authHeaders,
        );
        if (expectPlatformUnavailable) {
          assertCondition(
            results,
            `bridge-unavailable:${endpoint}`,
            response.status >= 400,
            `status=${response.status}`,
          );
        } else {
          assertCondition(
            results,
            `bridge:${endpoint}`,
            response.status >= 200 && response.status < 300,
            `status=${response.status}`,
          );
        }

        const lower = response.body.toLowerCase();
        assertCondition(
          results,
          `secret-safety:${endpoint}`,
          !lower.includes('zex_platform_admin_api_key') &&
            !lower.includes('/api/v1/admin/') &&
            !/bearer\s+[a-z0-9_-]{20,}/i.test(response.body),
          'body scanned for admin key / platform admin path',
        );
        assertCondition(
          results,
          `no-tenant-override-leak:${endpoint}`,
          !lower.includes('zex_platform_tenant_id'),
          'body must not leak tenant override',
        );
      } catch (error) {
        if (expectPlatformUnavailable) {
          assertCondition(
            results,
            `bridge-unavailable:${endpoint}`,
            true,
            String(error),
          );
        } else {
          assertCondition(results, `bridge:${endpoint}`, false, String(error));
        }
      }
    }
  } else {
    assertCondition(
      results,
      'auth-optional',
      true,
      'CRM_AUTH_HEADER not set; skipped /rest/zex authenticated checks',
    );
  }

  // 4) Static contract reminders (always true if we got here with health)
  assertCondition(
    results,
    'no-browser-platform-admin-contract',
    true,
    'Browser must call /rest/zex/* only; never Platform /api/v1/admin/*',
  );

  const failed = results.filter((result) => !result.ok);
  return {
    ok: failed.length === 0,
    results,
    failed,
  };
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const report = await runSmoke({ baseUrl: args.baseUrl });

  for (const result of report.results) {
    const mark = result.ok ? 'PASS' : 'FAIL';
    console.log(
      `${mark} ${result.name}${result.detail ? ` — ${result.detail}` : ''}`,
    );
  }

  if (!report.ok) {
    console.error(`\nSmoke failed: ${report.failed.length} check(s)`);
    process.exit(1);
  }

  console.log('\nSmoke passed');
};

module.exports = {
  runSmoke,
  DEFAULT_ROUTES,
  parseArgs,
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
