#!/usr/bin/env node
// Validates ZEX production compose + env contract without mutating files.
// Usage:
//   node zex/deploy/scripts/validate-production-config.mjs
//   node zex/deploy/scripts/validate-production-config.mjs --compose path --env path

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');

const parseArgs = (argv) => {
  const args = { compose: null, env: null };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--compose') {
      args.compose = argv[index + 1];
      index += 1;
    } else if (token === '--env') {
      args.env = argv[index + 1];
      index += 1;
    }
  }
  return args;
};

const stripQuotes = (value) => value.replace(/^['"]/, '').replace(/['"]$/, '');

const parseEnvFile = (contents) => {
  const env = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }
    const key = line.slice(0, separatorIndex).trim();
    const value = stripQuotes(line.slice(separatorIndex + 1).trim());
    env[key] = value;
  }
  return env;
};

const isForbiddenLatestImage = (imageReference) => {
  if (!imageReference) {
    return true;
  }
  const normalized = imageReference.trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  if (normalized === 'latest' || normalized.endsWith(':latest')) {
    return true;
  }
  if (normalized.includes('twentycrm/twenty:latest')) {
    return true;
  }
  return false;
};

const extractServiceImageLines = (composeText) => {
  const lines = composeText.split(/\r?\n/);
  const images = { server: null, worker: null };
  let currentService = null;
  for (const line of lines) {
    const serviceMatch = line.match(/^ {2}([a-zA-Z0-9_-]+):\s*$/);
    if (serviceMatch) {
      currentService = serviceMatch[1];
      continue;
    }
    const imageMatch = line.match(/^\s+image:\s*(.+)\s*$/);
    if (
      imageMatch &&
      (currentService === 'server' || currentService === 'worker')
    ) {
      images[currentService] = imageMatch[1].trim();
    }
  }
  return images;
};

const validateCompose = (composeText) => {
  const errors = [];
  const images = extractServiceImageLines(composeText);

  if (!images.server || !images.worker) {
    errors.push('compose must define image for both server and worker');
  } else if (images.server !== images.worker) {
    errors.push(
      `server and worker images must be identical (server=${images.server}, worker=${images.worker})`,
    );
  }

  if (!composeText.includes('ZEX_CRM_IMAGE')) {
    errors.push('compose must require ZEX_CRM_IMAGE');
  }
  if (!composeText.includes('${ZEX_CRM_IMAGE:?')) {
    errors.push(
      'ZEX_CRM_IMAGE must use required-variable syntax (?), no silent default',
    );
  }
  const imageLines = composeText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('image:'));
  if (
    imageLines.some(
      (line) =>
        /:latest\b/.test(line) ||
        /twentycrm\/twenty:\$\{TAG:-latest\}/.test(line) ||
        /\$\{TAG:-latest\}/.test(line),
    )
  ) {
    errors.push(
      'compose image lines must not use :latest or TAG:-latest defaults',
    );
  }
  if (!composeText.includes('ZEX_PLATFORM_BASE_URL')) {
    errors.push('compose must wire ZEX_PLATFORM_BASE_URL on server');
  }
  if (!composeText.includes('ZEX_PLATFORM_ADMIN_API_KEY')) {
    errors.push('compose must wire ZEX_PLATFORM_ADMIN_API_KEY on server');
  }
  if (/^\s*ZEX_PLATFORM_TENANT_ID\s*:/m.test(composeText)) {
    errors.push('compose must not set ZEX_PLATFORM_TENANT_ID');
  }
  const disableMigrationMatches = composeText.match(
    /DISABLE_DB_MIGRATIONS:\s*['"]true['"]/g,
  );
  if (!disableMigrationMatches || disableMigrationMatches.length < 2) {
    errors.push(
      'server and worker must both set DISABLE_DB_MIGRATIONS=true (migrations run via ZEX pre-deploy gate)',
    );
  }
  if (!/healthz/.test(composeText)) {
    errors.push(
      'server healthcheck must probe /healthz (liveness only; use ZEX readiness gate for DB/Redis)',
    );
  }

  // Browser secret leakage markers must not appear as frontend build args
  for (const forbidden of [
    'VITE_ZEX_PLATFORM_ADMIN_API_KEY',
    'REACT_APP_ZEX_PLATFORM_ADMIN_API_KEY',
    'NEXT_PUBLIC_ZEX_PLATFORM_ADMIN_API_KEY',
  ]) {
    if (composeText.includes(forbidden)) {
      errors.push(`compose must not expose ${forbidden} to browser builds`);
    }
  }

  return errors;
};

