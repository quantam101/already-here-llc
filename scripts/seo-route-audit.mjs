import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();

const publicRoutes = [
  '/',
  '/services',
  '/who-we-serve',
  '/dispatch',
  '/rfq',
  '/coverage',
  '/project-gallery',
  '/capability-statement',
  '/blog',
  '/privacy'
];

const operationalRoutes = ['/profitengine'];

const routeFiles = new Map([
  ['/', 'app/page.tsx'],
  ['/services', 'app/services/page.tsx'],
  ['/who-we-serve', 'app/who-we-serve/page.tsx'],
  ['/dispatch', 'app/dispatch/page.tsx'],
  ['/rfq', 'app/rfq/page.tsx'],
  ['/coverage', 'app/coverage/page.tsx'],
  ['/project-gallery', 'app/project-gallery/page.tsx'],
  ['/capability-statement', 'app/capability-statement/page.tsx'],
  ['/blog', 'app/blog/page.tsx'],
  ['/privacy', 'app/privacy/page.tsx'],
  ['/profitengine', 'app/profitengine/page.tsx']
]);

function read(path) {
  return readFileSync(join(repoRoot, path), 'utf8');
}

function hasFile(path) {
  return existsSync(join(repoRoot, path));
}

const failures = [];
const warnings = [];

for (const [route, file] of routeFiles) {
  if (!hasFile(file)) failures.push(`${route} missing route file ${file}`);
}

const sitemapPath = 'app/sitemap.ts';
const footerPath = 'components/Footer.tsx';
const robotsPath = 'app/robots.ts';

if (!hasFile(sitemapPath)) failures.push('Missing app/sitemap.ts');
if (!hasFile(robotsPath)) failures.push('Missing app/robots.ts');
if (!hasFile(footerPath)) failures.push('Missing components/Footer.tsx');

const sitemap = hasFile(sitemapPath) ? read(sitemapPath) : '';
const footer = hasFile(footerPath) ? read(footerPath) : '';
const robots = hasFile(robotsPath) ? read(robotsPath) : '';

for (const route of publicRoutes) {
  const expected = route === '/' ? 'siteConfig.url' : route;
  if (route !== '/' && !sitemap.includes(route)) failures.push(`Public route ${route} missing from sitemap.ts`);
  if (route === '/' && !sitemap.includes(expected)) failures.push('Home route missing from sitemap.ts');
}

for (const route of ['/services', '/who-we-serve', '/dispatch', '/rfq', '/coverage', '/project-gallery', '/capability-statement', '/blog', '/privacy']) {
  if (!footer.includes(`href="${route}"`)) failures.push(`Public route ${route} missing from footer internal links`);
}

for (const route of operationalRoutes) {
  if (sitemap.includes(route)) failures.push(`Operational route ${route} must not be indexed in sitemap.ts`);
  const file = routeFiles.get(route);
  if (file && hasFile(file)) {
    const text = read(file);
    if (!text.includes('robots') || !text.includes('index: false')) failures.push(`Operational route ${route} must set noindex metadata`);
    if (/Oracle base:/i.test(text)) failures.push(`Operational route ${route} must not display raw runtime base URL`);
  }
}

for (const [route, file] of routeFiles) {
  if (!hasFile(file)) continue;
  const text = read(file);
  if (route !== '/' && route !== '/profitengine') {
    if (!text.includes('alternates') || !text.includes('canonical')) warnings.push(`${route} should define canonical metadata`);
    if (!text.includes('description')) warnings.push(`${route} should define description metadata`);
  }
}

if (!robots.includes('sitemap')) failures.push('robots.ts must publish sitemap location');

const result = {
  status: failures.length === 0 ? 'pass' : 'fail',
  checkedAt: new Date().toISOString(),
  publicRoutes,
  operationalRoutes,
  failures,
  warnings
};

console.log(JSON.stringify(result, null, 2));

if (failures.length > 0) process.exit(1);
