'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { loadExistingArticles, validatePost } = require('./quality-gate');

const ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content', 'blog');
const BASELINE_PATH = path.join(__dirname, 'catalog-baseline.json');

function digest(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

function loadBaseline(baselinePath = BASELINE_PATH) {
  if (!fs.existsSync(baselinePath)) throw new Error(`Catalog baseline is missing: ${baselinePath}`);
  const parsed = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  if (parsed.version !== 1 || !parsed.files || typeof parsed.files !== 'object') {
    throw new Error('Catalog baseline must contain version=1 and a files object.');
  }
  return parsed;
}

function validateCatalog(options = {}) {
  const contentDir = options.contentDir || CONTENT_DIR;
  const baseline = options.baseline || loadBaseline(options.baselinePath || BASELINE_PATH);
  const articles = loadExistingArticles(contentDir);
  const changed = articles.filter(article => {
    const key = `content/blog/${article.filename}`;
    return baseline.files[key] !== digest(article.content);
  });
  const failures = [];

  for (const article of changed) {
    const existingArticles = articles.filter(existing => existing.filename !== article.filename);
    const result = validatePost(article, { ...options.validationOptions, existingArticles });
    if (!result.pass) failures.push({ filename: article.filename, errors: result.errors });
  }

  return {
    pass: failures.length === 0,
    articleCount: articles.length,
    grandfatheredCount: articles.length - changed.length,
    validatedCount: changed.length,
    failures
  };
}

function main() {
  const result = validateCatalog();
  console.log(`[catalog-gate] ${result.pass ? 'PASS' : 'FAIL'} articles=${result.articleCount} validated=${result.validatedCount} grandfathered=${result.grandfatheredCount}`);
  for (const failure of result.failures) {
    console.error(`[catalog-gate] ${failure.filename}`);
    for (const error of failure.errors) console.error(`  - ${error}`);
  }
  process.exitCode = result.pass ? 0 : 1;
}

if (require.main === module) main();

module.exports = { digest, loadBaseline, validateCatalog };
