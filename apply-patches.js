const fs = require('fs');

const mark = ['SD', 'VOSB'].join('');

const files = [
  'app/capability-statement/page.tsx',
  'already-here-llc-v1.1/already-here-llc/app/capability-statement/page.tsx',
  'app/page.tsx',
  'already-here-llc-v1.1/already-here-llc/app/page.tsx',
  'app/layout.tsx',
  'already-here-llc-v1.1/already-here-llc/app/layout.tsx',
  'app/who-we-serve/page.tsx',
  'already-here-llc-v1.1/already-here-llc/app/who-we-serve/page.tsx'
];

const replacements = [
  [mark + ' Certified', mark + ' Eligible'],
  [mark + '-certified', mark + '-eligible'],
  [mark + '-eligible · SAM.gov registered', 'SAM.gov registered · Actively pursuing ' + mark + ' certification'],
  [mark + '-eligible · SAM.gov Registered', 'SAM.gov registered · Actively pursuing ' + mark + ' certification'],
  [mark + ' set-aside and sole-source inquiries welcome.', mark + '-eligible procurement inquiries welcome.'],
  ['Arizona Onsite Infrastructure Execution', 'Field Execution Partner'],
  ['href="/contact"', 'href="/dispatch"'],
  ["href='/contact'", "href='/dispatch'"]
];

let changed = 0;

for (const file of files) {
  if (!fs.existsSync(file)) continue;

  const before = fs.readFileSync(file, 'utf8');
  let after = before;

  for (const [from, to] of replacements) {
    after = after.split(from).join(to);
  }

  if (after !== before) {
    fs.writeFileSync(file, after);
    changed += 1;
    console.log('patched ' + file);
  }
}

console.log('patched files: ' + changed);
