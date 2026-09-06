#!/usr/bin/env node
// Explicit restore-target safety for ZEX-CRM Postgres restores.
// Safety is based on URL equality, not host/database naming heuristics.

const PRODUCTION_CONFIRM_PHRASE = 'RESTORE_PRODUCTION_CONFIRM';

const stripTrailingSlash = (value) => value.replace(/\/+$/, '');

const normalizeDatabaseUrl = (rawUrl) => {
  if (!rawUrl || !String(rawUrl).trim()) {
    return '';
  }
  try {
    const parsed = new URL(String(rawUrl).trim());
    parsed.hash = '';
    // Compare authority + path + query; drop trailing slash on pathname only.
    if (parsed.pathname.length > 1) {
      parsed.pathname = stripTrailingSlash(parsed.pathname);
    }
    // Username/password encoding can differ; compare structural fields.
    const user = decodeURIComponent(parsed.username || '');
    const password = decodeURIComponent(parsed.password || '');
    const auth =
      user || password
        ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}@`
        : user
          ? `${encodeURIComponent(user)}@`
          : '';
    const query = parsed.search || '';
    return `${parsed.protocol}//${auth}${parsed.host}${parsed.pathname}${query}`;
  } catch {
    return stripTrailingSlash(String(rawUrl).trim());
  }
};

const urlsEqual = (left, right) => {
  const normalizedLeft = normalizeDatabaseUrl(left);
  const normalizedRight = normalizeDatabaseUrl(right);
  if (!normalizedLeft || !normalizedRight) {
    return false;
  }
  return normalizedLeft === normalizedRight;
};

const evaluateRestoreTarget = ({
  restoreUrl,
  productionUrl,
  allowProductionRestore = false,
  confirmPhrase = '',
}) => {
  if (!restoreUrl || !String(restoreUrl).trim()) {
    return {
      allowed: false,
      isProductionTarget: false,
      reason: 'RESTORE_DATABASE_URL is required (disposable restore target)',
    };
  }

  const isProductionTarget =
    Boolean(productionUrl && String(productionUrl).trim()) &&
    urlsEqual(restoreUrl, productionUrl);

  if (!isProductionTarget) {
    return {
      allowed: true,
      isProductionTarget: false,
      reason: 'restore target is not the configured production database URL',
    };
  }

  const allow =
    allowProductionRestore === true ||
    String(allowProductionRestore).toLowerCase() === 'true' ||
    String(allowProductionRestore) === '1';

  if (!allow) {
    return {
      allowed: false,
      isProductionTarget: true,
      reason:
        'refusing restore into PRODUCTION_DATABASE_URL without ALLOW_PRODUCTION_RESTORE=true',
    };
  }

  if (String(confirmPhrase) !== PRODUCTION_CONFIRM_PHRASE) {
    return {
      allowed: false,
      isProductionTarget: true,
      reason: `production restore requires CONFIRM_PHRASE=${PRODUCTION_CONFIRM_PHRASE}`,
    };
  }

  return {
    allowed: true,
    isProductionTarget: true,
    reason: 'production restore explicitly confirmed',
  };
};

const parseArgs = (argv) => {
  const args = {
    restoreUrl: process.env.RESTORE_DATABASE_URL || process.env.PG_DATABASE_URL,
    productionUrl: process.env.PRODUCTION_DATABASE_URL || '',
    allowProductionRestore: process.env.ALLOW_PRODUCTION_RESTORE || 'false',
    confirmPhrase: process.env.CONFIRM_PHRASE || '',
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--restore-url') {
      args.restoreUrl = argv[index + 1];
      index += 1;
    } else if (token === '--production-url') {
      args.productionUrl = argv[index + 1];
      index += 1;
    } else if (token === '--allow') {
      args.allowProductionRestore = argv[index + 1];
      index += 1;
    } else if (token === '--confirm') {
      args.confirmPhrase = argv[index + 1];
      index += 1;
    }
  }
  return args;
};

const main = () => {
  const command = process.argv[2] || 'gate';
  if (command !== 'gate') {
    console.error(`unknown command: ${command}`);
    process.exit(2);
  }
  const decision = evaluateRestoreTarget(parseArgs(process.argv.slice(3)));
  if (!decision.allowed) {
    console.error(decision.reason);
    process.exit(1);
  }
  console.log(
    JSON.stringify({
      ok: true,
      isProductionTarget: decision.isProductionTarget,
      reason: decision.reason,
    }),
  );
};

module.exports = {
  PRODUCTION_CONFIRM_PHRASE,
  normalizeDatabaseUrl,
  urlsEqual,
  evaluateRestoreTarget,
};

if (require.main === module) {
  main();
}
