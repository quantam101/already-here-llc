'use strict';

// Hard caps on LLM spend per pipeline run: env values tune within the cap, never above it.
const DEFAULT_GENERATION_ATTEMPTS = 3;
const HARD_MAX_GENERATION_ATTEMPTS = 5;
const DEFAULT_POSTS_PER_RUN = 1;
const HARD_MAX_POSTS_PER_RUN = 5;

// Unset uses the default; a set value keeps its meaning (0 or invalid runs nothing) up to the hard cap.
function boundedInt(value, fallback, hardMax) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
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
