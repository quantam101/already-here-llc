'use strict';

const fs = require('fs');
const path = require('path');
const { generatePost } = require('./agents/content-generator');
const filesystemPublisher = require('./publishers/filesystem');
const devtoPublisher = require('./publishers/devto');
const githubPublisher = require('./publishers/github');

const POSTS_DB = path.join(__dirname, 'data', 'posts.json');

function loadPostsDb() {
  if (!fs.existsSync(POSTS_DB)) return [];
  try {
    return JSON.parse(fs.readFileSync(POSTS_DB, 'utf8'));
  } catch {
    return [];
  }
}

function savePostsDb(records) {
  const dir = path.dirname(POSTS_DB);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(POSTS_DB, JSON.stringify(records, null, 2), 'utf8');
}

function requiredPlatforms() {
  return String(process.env.PUBLISH_REQUIRED_PLATFORMS || 'filesystem')
    .split(',')
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);
}

async function runContentPipeline(options = {}) {
  const count = options.count || parseInt(process.env.POSTS_PER_RUN || '1', 10);
  const results = [];

  for (let i = 0; i < count; i += 1) {
    let post;
    try {
      post = await generatePost(options.topic || null);
    } catch (err) {
      console.error(`[pipeline] Content generation failed (attempt ${i + 1}):`, err.message);
      results.push({ success: false, stage: 'generation', error: err.message });
      continue;
    }

    const publishers = [
      { platform: 'filesystem', publish: () => filesystemPublisher.publish(post) },
      { platform: 'devto', publish: () => devtoPublisher.publish(post) },
      { platform: 'github', publish: () => githubPublisher.publish(post) }
    ];

    const publishResults = await Promise.allSettled(publishers.map(entry => entry.publish()));
    const outcomes = publishResults.map((result, index) => {
      if (result.status === 'fulfilled') return result.value;
      return {
        platform: publishers[index].platform,
        status: 'error',
        error: result.reason?.message || String(result.reason || 'Unknown publisher error')
      };
    });

    const required = requiredPlatforms();
    const requiredFailures = required.filter(platform => {
      const outcome = outcomes.find(item => String(item.platform).toLowerCase() === platform);
      return !outcome || !['published', 'skipped'].includes(outcome.status);
    });
    const publishErrors = outcomes.filter(item => item.status === 'error');
    const publicationStatus = requiredFailures.length
      ? 'failed'
      : publishErrors.length
        ? 'degraded'
        : 'published';

    const record = {
      slug: post.slug,
      title: post.title,
      date: post.date,
      niche: post.niche,
      excerpt: post.excerpt,
      generatedAt: new Date().toISOString(),
      quality: post.quality || null,
      publicationStatus,
      requiredPlatforms: required,
      publishers: outcomes
    };

    const db = loadPostsDb();
    db.unshift(record);
    savePostsDb(db.slice(0, 500));

    console.log(`[pipeline] Completed: ${post.slug} — ${publicationStatus}`);
    if (post.quality) {
      console.log(`  [quality] score=${post.quality.score} words=${post.quality.metrics?.words ?? 'n/a'} similarity=${post.quality.metrics?.highestSimilarity ?? 'n/a'}`);
    }
    outcomes.forEach(outcome => {
      console.log(`  [${outcome.platform}] ${outcome.status}${outcome.url ? ' → ' + outcome.url : ''}${outcome.error ? ' — ' + outcome.error : ''}`);
    });

    if (requiredFailures.length) {
      console.error(`[pipeline] Required publisher failure: ${requiredFailures.join(', ')}`);
      results.push({
        success: false,
        stage: 'publishing',
        error: `Required publisher failure: ${requiredFailures.join(', ')}`,
        post: record
      });
      continue;
    }

    results.push({ success: true, post: record });
  }

  return results;
}

module.exports = { runContentPipeline, requiredPlatforms };
