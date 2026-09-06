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
const {
  assertCleanWorkingTree,
  deriveImageTags,
  isForbiddenLatestTag,
} = require('../scripts/build-provenance.cjs');
const {
  PRODUCTION_CONFIRM_PHRASE,
  evaluateRestoreTarget,
  urlsEqual,
} = require('../scripts/restore-safety.cjs');
const { runSmoke } = require('../scripts/smoke-production.cjs');

const ROOT = path.resolve(__dirname, '../../..');
const COMPOSE_PATH = path.join(
  ROOT,
  'zex/deploy/docker-compose.production.yml',
);
const ENV_EXAMPLE_PATH = path.join(ROOT, 'zex/deploy/.env.production.example');
const BUILD_SH = path.join(ROOT, 'zex/deploy/scripts/build-zex-crm-image.sh');
const BUILD_PS1 = path.join(ROOT, 'zex/deploy/scripts/build-zex-crm-image.ps1');
const RESTORE_SH = path.join(ROOT, 'zex/deploy/scripts/restore-postgres.sh');

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

describe('ZEX-27 immutable image provenance', () => {
  it('allows a clean working tree', () => {
    assert.doesNotThrow(() => assertCleanWorkingTree(''));
    assert.doesNotThrow(() => assertCleanWorkingTree('\n'));
  });

  it('refuses a dirty working tree', () => {
    assert.throws(
      () => assertCleanWorkingTree(' M zex/deploy/README.md\n'),
      /refusing production image build: working tree is dirty/,
    );
  });

  it('derives full SHA tag from HEAD and rejects :latest', () => {
    const headSha = 'bbd9ea385a11d1d1a4ca4762376a51b2e8aa41b7';
    const tags = deriveImageTags({ headSha, repo: 'zex-crm' });
    assert.equal(tags.fullTag, `zex-crm:${headSha}`);
    assert.equal(tags.shortTag, 'zex-crm:bbd9ea385a11');
    assert.equal(tags.appVersion, `0.0.0+${headSha}`);
    assert.equal(isForbiddenLatestTag('zex-crm:latest'), true);
    assert.throws(
      () => deriveImageTags({ headSha: 'latest', repo: 'zex-crm' }),
      /HEAD SHA is required/,
    );
  });

  it('bash and PowerShell build scripts fail-closed via provenance gate', () => {
    const bash = fs.readFileSync(BUILD_SH, 'utf8');
    const powershell = fs.readFileSync(BUILD_PS1, 'utf8');
    assert.match(bash, /build-provenance\.cjs assert-clean/);
    assert.match(powershell, /build-provenance\.cjs assert-clean/);
    assert.doesNotMatch(bash, /warning: working tree is dirty/);
    assert.match(bash, /dirty|assert-clean|fail-closed|refusing/i);
  });

  it('compose keeps server and worker on the exact same image reference', () => {
    const composeText = fs.readFileSync(COMPOSE_PATH, 'utf8');
    const errors = validateCompose(composeText);
    assert.deepEqual(errors, []);
    const imageLines = composeText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith('image:'));
    assert.equal(imageLines[0], imageLines[1]);
  });
});

describe('ZEX-27 restore target safety', () => {
  const productionUrl =
    'postgres://postgres:secret@db:5432/default?sslmode=disable';
  const disposableUrl =
    'postgres://postgres:secret@db:5432/zex_crm_restore_tmp';

  it('allows disposable restore URL', () => {
    const decision = evaluateRestoreTarget({
      restoreUrl: disposableUrl,
      productionUrl,
    });
    assert.equal(decision.allowed, true);
    assert.equal(decision.isProductionTarget, false);
  });

  it('refuses restore target equal to production without explicit allow', () => {
    const decision = evaluateRestoreTarget({
      restoreUrl: productionUrl,
      productionUrl,
    });
    assert.equal(decision.allowed, false);
    assert.equal(decision.isProductionTarget, true);
    assert.match(decision.reason, /ALLOW_PRODUCTION_RESTORE/);
  });

  it('refuses allow flag without confirmation phrase', () => {
    const decision = evaluateRestoreTarget({
      restoreUrl: productionUrl,
      productionUrl,
      allowProductionRestore: true,
      confirmPhrase: 'wrong',
    });
    assert.equal(decision.allowed, false);
    assert.match(decision.reason, /CONFIRM_PHRASE/);
  });

  it('permits production restore only with allow flag + correct phrase', () => {
    const productionUrlWithTrailingPathSlash =
      'postgres://postgres:secret@db:5432/default/?sslmode=disable';
    const decision = evaluateRestoreTarget({
      restoreUrl: productionUrlWithTrailingPathSlash,
      productionUrl,
      allowProductionRestore: 'true',
      confirmPhrase: PRODUCTION_CONFIRM_PHRASE,
    });
    assert.equal(decision.allowed, true);
    assert.equal(decision.isProductionTarget, true);
    assert.equal(
      urlsEqual(productionUrl, productionUrlWithTrailingPathSlash),
      true,
    );
  });

  it('restore script uses ON_ERROR_STOP and URL gate (not name heuristics)', () => {
    const restoreScript = fs.readFileSync(RESTORE_SH, 'utf8');
    assert.match(restoreScript, /ON_ERROR_STOP=1/);
    assert.match(restoreScript, /restore-safety\.cjs/);
    assert.match(restoreScript, /RESTORE_DATABASE_URL/);
    assert.match(restoreScript, /PRODUCTION_DATABASE_URL/);
    assert.doesNotMatch(restoreScript, /\*prod\*/);
    assert.doesNotMatch(restoreScript, /FORCE=1/);
  });
});
