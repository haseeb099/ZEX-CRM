const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  assertProductionCommandsOnly,
  buildMigrationPlan,
  evaluateCommandResult,
  redactSecrets,
  runMigrationGate,
  PRODUCTION_COMMAND_SPECS,
} = require('../scripts/production-migration-gate.cjs');
const {
  runReadinessChecks,
  redactSecrets: redactReadiness,
} = require('../scripts/check-production-readiness.cjs');

describe('ZEX-27 production migration gate', () => {
  it('plans init + flush + upgrade + flush for empty DB', () => {
    const plan = buildMigrationPlan({ hasCoreSchema: false });
    assert.deepEqual(
      plan.map((step) => step.id),
      ['database:init:prod', 'cache:flush', 'upgrade', 'cache:flush:post'],
    );
  });

  it('skips init when core schema already exists', () => {
    const plan = buildMigrationPlan({ hasCoreSchema: true });
    assert.deepEqual(
      plan.map((step) => step.id),
      ['cache:flush', 'upgrade', 'cache:flush:post'],
    );
  });

  it('only uses production Twenty commands (no migrate:dev)', () => {
    const plan = buildMigrationPlan({ hasCoreSchema: false });
    assert.doesNotThrow(() => assertProductionCommandsOnly(plan));
    const joined = plan.map((step) => step.argv.join(' ')).join('\n');
    assert.doesNotMatch(joined, /migrate:dev/);
    assert.doesNotMatch(joined, /database:reset/);
    assert.match(joined, /database:init:prod/);
    assert.match(joined, /command:prod cache:flush/);
    assert.match(joined, /command:prod upgrade/);
  });

  it('rejects forbidden command specs', () => {
    assert.throws(
      () =>
        assertProductionCommandsOnly([
          { id: 'bad', argv: ['yarn', 'migrate:dev'] },
        ]),
      /refusing non-production/,
    );
  });

  it('success path exits logically ok', async () => {
    const report = await runMigrationGate({
      hasCoreSchema: true,
      timeoutMs: 1000,
      logger: { log() {}, error() {} },
      runCommand: async ({ step }) => {
        if (step.id.includes('cache:flush')) {
          return {
            exitCode: 0,
            timedOut: false,
            stdout: 'Cache flushed\n',
            stderr: '',
          };
        }
        return {
          exitCode: 0,
          timedOut: false,
          stdout:
            'Upgrade summary: 2 workspace(s) succeeded, 0 workspace(s) failed\n',
          stderr: '',
        };
      },
    });
    assert.equal(report.ok, true);
    assert.equal(report.results.length, 3);
  });

  it('command failure is non-zero / ok=false', async () => {
    const report = await runMigrationGate({
      hasCoreSchema: true,
      timeoutMs: 1000,
      logger: { log() {}, error() {} },
      runCommand: async () => ({
        exitCode: 1,
        timedOut: false,
        stdout: '',
        stderr: 'boom',
      }),
    });
    assert.equal(report.ok, false);
    assert.equal(report.results[0].ok, false);
    assert.match(report.results[0].reason, /command failed/);
  });

  it('command timeout is non-zero / ok=false', async () => {
    const report = await runMigrationGate({
      hasCoreSchema: true,
      timeoutMs: 50,
      logger: { log() {}, error() {} },
      runCommand: async () => ({
        exitCode: 124,
        timedOut: true,
        stdout: 'still booting nest...',
        stderr: '',
      }),
    });
    assert.equal(report.ok, false);
    assert.equal(report.results[0].timedOut, true);
    assert.match(report.results[0].reason, /timed out/);
  });

  it('requires Cache flushed success marker (fail-closed for swallowed errors)', () => {
    const evaluated = evaluateCommandResult({
      spec: PRODUCTION_COMMAND_SPECS.cacheFlush,
      result: {
        exitCode: 0,
        timedOut: false,
        stdout: 'Redis connection failed\n',
        stderr: '',
      },
    });
    assert.equal(evaluated.ok, false);
    assert.match(evaluated.reason, /missing success marker/);
  });

  it('redacts secrets from migration gate logs', () => {
    const raw =
      'url=postgres://u:super-secret-pass@db:5432/default key=super-secret-pass';
    const redacted = redactSecrets(raw, ['super-secret-pass']);
    assert.doesNotMatch(redacted, /super-secret-pass/);
    assert.match(redacted, /\[REDACTED\]/);
  });
});