const validateEnv = (env) => {
  const errors = [];
  const required = [
    'ZEX_CRM_IMAGE',
    'SERVER_URL',
    'ENCRYPTION_KEY',
    'ZEX_PLATFORM_BASE_URL',
    'ZEX_PLATFORM_ADMIN_API_KEY',
  ];

  for (const key of required) {
    if (!env[key] || !String(env[key]).trim()) {
      // example file may leave blanks; treat blank required keys as contract ok for *.example
      // but reject latest / tenant override always when present
      continue;
    }
  }

  if (Object.prototype.hasOwnProperty.call(env, 'ZEX_PLATFORM_TENANT_ID')) {
    errors.push('env must not define ZEX_PLATFORM_TENANT_ID');
  }

  if (env.ZEX_CRM_IMAGE && isForbiddenLatestImage(env.ZEX_CRM_IMAGE)) {
    errors.push('ZEX_CRM_IMAGE must not be latest or empty');
  }

  for (const key of Object.keys(env)) {
    if (/^(VITE_|REACT_APP_|NEXT_PUBLIC_).*ADMIN_API_KEY/.test(key)) {
      errors.push(`env must not expose Platform admin key via ${key}`);
    }
  }

  return errors;
};

const validateProductionConfig = ({
  composeText,
  envText = '',
  envIsExample = false,
}) => {
  const errors = [...validateCompose(composeText)];
  if (envText) {
    const env = parseEnvFile(envText);
    errors.push(...validateEnv(env));
    if (!envIsExample) {
      for (const key of [
        'ZEX_CRM_IMAGE',
        'SERVER_URL',
        'ENCRYPTION_KEY',
        'ZEX_PLATFORM_BASE_URL',
        'ZEX_PLATFORM_ADMIN_API_KEY',
        'PG_DATABASE_PASSWORD',
        'PG_DATABASE_USER',
      ]) {
        if (!env[key] || !String(env[key]).trim()) {
          errors.push(`env missing required ${key}`);
        }
      }
      if (env.ZEX_CRM_IMAGE && isForbiddenLatestImage(env.ZEX_CRM_IMAGE)) {
        errors.push('ZEX_CRM_IMAGE rejects latest');
      }
    }
  }
  return {
    ok: errors.length === 0,
    errors,
  };
};

const main = () => {
  const args = parseArgs(process.argv.slice(2));
  const composePath =
    args.compose || path.join(ROOT, 'zex/deploy/docker-compose.production.yml');
  const envPath =
    args.env || path.join(ROOT, 'zex/deploy/.env.production.example');

  const composeText = fs.readFileSync(composePath, 'utf8');
  const envText = fs.existsSync(envPath)
    ? fs.readFileSync(envPath, 'utf8')
    : '';
  const envIsExample = path.basename(envPath).includes('.example');

  const result = validateProductionConfig({
    composeText,
    envText,
    envIsExample,
  });

  if (!result.ok) {
    console.error('ZEX production config validation failed:');
    for (const error of result.errors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }

  console.log('ZEX production config validation passed');
  console.log(`  compose: ${composePath}`);
  if (envPath) {
    console.log(`  env: ${envPath}${envIsExample ? ' (example)' : ''}`);
  }
};

module.exports = {
  isForbiddenLatestImage,
  validateCompose,
  validateEnv,
  validateProductionConfig,
  parseEnvFile,
  extractServiceImageLines,
};

if (require.main === module) {
  main();
}
