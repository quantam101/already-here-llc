'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  HARD_MAX_GENERATION_ATTEMPTS,
  HARD_MAX_POSTS_PER_RUN,
  resolveMaxGenerationAttempts,
  resolvePostsPerRun
} = require('../config/limits');

test('generation attempts keep the default and never exceed the hard cap', () => {
  assert.equal(resolveMaxGenerationAttempts(undefined), 3);
  assert.equal(resolveMaxGenerationAttempts('2'), 2);
  assert.equal(resolveMaxGenerationAttempts('1000'), HARD_MAX_GENERATION_ATTEMPTS);
  assert.equal(resolveMaxGenerationAttempts(''), 3);
  assert.equal(resolveMaxGenerationAttempts('not-a-number'), 0);
  assert.equal(resolveMaxGenerationAttempts('0'), 0);
});

test('posts per run keep the default and never exceed the hard cap', () => {
  assert.equal(resolvePostsPerRun(undefined), 1);
  assert.equal(resolvePostsPerRun('2'), 2);
  assert.equal(resolvePostsPerRun(500), HARD_MAX_POSTS_PER_RUN);
  assert.equal(resolvePostsPerRun('0'), 0);
  assert.equal(resolvePostsPerRun('abc'), 0);
});

test('the LLM loops read their bounds from the capped resolvers', () => {
  const generator = fs.readFileSync(path.join(__dirname, '..', 'agents', 'content-generator.js'), 'utf8');
  const pipeline = fs.readFileSync(path.join(__dirname, '..', 'pipeline.js'), 'utf8');
  assert.match(generator, /const maxAttempts = resolveMaxGenerationAttempts\(process\.env\.CONTENT_MAX_ATTEMPTS\);/);
  assert.match(pipeline, /const count = resolvePostsPerRun\(options\.count \|\| process\.env\.POSTS_PER_RUN\);/);
});
