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

async function runContentPipeline(options = {}) {
  const count = options.count || parseInt(process.env.POSTS_PER_RUN || '1', 10);
  const results = [];

  for (let i = 0; i < count; i++) {
    let post;
    try {
      post = await generatePost(options.topic || null);
    } catch (err) {
      console.error(`[pipeline] Content generation failed (attempt ${i + 1}):`, err.message);
      results.push({ success: false, error: err.message });
      continue;
    }

    const publishResults = await Promise.allSettled([
      filesystemPublisher.publish(post),
      devtoPublisher.publish(post),
      githubPublisher.publish(post)
    ]);

    const outcomes = publishResults.map(r =>
      r.status === 'fulfilled' ? r.value : { platform: 'unknown', status: 'error', error: r.reason?.message }
    );

    const record = {
      slug: post.slug,
      title: post.title,
      date: post.date,
      niche: post.niche,
      generatedAt: new Date().toISOString(),
      publishers: outcomes
    };

    const db = loadPostsDb();
    db.unshift(record);
    savePostsDb(db.slice(0, 500)); // keep last 500 records

    console.log(`[pipeline] Completed: ${post.slug}`);
    outcomes.forEach(o => console.log(`  [${o.platform}] ${o.status}${o.url ? ' → ' + o.url : ''}${o.error ? ' — ' + o.error : ''}`));

    results.push({ success: true, post: record });
  }

  return results;
}

module.exports = { runContentPipeline };
