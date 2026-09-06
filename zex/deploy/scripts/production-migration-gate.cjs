#!/usr/bin/env node
// ZEX fail-closed production migration / upgrade gate (ZEX-27).
//
// Runs Twenty's existing production DB commands OUTSIDE normal server boot so
// promotion does not rely on packages/twenty-docker/twenty/entrypoint.sh
// (which treats cache:flush / upgrade failures as warnings and continues).
//
// Exact upstream commands invoked (in order):
//   1. yarn database:init:prod          — only when core schema is missing
//   2. yarn command:prod cache:flush    — required; fail/timeout = deploy fail
//   3. yarn command:prod upgrade        — required; fail/timeout = deploy fail
//   4. yarn command:prod cache:flush    — required post-upgrade
//
// Never invokes development migration commands (migrate:dev, database:reset, …).
//
// Usage (inside CRM image working directory, or via docker compose run):
//   node zex/deploy/scripts/production-migration-gate.cjs
//
// Env:
//   PG_DATABASE_URL / PG_DATABASE_*  — target CRM Postgres
//   REDIS_URL                        — required for cache:flush
//   ZEX_MIGRATION_GATE_TIMEOUT_MS    — per-command timeout (default 300000)
//   ZEX_MIGRATION_GATE_WORKDIR       — twenty-server cwd (default auto)
//   ZEX_MIGRATION_GATE_DRY_PLAN=1    — print plan only

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const DEFAULT_TIMEOUT_MS = 300_000;

const FORBIDDEN_COMMAND_PATTERNS = [
  /\bmigrate:dev\b/i,
  /\bdatabase:reset\b/i,
  /\bworkspace:seed:dev\b/i,
  /\bdatabase:migrate(?!:prod)\b/i,
  /\bnx\s+database:init(?!:prod)\b/i,
];

const PRODUCTION_COMMAND_SPECS = Object.freeze({
  init: {
    id: 'database:init:prod',
    argv: ['yarn', 'database:init:prod'],
    requiredSuccessPatterns: [],
  },
  cacheFlush: {
    id: 'cache:flush',
    // FlushCacheCommand catches Redis errors and may still exit 0 — require
    // the success log line so a silent failure cannot pass the gate.
    argv: ['yarn', 'command:prod', 'cache:flush'],
    requiredSuccessPatterns: [/Cache flushed/i],
  },
  upgrade: {
    id: 'upgrade',
    argv: ['yarn', 'command:prod', 'upgrade'],
    requiredSuccessPatterns: [
      /Upgrade summary:/i,
      /0 workspace\(s\) failed/i,
    ],
    forbiddenOutputPatterns: [
      /Upgrade completed with \d+ workspace failure/i,
      /Upgrade failed:/i,
    ],
  },
});

const redactSecrets = (text, secrets = []) => {
  let redacted = String(text ?? '');
  const candidates = [
    ...secrets,
    process.env.PG_DATABASE_PASSWORD,
    process.env.APP_SECRET,
    process.env.ENCRYPTION_KEY,
    process.env.ZEX_PLATFORM_ADMIN_API_KEY,
    process.env.REDIS_URL,
    process.env.PG_DATABASE_URL,
  ].filter(Boolean);

  for (const secret of candidates) {
    const value = String(secret);
    if (value.length < 4) {
      continue;
    }
    redacted = redacted.split(value).join('[REDACTED]');
  }

  // Scrub embedded credentials in URLs even if env vars differ slightly.
  redacted = redacted.replace(
    /(postgres(?:ql)?:\/\/[^:\s/]+):([^@/\s]+)@/gi,
    '$1:[REDACTED]@',
  );
  redacted = redacted.replace(
    /(redis(?:s)?:\/\/[^:\s/]+):([^@/\s]+)@/gi,
    '$1:[REDACTED]@',
  );

  return redacted;
};

const assertProductionCommandsOnly = (commandSpecs) => {
  for (const spec of commandSpecs) {
    const joined = spec.argv.join(' ');
    for (const pattern of FORBIDDEN_COMMAND_PATTERNS) {
      if (pattern.test(joined)) {
        throw new Error(
          `refusing non-production migration command: ${joined}`,
        );
      }
    }
  }
};

