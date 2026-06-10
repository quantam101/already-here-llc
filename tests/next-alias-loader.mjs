import { access, stat } from 'node:fs/promises';
import { constants } from 'node:fs';

const repoRoot = new URL('../', import.meta.url);
const candidateSuffixes = [
  '',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '/index.ts',
  '/index.tsx',
  '/index.js',
  '/index.jsx',
  '/index.mjs',
  '/index.cjs'
];

function hasRuntimeExtension(url) {
  return /\.(?:[cm]?[jt]sx?|json)$/i.test(url.pathname);
}

function isRelativeOrAbsoluteFileSpecifier(specifier) {
  return specifier.startsWith('./') || specifier.startsWith('../') || specifier.startsWith('/');
}

function appendSuffix(url, suffix) {
  if (!suffix) return url;
  const target = new URL(url.href);
  target.pathname = `${target.pathname}${suffix}`;
  return target;
}

async function isReadableFile(url) {
  try {
    await access(url, constants.R_OK);
    const stats = await stat(url);
    return stats.isFile();
  } catch {
    return false;
  }
}

async function resolveExistingFile(baseUrl, context, nextResolve) {
  const suffixes = hasRuntimeExtension(baseUrl) ? [''] : candidateSuffixes;

  for (const suffix of suffixes) {
    const target = appendSuffix(baseUrl, suffix);
    if (await isReadableFile(target)) {
      return nextResolve(target.href, context);
    }
  }

  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const target = new URL(specifier.slice(2), repoRoot);
    const resolved = await resolveExistingFile(target, context, nextResolve);
    return resolved ?? nextResolve(target.href, context);
  }

  if (isRelativeOrAbsoluteFileSpecifier(specifier) && context.parentURL?.startsWith('file:')) {
    const target = specifier.startsWith('/')
      ? new URL(specifier, 'file://')
      : new URL(specifier, context.parentURL);
    const resolved = await resolveExistingFile(target, context, nextResolve);
    if (resolved) return resolved;
  }

  return nextResolve(specifier, context);
}
