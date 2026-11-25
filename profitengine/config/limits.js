'use strict';

// Hard caps on LLM spend per pipeline run: env values tune within the cap, never above it.
const DEFAULT_GENERATION_ATTEMPTS = 3;
const HARD_MAX_GENERATION_ATTEMPTS = 5;
const DEFAULT_POSTS_PER_RUN = 1;
const HARD_MAX_POSTS_PER_RUN = 5;

function boundedInt(value, fallback, hardMax) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, hardMax);
}

function resolveMaxGenerationAttempts(value) {
  return boundedInt(value, DEFAULT_GENERATION_ATTEMPTS, HARD_MAX_GENERATION_ATTEMPTS);
}

function resolvePostsPerRun(value) {
  return boundedInt(value, DEFAULT_POSTS_PER_RUN, HARD_MAX_POSTS_PER_RUN);
}

module.exports = {
  HARD_MAX_GENERATION_ATTEMPTS,
  HARD_MAX_POSTS_PER_RUN,
  resolveMaxGenerationAttempts,
  resolvePostsPerRun
};
