const repoRoot = new URL('../', import.meta.url);

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const target = new URL(`${specifier.slice(2)}.ts`, repoRoot);
    return nextResolve(target.href, context);
  }

  return nextResolve(specifier, context);
}