describe('ZEX-27 production readiness gate', () => {
  const healthyDeps = {
    fetchImpl: async () => ({
      status: 200,
      text: async () => '{"status":"ok"}',
    }),
    execQuery: async () => '1',
    redisConnectImpl: async () => ({ ok: true, detail: 'redis PONG' }),
    spawnImpl: () => {
      const { EventEmitter } = require('node:events');
      const child = new EventEmitter();
      child.stdout = new EventEmitter();
      child.stderr = new EventEmitter();
      process.nextTick(() => {
        child.stdout.emit('data', Buffer.from('worker\nserver\n'));
        child.emit('close', 0);
      });
      return child;
    },
  };

  it('PASS when CRM + Postgres + Redis healthy', async () => {
    const report = await runReadinessChecks({
      baseUrl: 'http://crm.test',
      databaseUrl: 'postgres://u:p@db:5432/default',
      redisUrl: 'redis://redis:6379',
      skipWorkerCheck: true,
      skipImageCheck: true,
      deps: healthyDeps,
    });
    assert.equal(report.ok, true, JSON.stringify(report.checks));
    assert.ok(report.checks.find((check) => check.name === 'crm-liveness').ok);
    assert.ok(report.checks.find((check) => check.name === 'postgres').ok);
    assert.ok(report.checks.find((check) => check.name === 'redis').ok);
  });

  it('FAIL when DB unavailable', async () => {
    const report = await runReadinessChecks({
      baseUrl: 'http://crm.test',
      databaseUrl: 'postgres://u:p@db:5432/default',
      redisUrl: 'redis://redis:6379',
      skipWorkerCheck: true,
      skipImageCheck: true,
      deps: {
        ...healthyDeps,
        execQuery: async () => {
          throw new Error('connection refused');
        },
        tcpImpl: async () => ({ ok: false, detail: 'tcp down' }),
      },
    });
    assert.equal(report.ok, false);
    assert.equal(
      report.checks.find((check) => check.name === 'postgres').ok,
      false,
    );
  });

  it('FAIL when Redis unavailable', async () => {
    const report = await runReadinessChecks({
      baseUrl: 'http://crm.test',
      databaseUrl: 'postgres://u:p@db:5432/default',
      redisUrl: 'redis://redis:6379',
      skipWorkerCheck: true,
      skipImageCheck: true,
      deps: {
        ...healthyDeps,
        redisConnectImpl: async () => ({
          ok: false,
          detail: 'redis timeout',
        }),
      },
    });
    assert.equal(report.ok, false);
    assert.equal(
      report.checks.find((check) => check.name === 'redis').ok,
      false,
    );
  });

  it('FAIL when CRM unavailable', async () => {
    const report = await runReadinessChecks({
      baseUrl: 'http://crm.test',
      databaseUrl: 'postgres://u:p@db:5432/default',
      redisUrl: 'redis://redis:6379',
      skipWorkerCheck: true,
      skipImageCheck: true,
      deps: {
        ...healthyDeps,
        fetchImpl: async () => {
          throw new Error('ECONNREFUSED');
        },
      },
    });
    assert.equal(report.ok, false);
    assert.equal(
      report.checks.find((check) => check.name === 'crm-liveness').ok,
      false,
    );
  });

  it('redacts secrets in readiness helper', () => {
    const redacted = redactReadiness(
      'redis://:sekrit@redis:6379 postgres://u:sekrit@db/default',
      ['sekrit'],
    );
    assert.doesNotMatch(redacted, /sekrit/);
  });
});
