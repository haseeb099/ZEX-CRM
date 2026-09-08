#!/usr/bin/env node
// ZEX production readiness gate (ZEX-27).
//
// /healthz is CRM process liveness only (Nest Terminus health.check([])).
// This script is the production promotion readiness check and must FAIL when
// Postgres or Redis are unavailable even if /healthz returns 200.
//
// Usage:
//   CRM_BASE_URL=https://crm.example.com \
//   PG_DATABASE_URL=postgres://... \
//   REDIS_URL=redis://... \
//   node zex/deploy/scripts/check-production-readiness.cjs
//
// Optional:
//   EXPECTED_IMAGE=zex-crm:<sha>
//   DOCKER_COMPOSE_FILE=zex/deploy/docker-compose.production.yml
//   DOCKER_COMPOSE_PROJECT=zex-crm
//   SKIP_WORKER_CHECK=1
//   SKIP_IMAGE_CHECK=1

const net = require('node:net');
const { spawn } = require('node:child_process');
const { URL } = require('node:url');

const DEFAULT_TIMEOUT_MS = 8_000;

const redactSecrets = (text, secrets = []) => {
  let redacted = String(text ?? '');
  for (const secret of secrets.filter(Boolean)) {
    const value = String(secret);
    if (value.length >= 4) {
      redacted = redacted.split(value).join('[REDACTED]');
    }
  }
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

const parseRedisUrl = (redisUrl) => {
  const parsed = new URL(redisUrl);
  return {
    host: parsed.hostname || 'localhost',
    port: Number(parsed.port || 6379),
    password: parsed.password
      ? decodeURIComponent(parsed.password)
      : undefined,
  };
};

const parsePostgresUrl = (databaseUrl) => {
  const parsed = new URL(databaseUrl);
  return {
    host: parsed.hostname || 'localhost',
    port: Number(parsed.port || 5432),
    user: decodeURIComponent(parsed.username || ''),
    password: decodeURIComponent(parsed.password || ''),
    database: (parsed.pathname || '/default').replace(/^\//, '') || 'default',
  };
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
  if (!user || password === undefined || password === null || password === '') {
    return '';
  }
  return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${name}`;
};

const tcpConnect = ({ host, port, timeoutMs = DEFAULT_TIMEOUT_MS }) =>
  new Promise((resolve) => {
    const socket = net.connect({ host, port });
    let settled = false;
    const finish = (ok, detail) => {
      if (settled) {
        return;
      }
      settled = true;
      try {
        socket.destroy();
      } catch {
        // ignore
      }
      resolve({ ok, detail });
    };
    socket.setTimeout(timeoutMs);
    socket.on('connect', () => finish(true, `tcp ${host}:${port} open`));
    socket.on('timeout', () => finish(false, `tcp ${host}:${port} timeout`));
    socket.on('error', (error) =>
      finish(false, `tcp ${host}:${port} ${error.message}`),
    );
  });

const checkRedis = async ({
  redisUrl,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  connectImpl = null,
}) => {
  if (!redisUrl) {
    return { ok: false, detail: 'REDIS_URL missing' };
  }
  const { host, port, password } = parseRedisUrl(redisUrl);

  if (connectImpl) {
    return connectImpl({ host, port, password, timeoutMs });
  }

  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    let settled = false;
    let buffer = '';

    const finish = (ok, detail) => {
      if (settled) {
        return;
      }
      settled = true;
      try {
        socket.destroy();
      } catch {
        // ignore
      }
      resolve({ ok, detail });
    };

    socket.setTimeout(timeoutMs);
    socket.on('connect', () => {
      if (password) {
        socket.write(`AUTH ${password}\r\n`);
      }
      socket.write('PING\r\n');
    });
    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      if (/^\+PONG/m.test(buffer) || /\+OK[\s\S]*\+PONG/m.test(buffer)) {
        finish(true, `redis PONG from ${host}:${port}`);
        return;
      }
      if (/^-ERR/m.test(buffer)) {
        finish(false, `redis error from ${host}:${port}: ${buffer.trim()}`);
      }
    });
    socket.on('timeout', () => finish(false, `redis timeout ${host}:${port}`));
    socket.on('error', (error) =>
      finish(false, `redis ${host}:${port} ${error.message}`),
    );
  });
};

const checkPostgres = async ({
  databaseUrl,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  execQuery = defaultPostgresSelectOne,
  tcpImpl = tcpConnect,
}) => {
  if (!databaseUrl) {
    return { ok: false, detail: 'PG_DATABASE_URL missing' };
  }

  try {
    const result = await execQuery(databaseUrl, timeoutMs);
    if (String(result).trim() === '1') {
      return { ok: true, detail: 'postgres SELECT 1 ok' };
    }
    return {
      ok: false,
      detail: `unexpected postgres probe result: ${String(result).trim()}`,
    };
  } catch (error) {
    // Fall back to TCP so environments without psql still fail closed on down DB.
    const { host, port } = parsePostgresUrl(databaseUrl);
    const tcp = await tcpImpl({ host, port, timeoutMs });
    if (!tcp.ok) {
      return {
        ok: false,
        detail: `postgres unavailable: ${error.message}; ${tcp.detail}`,
      };
    }
    return {
      ok: false,
      detail: `postgres TCP open but query failed: ${error.message}`,
    };
  }
};

const defaultPostgresSelectOne = (databaseUrl, timeoutMs) =>
  new Promise((resolve, reject) => {
    const child = spawn('psql', ['-tAc', 'SELECT 1', databaseUrl], {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      try {
        child.kill('SIGKILL');
      } catch {
        // ignore
      }
      reject(new Error('psql probe timed out'));
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(stderr || stdout || `psql exit ${code}`));
        return;
      }
      resolve(stdout);
    });
  });

const checkCrmLiveness = async ({
  baseUrl,
  fetchImpl = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) => {
  if (!baseUrl) {
    return { ok: false, detail: 'CRM_BASE_URL missing' };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(
      `${baseUrl.replace(/\/$/, '')}/healthz`,
      { method: 'GET', signal: controller.signal },
    );
    const body = await response.text();
    const ok = response.status >= 200 && response.status < 300;
    return {
      ok,
      detail: `liveness /healthz status=${response.status} body=${body.slice(0, 120)}`,
    };
  } catch (error) {
    return { ok: false, detail: `CRM liveness failed: ${error.message}` };
  } finally {
    clearTimeout(timer);
  }
};

const buildComposeArgs = ({ composeFile, envFile, projectName }) => {
  const args = ['compose', '-f', composeFile];
  if (envFile) {
    args.push('--env-file', envFile);
  }
  if (projectName) {
    args.push('-p', projectName);
  }
  return args;
};

const checkWorkerRunning = async ({
  composeFile,
  envFile,
  projectName,
  skip = false,
  spawnImpl = spawn,
}) => {
  if (skip) {
    return { ok: true, detail: 'worker check skipped' };
  }
  if (!composeFile) {
    return {
      ok: false,
      detail:
        'worker check requires DOCKER_COMPOSE_FILE (or set SKIP_WORKER_CHECK=1)',
    };
  }

  const args = buildComposeArgs({ composeFile, envFile, projectName });
  args.push('ps', '--status', 'running', '--services');

  return new Promise((resolve) => {
    const child = spawnImpl('docker', args, {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', (error) =>
      resolve({ ok: false, detail: `docker compose ps failed: ${error.message}` }),
    );
    child.on('close', (code) => {
      if (code !== 0) {
        resolve({
          ok: false,
          detail: `docker compose ps exit ${code}: ${stderr || stdout}`,
        });
        return;
      }
      const services = stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      const ok = services.includes('worker');
      resolve({
        ok,
        detail: ok
          ? 'worker service is running'
          : `worker not running (running=${services.join(',') || 'none'})`,
      });
    });
  });
};

const checkExpectedImage = async ({
  expectedImage,
  composeFile,
  envFile,
  projectName,
  skip = false,
  spawnImpl = spawn,
}) => {
  if (skip || !expectedImage) {
    return { ok: true, detail: 'image check skipped' };
  }
  if (!composeFile) {
    return {
      ok: false,
      detail: 'image check requires DOCKER_COMPOSE_FILE',
    };
  }

  const args = buildComposeArgs({ composeFile, envFile, projectName });
  args.push('ps', '--format', 'json', 'server');

  return new Promise((resolve) => {
    const child = spawnImpl('docker', args, {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', (error) =>
      resolve({ ok: false, detail: `image inspect failed: ${error.message}` }),
    );
    child.on('close', (code) => {
      if (code !== 0) {
        resolve({
          ok: false,
          detail: `image inspect exit ${code}: ${stderr || stdout}`,
        });
        return;
      }
      try {
        const lines = stdout
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean);
        const parsed = lines.map((line) => JSON.parse(line));
        const imageField = parsed
          .map((row) => row.Image || row.ImageName || '')
          .join(' ');
        const ok = imageField.includes(expectedImage);
        resolve({
          ok,
          detail: ok
            ? `server image matches ${expectedImage}`
            : `server image mismatch: expected ${expectedImage}, saw ${imageField || 'unknown'}`,
        });
      } catch (error) {
        resolve({
          ok: false,
          detail: `unable to parse compose ps json: ${error.message}`,
        });
      }
    });
  });
};

const runReadinessChecks = async (options = {}) => {
  const {
    baseUrl = process.env.CRM_BASE_URL || process.env.SERVER_URL || '',
    databaseUrl = buildPgDatabaseUrlFromEnv(options.env || process.env),
    redisUrl = process.env.REDIS_URL || '',
    expectedImage = process.env.EXPECTED_IMAGE || process.env.ZEX_CRM_IMAGE || '',
    composeFile =
      process.env.DOCKER_COMPOSE_FILE ||
      'zex/deploy/docker-compose.production.yml',
    envFile = process.env.DOCKER_COMPOSE_ENV_FILE || '',
    projectName = process.env.DOCKER_COMPOSE_PROJECT || '',
    skipWorkerCheck = process.env.SKIP_WORKER_CHECK === '1',
    skipImageCheck = process.env.SKIP_IMAGE_CHECK === '1',
    timeoutMs = Number(process.env.ZEX_READINESS_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
    deps = {},
  } = options;

  const checks = [];

  checks.push({
    name: 'crm-liveness',
    ...(await checkCrmLiveness({
      baseUrl,
      timeoutMs,
      fetchImpl: deps.fetchImpl,
    })),
  });
  checks.push({
    name: 'postgres',
    ...(await checkPostgres({
      databaseUrl,
      timeoutMs,
      execQuery: deps.execQuery,
      tcpImpl: deps.tcpImpl,
    })),
  });
  checks.push({
    name: 'redis',
    ...(await checkRedis({
      redisUrl,
      timeoutMs,
      connectImpl: deps.redisConnectImpl,
    })),
  });
  checks.push({
    name: 'worker',
    ...(await checkWorkerRunning({
      composeFile,
      envFile,
      projectName,
      skip: skipWorkerCheck,
      spawnImpl: deps.spawnImpl,
    })),
  });
  checks.push({
    name: 'image',
    ...(await checkExpectedImage({
      expectedImage,
      composeFile,
      envFile,
      projectName,
      skip: skipImageCheck || !expectedImage,
      spawnImpl: deps.spawnImpl,
    })),
  });

  const ok = checks.every((check) => check.ok);
  return { ok, checks };
};

const main = async () => {
  const secrets = [
    process.env.PG_DATABASE_URL,
    process.env.PG_DATABASE_PASSWORD,
    process.env.REDIS_URL,
    process.env.APP_SECRET,
    process.env.ENCRYPTION_KEY,
    process.env.ZEX_PLATFORM_ADMIN_API_KEY,
  ];
  const report = await runReadinessChecks();
  for (const check of report.checks) {
    const line = `${check.ok ? 'PASS' : 'FAIL'} ${check.name}: ${check.detail}`;
    console.log(redactSecrets(line, secrets));
  }
  if (!report.ok) {
    console.error('[readiness] FAIL — production promotion blocked');
    process.exit(1);
  }
  console.log('[readiness] PASS — CRM liveness + Postgres + Redis (+ worker/image)');
  process.exit(0);
};

module.exports = {
  buildPgDatabaseUrlFromEnv,
  checkCrmLiveness,
  checkExpectedImage,
  checkPostgres,
  checkRedis,
  checkWorkerRunning,
  parsePostgresUrl,
  parseRedisUrl,
  redactSecrets,
  runReadinessChecks,
  tcpConnect,
};

if (require.main === module) {
  main().catch((error) => {
    console.error(
      '[readiness]',
      redactSecrets(error instanceof Error ? error.message : String(error)),
    );
    process.exit(1);
  });
}
