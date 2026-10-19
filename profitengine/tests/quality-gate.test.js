'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePost, normalizeTitle, jaccardSimilarity } = require('../quality-gate');

function body(extra = '') {
  return `## Start With the Reader's Decision
Start by defining the decision the reader needs to make and the information required before acting. This guide uses a hypothetical example rather than an unsupported market statistic.

## Build the Workflow
Use a simple checklist so the work can be repeated and reviewed.
- Define the desired outcome.
- List the inputs you can verify.
- Record the assumptions before you calculate anything.

## Test Before You Scale
Before you spend more money, run a small pilot. Compare the expected outcome with the observed result, document what changed, and decide whether the process should continue.

## Review the Risks
Check insurance, platform terms, customer support burden, maintenance, taxes, and local requirements when they apply. Verify current rules with the relevant provider or authority before acting.

## Take the Next Action
Use this workflow: validate the demand, calculate a hypothetical break-even point with your own numbers, run the smallest useful test, and review the evidence before expanding.
${extra}`;
}

function post(title, content = body()) {
  const description = 'A detailed, practical workflow that helps small-business operators evaluate a decision, document assumptions, test safely, and act on verified evidence.';
  return {
    title,
    filename: 'candidate.md',
    content: `---\ntitle: "${title}"\ndescription: "${description}"\ntags: "operations, validation, small business"\ndate: 2026-10-19\nniche: "operations"\n---\n\n${content}`
  };
}

const relaxed = { minWords: 1, maxWords: 5000 };

test('normalizes year variants so repeated evergreen titles are detected', () => {
  assert.equal(
    normalizeTitle('How to Build a Better Workflow 2026'),
    normalizeTitle('How to Build a Better Workflow 2025')
  );
});

test('rejects a duplicate title already in the library', () => {
  const result = validatePost(post('How to Build a Better Workflow 2026'), {
    ...relaxed,
    similarityThreshold: 0.99,
    existingArticles: [{
      filename: '2025-01-01-workflow.md',
      title: 'How to Build a Better Workflow 2025',
      content: body('A different closing paragraph.')
    }]
  });

  assert.equal(result.pass, false);
  assert.match(result.errors.join(' '), /Duplicate title detected/);
});

test('rejects near-duplicate article bodies', () => {
  const original = body('Use the evidence to choose the next test.');
  const candidate = body('Use the evidence to choose the next test, then document the result.');
  assert.ok(jaccardSimilarity(original, candidate) > 0.42);

  const result = validatePost(post('A New and Specific Title', candidate), {
    ...relaxed,
    similarityThreshold: 0.42,
    existingArticles: [{
      filename: 'prior.md',
      title: 'A Different Prior Title',
      content: original
    }]
  });

  assert.equal(result.pass, false);
  assert.match(result.errors.join(' '), /too similar/i);
});

test('rejects unverified projection language and meta-writing headings', () => {
  const content = body().replace(
    '## Start With the Reader\'s Decision',
    '## Hook: Start With the Reader\'s Decision'
  ) + '\n\nThe market is projected to reach a much larger size next year.';

  const result = validatePost(post('Specific Practical Guide', content), {
    ...relaxed,
    existingArticles: []
  });

  assert.equal(result.pass, false);
  assert.match(result.errors.join(' '), /Hook|forecast\/research claims/);
});

test('accepts a specific, original, actionable draft', () => {
  const result = validatePost(post('How to Test a Practical Business Workflow'), {
    ...relaxed,
    existingArticles: []
  });

  assert.equal(result.pass, true, result.errors.join(' | '));
  assert.ok(result.score >= 90);
});

test('rejects fabricated performance claims without a source', () => {
  const result = validatePost(post(
    'A Specific Workflow for Testing Service Operations',
    body('\n\nThis system will increase client engagement by at least 20% within two weeks.')
  ), { ...relaxed, existingArticles: [] });

  assert.equal(result.pass, false);
  assert.match(result.errors.join(' '), /forecast\/research claims/);
});

test('rejects duplicate topics even when the titles are paraphrased', () => {
  const candidate = post('Package Your Expertise as a Productized Service Offer');
  const existing = post('Turn Your Expertise Into a Productized Service Template');
  existing.filename = 'existing-productized-service.md';
  const result = validatePost(candidate, {
    ...relaxed,
    topicSimilarityThreshold: 0.45,
    similarityThreshold: 0.99,
    existingArticles: [existing]
  });

  assert.equal(result.pass, false);
  assert.match(result.errors.join(' '), /Duplicate topic detected/);
});

test('rejects hourly pricing outside the approved Weston schedule', () => {
  const result = validatePost(post(
    'A Specific Workflow for Pricing Service Operations',
    body('\n\nCharge $80/hr for implementation and invoice after delivery.')
  ), { ...relaxed, existingArticles: [] });

  assert.equal(result.pass, false);
  assert.match(result.errors.join(' '), /pricing conflicts/i);
});

test('rejects incomplete metadata', () => {
  const candidate = post('A Specific Workflow for Verifying Article Metadata');
  candidate.content = candidate.content.replace(/description:.*\n/, '');
  const result = validatePost(candidate, { ...relaxed, existingArticles: [] });

  assert.equal(result.pass, false);
  assert.match(result.errors.join(' '), /Missing required frontmatter field: description/);
});

test('rejects malformed Markdown tables and accepts GFM tables', () => {
  const malformed = validatePost(post(
    'A Specific Workflow for Validating Markdown Tables',
    body('\n\n| Gate | Expected |\n| Claims | Verified |')
  ), { ...relaxed, existingArticles: [] });
  assert.equal(malformed.pass, false);
  assert.match(malformed.errors.join(' '), /no valid separator row/);

  const valid = validatePost(post(
    'A Specific Workflow for Rendering Markdown Tables',
    body('\n\n| Gate | Expected |\n| --- | --- |\n| Claims | Verified |')
  ), { ...relaxed, existingArticles: [] });
  assert.equal(valid.pass, true, valid.errors.join(' | '));
});

