import { access } from 'node:fs/promises';
import { constants } from 'node:fs';

const repoRoot = new URL('../', import.meta.url);
const aliasExtensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];

async function exists(url) {
  try {
    await access(url, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

export async function resolve(specifier, context, nextResolve) {
  if (!specifier.startsWith('@/')) {
    return nextResolve(specifier, context);
  }

  const relativeSpecifier = specifier.slice(2);

  for (const extension of aliasExtensions) {
    const target = new URL(`${relativeSpecifier}${extension}`, repoRoot);
    if (await exists(target)) {
      return nextResolve(target.href, context);
    }
  }

  return nextResolve(new URL(relativeSpecifier, repoRoot).href, context);
}
