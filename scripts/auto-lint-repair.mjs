import { readFileSync, writeFileSync } from 'node:fs';

const target = process.argv[2];
const dryRun = process.argv.includes('--dry-run');

if (!target) {
  console.error('Usage: node scripts/auto-lint-repair.mjs <file> [--dry-run]');
  process.exit(2);
}

let source = readFileSync(target, 'utf8');
const original = source;

function removeNamedImport(sourceText, importName) {
  return sourceText.replace(/import\s+\{([^}]+)\}\s+from\s+(['"][^'"]+['"]);/g, (full, names, moduleName) => {
    const remaining = names
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean)
      .filter((name) => name !== importName && !name.startsWith(`${importName} as `));

    if (remaining.length === 0) return '';
    return `import { ${remaining.join(', ')} } from ${moduleName};`;
  });
}

const repairs = [
  {
    id: 'remove-unused-existsSync',
    applies: /existsSync' is defined but never used|existsSync is defined but never used|existsSync/.test(source),
    run: (text) => removeNamedImport(text, 'existsSync')
  }
];

const applied = [];
for (const repair of repairs) {
  if (!repair.applies) continue;
  const next = repair.run(source);
  if (next !== source) {
    source = next;
    applied.push(repair.id);
  }
}

const result = {
  file: target,
  dryRun,
  changed: source !== original,
  applied
};

console.log(JSON.stringify(result, null, 2));

if (source !== original && !dryRun) writeFileSync(target, source);