const buildMigrationPlan = ({ hasCoreSchema }) => {
  const steps = [];
  if (!hasCoreSchema) {
    steps.push({ ...PRODUCTION_COMMAND_SPECS.init });
  }
  steps.push({ ...PRODUCTION_COMMAND_SPECS.cacheFlush });
  steps.push({ ...PRODUCTION_COMMAND_SPECS.upgrade });
  steps.push({ ...PRODUCTION_COMMAND_SPECS.cacheFlush, id: 'cache:flush:post' });
  assertProductionCommandsOnly(steps);
  return steps;
};

const buildPgDatabaseUrlFromEnv = (env = process.env) => {
  if (env.PG_DATABASE_URL && String(env.PG_DATABASE_URL).trim()) {
    return String(env.PG_DATABASE_URL).trim();
  }
  const user = env.PG_DATABASE_USER;
  const password = env.PG_DATABASE_PASSWORD;
  const host = env.PG_DATABASE_HOST || 'localhost';
  const port = env.PG_DATABASE_PORT || '5432';
  const name = env.PG_DATABASE_NAME || 'default';
  if (!user || !password) {
    return '';
  }
  return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${name}`;
};

const detectHasCoreSchema = async ({
  databaseUrl,
  execQuery = defaultExecCoreSchemaQuery,
}) => {
  if (!databaseUrl) {
    throw new Error('PG_DATABASE_URL (or PG_DATABASE_* parts) is required');
  }
  const result = await execQuery(databaseUrl);
  const normalized = String(result).trim().toLowerCase();
  return normalized === 't' || normalized === 'true' || normalized === '1';
};

const defaultExecCoreSchemaQuery = (databaseUrl) =>
  new Promise((resolve, reject) => {
    const child = spawn(
      'psql',
      [
        '-tAc',
        "SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'core')",
        databaseUrl,
      ],
      { env: process.env, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', (error) => reject(error));
    child.on('close', (code) => {
      if (code !== 0) {
        reject(
          new Error(
            redactSecrets(
              `psql core-schema probe failed (exit ${code}): ${stderr || stdout}`,
            ),
          ),
        );
        return;
      }
      resolve(stdout);
    });
  });

const runCommandWithTimeout = ({
  argv,
  cwd,
  timeoutMs,
  env = process.env,
  spawnImpl = spawn,
}) =>
  new Promise((resolve) => {
    const child = spawnImpl(argv[0], argv.slice(1), {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    });

    let stdout = '';
    let stderr = '';
    let settled = false;
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill('SIGKILL');
      } catch {
        // ignore
      }
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve({
        exitCode: 1,
        timedOut: false,
        stdout,
        stderr: `${stderr}\n${error.message}`,
      });
    });
    child.on('close', (code) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve({
        exitCode: timedOut ? 124 : code ?? 1,
        timedOut,
        stdout,
        stderr,
      });
    });
  });

const evaluateCommandResult = ({
  spec,
  result,
  secrets = [],
}) => {
  const combined = `${result.stdout}\n${result.stderr}`;
  const safeCombined = redactSecrets(combined, secrets);

  if (result.timedOut) {
    return {
      ok: false,
      reason: `command timed out after limit: ${spec.id}`,
      output: safeCombined,
    };
  }

  if (result.exitCode !== 0) {
    return {
      ok: false,
      reason: `command failed (exit ${result.exitCode}): ${spec.id}`,
      output: safeCombined,
    };
  }

  for (const pattern of spec.forbiddenOutputPatterns || []) {
    if (pattern.test(combined)) {
      return {
        ok: false,
        reason: `command reported failure marker: ${spec.id}`,
        output: safeCombined,
      };
    }
  }

  for (const pattern of spec.requiredSuccessPatterns || []) {
    if (!pattern.test(combined)) {
      return {
        ok: false,
        reason: `missing success marker for ${spec.id}: ${pattern}`,
        output: safeCombined,
      };
    }
  }

  return { ok: true, reason: 'ok', output: safeCombined };
};

const runMigrationGate = async ({
  hasCoreSchema,
  runCommand,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  secrets = [],
  logger = console,
}) => {
  const plan = buildMigrationPlan({ hasCoreSchema });
  const results = [];

  for (const step of plan) {
    logger.log?.(
      redactSecrets(
        `[migration-gate] running ${step.id}: ${step.argv.join(' ')} (timeoutMs=${timeoutMs})`,
        secrets,
      ),
    );
    const raw = await runCommand({ argv: step.argv, timeoutMs, step });
    const evaluated = evaluateCommandResult({
      spec: step,
      result: raw,
      secrets,
    });
    results.push({ id: step.id, ...evaluated, timedOut: raw.timedOut });

    if (!evaluated.ok) {
      logger.error?.(
        redactSecrets(
          `[migration-gate] FAIL ${step.id}: ${evaluated.reason}`,
          secrets,
        ),
      );
      if (evaluated.output) {
        logger.error?.(evaluated.output.slice(-4000));
      }
      return { ok: false, plan, results };
    }

    logger.log?.(redactSecrets(`[migration-gate] PASS ${step.id}`, secrets));
  }

  return { ok: true, plan, results };
};

const resolveServerWorkdir = () => {
  if (process.env.ZEX_MIGRATION_GATE_WORKDIR) {
    return process.env.ZEX_MIGRATION_GATE_WORKDIR;
  }
  const candidates = [
    path.resolve(process.cwd(), 'packages/twenty-server'),
    '/app/packages/twenty-server',
    path.resolve(__dirname, '../../../packages/twenty-server'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'package.json'))) {
      return candidate;
    }
  }
  return path.resolve(process.cwd(), 'packages/twenty-server');
};

const parseArgs = (argv) => {
  const args = {
    dryPlan: process.env.ZEX_MIGRATION_GATE_DRY_PLAN === '1',
    timeoutMs: Number(
      process.env.ZEX_MIGRATION_GATE_TIMEOUT_MS || DEFAULT_TIMEOUT_MS,
    ),
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--dry-plan') {
      args.dryPlan = true;
    } else if (token === '--timeout-ms') {
      args.timeoutMs = Number(argv[index + 1]);
      index += 1;
    } else if (token === '--has-core-schema') {
      args.hasCoreSchema = argv[index + 1] === 'true';
      index += 1;
    }
  }
  if (!Number.isFinite(args.timeoutMs) || args.timeoutMs <= 0) {
    args.timeoutMs = DEFAULT_TIMEOUT_MS;
  }
  return args;
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const databaseUrl = buildPgDatabaseUrlFromEnv();
  const secrets = [
    databaseUrl,
    process.env.PG_DATABASE_PASSWORD,
    process.env.REDIS_URL,
    process.env.APP_SECRET,
    process.env.ENCRYPTION_KEY,
    process.env.ZEX_PLATFORM_ADMIN_API_KEY,
  ].filter(Boolean);

  if (!process.env.REDIS_URL || !String(process.env.REDIS_URL).trim()) {
    console.error('[migration-gate] REDIS_URL is required for cache:flush');
    process.exit(1);
  }

  let hasCoreSchema = args.hasCoreSchema;
  if (typeof hasCoreSchema !== 'boolean') {
    hasCoreSchema = await detectHasCoreSchema({ databaseUrl });
  }

  const plan = buildMigrationPlan({ hasCoreSchema });
  console.log(
    `[migration-gate] hasCoreSchema=${hasCoreSchema} steps=${plan
      .map((step) => step.id)
      .join(',')}`,
  );

  if (args.dryPlan) {
    for (const step of plan) {
      console.log(`  - ${step.argv.join(' ')}`);
    }
    process.exit(0);
  }

  const cwd = resolveServerWorkdir();
  const report = await runMigrationGate({
    hasCoreSchema,
    timeoutMs: args.timeoutMs,
    secrets,
    runCommand: ({ argv, timeoutMs }) =>
      runCommandWithTimeout({ argv, cwd, timeoutMs, env: process.env }),
  });

  if (!report.ok) {
    console.error('[migration-gate] promotion blocked — migration incomplete');
    process.exit(1);
  }

  console.log('[migration-gate] PASS — migration/upgrade gate complete');
  process.exit(0);
};

module.exports = {
  DEFAULT_TIMEOUT_MS,
  FORBIDDEN_COMMAND_PATTERNS,
  PRODUCTION_COMMAND_SPECS,
  assertProductionCommandsOnly,
  buildMigrationPlan,
  buildPgDatabaseUrlFromEnv,
  detectHasCoreSchema,
  evaluateCommandResult,
  redactSecrets,
  runCommandWithTimeout,
  runMigrationGate,
};

if (require.main === module) {
  main().catch((error) => {
    console.error(
      '[migration-gate]',
      redactSecrets(error instanceof Error ? error.message : String(error)),
    );
    process.exit(1);
  });
}
