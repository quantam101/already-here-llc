'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_MIN_WORDS = 850;
const DEFAULT_MAX_WORDS = 1600;
const DEFAULT_SIMILARITY_THRESHOLD = 0.42;
const DEFAULT_TOPIC_SIMILARITY_THRESHOLD = 0.5;
const REQUIRED_METADATA = ['title', 'description', 'tags', 'date', 'niche'];
const APPROVED_HOURLY_RATES = new Set([65, 125, 150, 175, 187.5, 200, 225]);
const TOPIC_STOP_WORDS = new Set(
  'a an and are as at be before best build by complete create design for from guide how in into of on or practical repeatable step the to turn with without your 2026'.split(' ')
);

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

function parseFrontmatter(content = '') {
  const match = String(content).match(/^---\s*\n([\s\S]*?)\n---(?:\s*\n|$)/);
  if (!match) return {};
  const metadata = {};
  for (const line of match[1].split('\n')) {
    const field = line.match(/^([a-zA-Z][\w-]*):\s*(.*)$/);
    if (!field) continue;
    let value = field[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    metadata[field[1]] = value;
  }
  return metadata;
}

function stemTopicWord(word) {
  return word.replace(/(ing|ers|ies|ed|es|s)$/i, '').replace(/i$/, 'y');
}

function topicTokens(article = {}) {
  const metadata = parseFrontmatter(article.content || '');
  return new Set(
    normalizeTitle(`${article.title || metadata.title || ''} ${metadata.description || article.excerpt || ''}`)
      .split(' ')
      .map(stemTopicWord)
      .filter(word => word.length > 2 && !TOPIC_STOP_WORDS.has(word))
  );
}

function setSimilarity(left, right) {
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const item of left) if (right.has(item)) intersection += 1;
  return intersection / (left.size + right.size - intersection);
}

function topicSimilarity(a, b) {
  return setSimilarity(topicTokens(a), topicTokens(b));
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
      const metadata = parseFrontmatter(content);
      return { filename, title: metadata.title || extractTitle(content), excerpt: metadata.description || '', content };
    });
}

function findUnsupportedClaims(body) {
  const paragraphs = String(body).split(/\n\s*\n/);
  const risky = /\b(projected|forecast(?:ed)?|expected to reach|cagr|market size|studies show|research shows|according to (?:a )?study)\b/i;
  const numericPromise = /(?:\b\d+(?:\.\d+)?%|\$\d[\d,]*(?:\.\d+)?)[\s\S]{0,100}\b(increase|reduce|improve|boost|save|earn|generate|conversion|engagement|guarantee|return)\b|\b(increase|reduce|improve|boost|save|earn|generate|conversion|engagement|guarantee|return)\b[\s\S]{0,100}(?:\b\d+(?:\.\d+)?%|\$\d[\d,]*(?:\.\d+)?)/i;
  return paragraphs
    .filter(paragraph => {
      if (/\b(hypothetical|illustrative example|for example|assume|sample calculation)\b/i.test(paragraph)) return false;
      if (/https?:\/\/|\[[^\]]+\]\([^)]+\)/.test(paragraph)) return false;
      return risky.test(paragraph) || numericPromise.test(paragraph);
    })
    .map(paragraph => paragraph.replace(/\s+/g, ' ').trim().slice(0, 180));
}

function findPricingConflicts(body) {
  const conflicts = [];
  const ratePattern = /\$(\d+(?:\.\d{1,2})?)\s*(?:\/|per\s+)(?:hour|hr)\b/gi;
  for (const match of String(body).matchAll(ratePattern)) {
    const rate = Number(match[1]);
    if (!APPROVED_HOURLY_RATES.has(rate)) conflicts.push(match[0]);
  }
  return conflicts;
}

function findMalformedTables(body) {
  const lines = String(body).split('\n');
  const errors = [];
  const tableLine = line => (line.match(/\|/g) || []).length >= 2;
  const separator = line => /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
  for (let index = 0; index < lines.length; index += 1) {
    if (!tableLine(lines[index]) || separator(lines[index])) continue;
    const previousIsTable = index > 0 && tableLine(lines[index - 1]);
    if (!previousIsTable && !separator(lines[index + 1] || '')) {
      errors.push(`Line ${index + 1} looks like a Markdown table header but has no valid separator row.`);
    }
  }
  return errors;
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
  const topicSimilarityThreshold = Number(
    options.topicSimilarityThreshold || process.env.CONTENT_TOPIC_SIMILARITY_THRESHOLD || DEFAULT_TOPIC_SIMILARITY_THRESHOLD
  );

  const metadata = parseFrontmatter(post?.content || '');
  for (const key of REQUIRED_METADATA) {
    if (!String(metadata[key] || '').trim()) errors.push(`Missing required frontmatter field: ${key}.`);
  }
  if (metadata.date && !/^\d{4}-\d{2}-\d{2}$/.test(metadata.date)) {
    errors.push('Frontmatter date must use YYYY-MM-DD format.');
  }
  if (metadata.title && (metadata.title.length < 30 || metadata.title.length > 110)) {
    errors.push(`Frontmatter title must be 30-110 characters; found ${metadata.title.length}.`);
  }
  if (metadata.description && (metadata.description.length < 120 || metadata.description.length > 220)) {
    errors.push(`Frontmatter description must be 120-220 characters; found ${metadata.description.length}.`);
  }

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

  const pricingConflicts = findPricingConflicts(body);
  if (pricingConflicts.length) {
    errors.push(`Hourly pricing conflicts with the approved Weston schedule: ${pricingConflicts.join(', ')}.`);
  }

  const malformedTables = findMalformedTables(body);
  errors.push(...malformedTables);

  const existing = options.existingArticles || loadExistingArticles(options.outputDir || getOutputDir());
  const candidateTitle = normalizeTitle(post?.title || extractTitle(post?.content || ''));
  let highestSimilarity = 0;
  let closestFile = '';
  let highestTopicSimilarity = 0;
  let closestTopicFile = '';

  for (const article of existing) {
    const previousTitle = normalizeTitle(article.title);
    if (candidateTitle && previousTitle && candidateTitle === previousTitle) {
      errors.push(`Duplicate title detected: already published in ${article.filename}.`);
      break;
    }
  }

  for (const article of existing) {
    const similarity = topicSimilarity(post, article);
    if (similarity > highestTopicSimilarity) {
      highestTopicSimilarity = similarity;
      closestTopicFile = article.filename;
    }
  }

  if (highestTopicSimilarity >= topicSimilarityThreshold) {
    errors.push(
      `Duplicate topic detected against ${closestTopicFile}: ${(highestTopicSimilarity * 100).toFixed(1)}% metadata similarity; threshold is ${(topicSimilarityThreshold * 100).toFixed(0)}%.`
    );
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
      closestFile: closestFile || null,
      highestTopicSimilarity: Number(highestTopicSimilarity.toFixed(4)),
      closestTopicFile: closestTopicFile || null
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
  parseFrontmatter,
  wordCount,
  jaccardSimilarity,
  topicSimilarity,
  findUnsupportedClaims,
  findPricingConflicts,
  findMalformedTables,
  getOutputDir,
  loadExistingArticles,
  validatePost,
  getRecentTitles
};

