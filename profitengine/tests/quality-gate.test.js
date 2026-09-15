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
  return {
    title,
    filename: 'candidate.md',
    content
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
