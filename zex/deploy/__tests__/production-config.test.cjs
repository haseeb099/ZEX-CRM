const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  isForbiddenLatestImage,
  validateCompose,
  validateEnv,
  validateProductionConfig,
  parseEnvFile,
} = require('../scripts/validate-production-config.cjs');
const { runSmoke } = require('../scripts/smoke-production.cjs');

const ROOT = path.resolve(__dirname, '../../..');
const COMPOSE_PATH = path.join(
  ROOT,
  'zex/deploy/docker-compose.production.yml',
);
const ENV_EXAMPLE_PATH = path.join(ROOT, 'zex/deploy/.env.production.example');

describe('ZEX-27 production deploy validators', () => {
  it('rejects latest image references', () => {
    assert.equal(isForbiddenLatestImage('latest'), true);
    assert.equal(isForbiddenLatestImage('zex-crm:latest'), true);
    assert.equal(isForbiddenLatestImage('twentycrm/twenty:latest'), true);
    assert.equal(
      isForbiddenLatestImage(
        'ghcr.io/example/zex-crm:c831e89e939b378e901014f59674dccea53e9d97',
      ),
      false,
    );
  });

  it('requires identical server/worker image and ZEX bridge env in compose', () => {
    const composeText = fs.readFileSync(COMPOSE_PATH, 'utf8');
    const errors = validateCompose(composeText);
    assert.deepEqual(errors, []);
    assert.match(composeText, /ZEX_CRM_IMAGE:\?/);
    assert.doesNotMatch(composeText, /ZEX_PLATFORM_TENANT_ID\s*:/);
  });

  it('fails when server and worker images diverge', () => {
    const bad = `
services:
  server:
    image: zex-crm:aaa
  worker:
    image: zex-crm:bbb
`;
    const errors = validateCompose(bad);
    assert.ok(errors.some((error) => error.includes('identical')));
  });

  it('rejects tenant override and browser admin key env', () => {
    const env = parseEnvFile(`
ZEX_CRM_IMAGE=zex-crm:abc123
ZEX_PLATFORM_TENANT_ID=should-not-exist
VITE_ZEX_PLATFORM_ADMIN_API_KEY=leak
`);
    const errors = validateEnv(env);
    assert.ok(errors.some((error) => error.includes('ZEX_PLATFORM_TENANT_ID')));
    assert.ok(
      errors.some((error) => error.includes('VITE_ZEX_PLATFORM_ADMIN_API_KEY')),
    );
  });

  it('validates checked-in compose + example env', () => {
    const result = validateProductionConfig({
      composeText: fs.readFileSync(COMPOSE_PATH, 'utf8'),
      envText: fs.readFileSync(ENV_EXAMPLE_PATH, 'utf8'),
      envIsExample: true,
    });
    assert.equal(result.ok, true, result.errors.join('; '));
  });

  it('smoke helper fails when health cannot be reached', async () => {
    const report = await runSmoke({
      baseUrl: 'http://crm.test',
      fetchImpl: async () => {
        throw new Error('connection refused');
      },
    });
    assert.equal(report.ok, false);
    assert.ok(report.failed.some((item) => item.name === 'healthz'));
  });

  it('smoke helper passes health and routes with stubbed fetch', async () => {
    const report = await runSmoke({
      baseUrl: 'http://crm.test',
      fetchImpl: async (url) => {
        if (String(url).includes('/healthz')) {
          return { status: 200, body: '{"status":"ok"}', headers: {} };
        }
        return { status: 200, body: '<html>ok</html>', headers: {} };
      },
    });
    assert.equal(report.ok, true, JSON.stringify(report.failed));
  });

  it('smoke accepts platform-unavailable bridge errors when flagged', async () => {
    process.env.CRM_AUTH_HEADER = 'Authorization: Bearer test-token';
    try {
      const report = await runSmoke({
        baseUrl: 'http://crm.test',
        expectPlatformUnavailable: true,
        authHeaders: { Authorization: 'Bearer test-token' },
        fetchImpl: async (url) => {
          if (String(url).includes('/healthz')) {
            return { status: 200, body: '{"status":"ok"}', headers: {} };
          }
          if (String(url).includes('/rest/zex/')) {
            return {
              status: 502,
              body: '{"message":"platform unavailable"}',
              headers: {},
            };
          }
          return { status: 200, body: '<html>ok</html>', headers: {} };
        },
      });
      assert.equal(report.ok, true, JSON.stringify(report.failed));
    } finally {
      delete process.env.CRM_AUTH_HEADER;
    }
  });
});
