'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_MIN_WORDS = 850;
const DEFAULT_MAX_WORDS = 1600;
const DEFAULT_SIMILARITY_THRESHOLD = 0.42;

function stripFrontmatter(content = '') {
  return String(content).replace(/^---\s*[\s\S]*?\n---\s*/m, '').trim();
}

function normalizeText(content = '') {
  return stripFrontmatter(content)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_>#~-]/g, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordCount(content = '') {
  const normalized = normalizeText(content);
  return normalized ? normalized.split(' ').length : 0;
}

function normalizeTitle(title = '') {
  return String(title)
    .toLowerCase()
    .replace(/\b20\d{2}\b/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTitle(content = '') {
  const match = String(content).match(/^---[\s\S]*?^title:\s*(.+)$/m);
  return match ? match[1].trim().replace(/^['"]|['"]$/g, '') : '';
}

function shingles(content = '', size = 3) {
  const words = normalizeText(content).split(' ').filter(Boolean);
  const output = new Set();
  for (let i = 0; i <= words.length - size; i += 1) {
    output.add(words.slice(i, i + size).join(' '));
  }
  return output;
}

function jaccardSimilarity(a, b) {
  const left = shingles(a);
  const right = shingles(b);
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const item of left) {
    if (right.has(item)) intersection += 1;
  }
  return intersection / (left.size + right.size - intersection);
}

function getOutputDir() {
  const configured = process.env.CONTENT_OUTPUT_DIR || '../content/blog';
  return path.resolve(__dirname, configured);
}

function loadExistingArticles(outputDir = getOutputDir()) {
  if (!fs.existsSync(outputDir)) return [];
  return fs.readdirSync(outputDir)
    .filter(name => name.endsWith('.md'))
    .map(filename => {
      const fullPath = path.join(outputDir, filename);
      const content = fs.readFileSync(fullPath, 'utf8');
      return { filename, title: extractTitle(content), content };
    });
}

function findUnsupportedClaims(body) {
  const paragraphs = String(body).split(/\n\s*\n/);
  const risky = /\b(projected|forecast(?:ed)?|expected to reach|cagr|market size|studies show|research shows|according to (?:a )?study)\b/i;
  return paragraphs
    .filter(paragraph => risky.test(paragraph))
    .map(paragraph => paragraph.replace(/\s+/g, ' ').trim().slice(0, 180));
}

function validatePost(post, options = {}) {
  const errors = [];
  const warnings = [];
  const body = stripFrontmatter(post?.content || '');
  const words = wordCount(body);
  const minWords = Number(options.minWords || process.env.CONTENT_MIN_WORDS || DEFAULT_MIN_WORDS);
  const maxWords = Number(options.maxWords || process.env.CONTENT_MAX_WORDS || DEFAULT_MAX_WORDS);
  const similarityThreshold = Number(
    options.similarityThreshold || process.env.CONTENT_SIMILARITY_THRESHOLD || DEFAULT_SIMILARITY_THRESHOLD
  );

  if (words < minWords) errors.push(`Article is too short: ${words} words; minimum is ${minWords}.`);
  if (words > maxWords) errors.push(`Article is too long: ${words} words; maximum is ${maxWords}.`);

  const h2Count = (body.match(/^##\s+/gm) || []).length;
  if (h2Count < 4) errors.push(`Article needs at least 4 H2 sections; found ${h2Count}.`);

  const bulletCount = (body.match(/^[-*]\s+/gm) || []).length;
  if (bulletCount < 3) warnings.push(`Article has only ${bulletCount} actionable bullet points.`);

  if (/^##\s*(hook|introduction)\s*:/im.test(body) || /^##\s*(hook|introduction)\s*$/im.test(body)) {
    errors.push('Remove meta-writing headings such as "Hook" or "Introduction"; use a reader-facing heading.');
  }

  if (/\b(untapped goldmine|new norm for forward-thinking|turning data into dollars|skyrocket your|game[- ]changer)\b/i.test(body)) {
    warnings.push('Article contains generic marketing phrasing that should be replaced with concrete language.');
  }

  const unsupportedClaims = findUnsupportedClaims(body);
  if (unsupportedClaims.length && process.env.ALLOW_UNVERIFIED_STATS !== 'true') {
    errors.push(`Remove or verify forecast/research claims before publication: ${unsupportedClaims[0]}`);
  }

  const existing = options.existingArticles || loadExistingArticles(options.outputDir || getOutputDir());
  const candidateTitle = normalizeTitle(post?.title || extractTitle(post?.content || ''));
  let highestSimilarity = 0;
  let closestFile = '';

  for (const article of existing) {
    const previousTitle = normalizeTitle(article.title);
    if (candidateTitle && previousTitle && candidateTitle === previousTitle) {
      errors.push(`Duplicate title detected: already published in ${article.filename}.`);
      break;
    }
  }

  for (const article of existing) {
    const similarity = jaccardSimilarity(body, article.content);
    if (similarity > highestSimilarity) {
      highestSimilarity = similarity;
      closestFile = article.filename;
    }
  }

  if (highestSimilarity >= similarityThreshold) {
    errors.push(
      `Article is too similar to ${closestFile}: ${(highestSimilarity * 100).toFixed(1)}% similarity; threshold is ${(similarityThreshold * 100).toFixed(0)}%.`
    );
  }

  const hasConcreteSteps = /\b(step\s*\d+|start by|next,|then,|before you|checklist|workflow|calculate|compare|validate)\b/i.test(body);
  if (!hasConcreteSteps) {
    warnings.push('Article lacks a clear executable sequence; add a workflow, checklist, or concrete steps.');
  }

  return {
    pass: errors.length === 0,
    score: Math.max(0, 100 - errors.length * 25 - warnings.length * 5),
    errors,
    warnings,
    metrics: {
      words,
      h2Count,
      bulletCount,
      highestSimilarity: Number(highestSimilarity.toFixed(4)),
      closestFile: closestFile || null
    }
  };
}

function getRecentTitles(limit = 20, outputDir = getOutputDir()) {
  return loadExistingArticles(outputDir)
    .slice(-limit)
    .map(article => article.title)
    .filter(Boolean);
}

module.exports = {
  stripFrontmatter,
  normalizeText,
  normalizeTitle,
  extractTitle,
  wordCount,
  jaccardSimilarity,
  getOutputDir,
  loadExistingArticles,
  validatePost,
  getRecentTitles
};
