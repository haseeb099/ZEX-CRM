#!/usr/bin/env node
// Fail-closed production image provenance helpers for ZEX-CRM.
// A SHA-tagged production image may only be built from a clean tree.

const { execFileSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');

const assertCleanWorkingTree = (porcelain) => {
  const dirty = String(porcelain ?? '')
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

  if (dirty.length > 0) {
    const sample = dirty.slice(0, 8).join('\n');
    throw new Error(
      [
        'refusing production image build: working tree is dirty',
        'A SHA-tagged production image must be built from a clean tree that exactly matches HEAD.',
        'Commit or stash changes, then rebuild.',
        sample ? `dirty paths:\n${sample}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }
};

const isForbiddenLatestTag = (tag) => {
  const normalized = String(tag ?? '')
    .trim()
    .toLowerCase();
  return (
    normalized === 'latest' ||
    normalized.endsWith(':latest') ||
    normalized.includes(':latest@')
  );
};

const deriveImageTags = ({ headSha, repo = 'zex-crm', shortLength = 12 }) => {
  const fullSha = String(headSha ?? '').trim();
  if (!/^[0-9a-f]{7,40}$/i.test(fullSha)) {
    throw new Error('HEAD SHA is required to derive immutable image tags');
  }
  const shortSha = fullSha.slice(0, shortLength);
  const repository = String(repo ?? 'zex-crm').trim() || 'zex-crm';
  const fullTag = `${repository}:${fullSha}`;
  const shortTag = `${repository}:${shortSha}`;

  if (isForbiddenLatestTag(fullTag) || isForbiddenLatestTag(shortTag)) {
    throw new Error('refusing to tag :latest');
  }
  if (!fullTag.endsWith(`:${fullSha}`)) {
    throw new Error('full image tag must be derived from HEAD SHA');
  }

  return {
    fullSha,
    shortSha,
    repository,
    fullTag,
    shortTag,
    appVersion: `0.0.0+${fullSha}`,
  };
};

const readGitPorcelain = (cwd = ROOT) =>
  execFileSync('git', ['status', '--porcelain'], {
    cwd,
    encoding: 'utf8',
  });

const readGitHead = (cwd = ROOT) =>
  execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd,
    encoding: 'utf8',
  }).trim();

const assertCleanGitTree = (cwd = ROOT) => {
  assertCleanWorkingTree(readGitPorcelain(cwd));
};

const main = () => {
  const command = process.argv[2] || 'assert-clean';
  if (command === 'assert-clean') {
    assertCleanGitTree(ROOT);
    const headSha = readGitHead(ROOT);
    const tags = deriveImageTags({
      headSha,
      repo: process.env.ZEX_CRM_IMAGE_REPO || 'zex-crm',
    });
    console.log(
      JSON.stringify({
        ok: true,
        clean: true,
        headSha,
        fullTag: tags.fullTag,
        shortTag: tags.shortTag,
        appVersion: tags.appVersion,
      }),
    );
    return;
  }
  if (command === 'derive-tags') {
    const headSha = process.argv[3] || readGitHead(ROOT);
    const tags = deriveImageTags({
      headSha,
      repo: process.env.ZEX_CRM_IMAGE_REPO || 'zex-crm',
    });
    console.log(JSON.stringify(tags));
    return;
  }
  console.error(`unknown command: ${command}`);
  process.exit(2);
};

module.exports = {
  assertCleanWorkingTree,
  assertCleanGitTree,
  deriveImageTags,
  isForbiddenLatestTag,
  readGitPorcelain,
  readGitHead,
};

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(String(error.message || error));
    process.exit(1);
  }
}
