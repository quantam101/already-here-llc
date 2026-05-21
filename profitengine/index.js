'use strict';

require('dotenv').config();

const express = require('express');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const scheduler = require('./scheduler');
const { runContentPipeline } = require('./pipeline');

const PORT = parseInt(process.env.PORT || '3000', 10);
const app = express();
app.use(express.json());

const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });
const generateLimiter = rateLimit({ windowMs: 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false });
app.use('/api/', apiLimiter);

// ── Health ──────────────────────────────────────────────────────────────────

function healthPayload() {
  return {
    status: 'healthy',
    service: 'profitengine',
    version: '1.0.0',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    checks: {
      groq: !!process.env.GROQ_API_KEY,
      github: !!(process.env.GITHUB_TOKEN && process.env.GITHUB_REPO_OWNER && process.env.GITHUB_REPO_NAME),
      devto: !!process.env.DEVTO_API_KEY
    }
  };
}

app.get('/api/health', (_req, res) => res.json(healthPayload()));
app.get('/api/status/health', (_req, res) => res.json(healthPayload()));

// ── Status ───────────────────────────────────────────────────────────────────

app.get('/api/status', (_req, res) => {
  const postsDb = path.join(__dirname, 'data', 'posts.json');
  let recentPosts = [];
  if (fs.existsSync(postsDb)) {
    try { recentPosts = JSON.parse(fs.readFileSync(postsDb, 'utf8')).slice(0, 5); } catch {}
  }

  const schedule = process.env.CONTENT_CRON_SCHEDULE || '0 7,19 * * *';
  res.json({
    service: 'profitengine',
    status: 'running',
    scheduler: { active: true, schedule },
    postsGenerated: recentPosts.length ? recentPosts[0].generatedAt : null,
    recentPosts: recentPosts.map(p => ({ slug: p.slug, date: p.date, niche: p.niche }))
  });
});

// ── Posts ────────────────────────────────────────────────────────────────────

app.get('/api/posts', (_req, res) => {
  const postsDb = path.join(__dirname, 'data', 'posts.json');
  if (!fs.existsSync(postsDb)) return res.json({ posts: [], total: 0 });
  try {
    const posts = JSON.parse(fs.readFileSync(postsDb, 'utf8'));
    res.json({ posts, total: posts.length });
  } catch {
    res.status(500).json({ error: 'Could not read posts database' });
  }
});

// ── Earnings ──────────────────────────────────────────────────────────────────
// Reads from data/earnings.json when present (written by platform connectors).
// Per revenue integrity policy, totals are unverified unless a connector sets verified: true.

app.get('/api/earnings', (_req, res) => {
  const earningsDb = path.join(__dirname, 'data', 'earnings.json');
  if (!fs.existsSync(earningsDb)) {
    return res.json({
      verified: false,
      total_usd: 0,
      currency: 'USD',
      sources: [],
      note: 'No earnings data yet. Configure a platform connector to populate.'
    });
  }
  try {
    const data = JSON.parse(fs.readFileSync(earningsDb, 'utf8'));
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Could not read earnings data' });
  }
});

// ── Manual trigger (POST /api/generate) ──────────────────────────────────────

app.post('/api/generate', generateLimiter, async (_req, res) => {
  try {
    const results = await runContentPipeline();
    res.json({ ok: true, results });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Boot ──────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[profitengine] Listening on port ${PORT}`);
  console.log(`[profitengine] GROQ_API_KEY: ${process.env.GROQ_API_KEY ? 'SET' : 'NOT SET — content generation will fail'}`);
  console.log(`[profitengine] GITHUB_TOKEN: ${process.env.GITHUB_TOKEN ? 'SET' : 'not set (optional)'}`);
  console.log(`[profitengine] DEVTO_API_KEY: ${process.env.DEVTO_API_KEY ? 'SET' : 'not set (optional)'}`);
  scheduler.start();
});

process.on('SIGTERM', () => {
  console.log('[profitengine] SIGTERM received — shutting down gracefully');
  scheduler.stop();
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  console.error('[profitengine] Unhandled rejection:', reason);
});
