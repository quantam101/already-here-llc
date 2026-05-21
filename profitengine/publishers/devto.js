'use strict';

const axios = require('axios');

async function publish(post) {
  const apiKey = process.env.DEVTO_API_KEY;
  if (!apiKey) {
    console.log('[devto] DEVTO_API_KEY not set — skipping');
    return { platform: 'devto', status: 'skipped', reason: 'no api key' };
  }

  const tags = (post.niche || 'finance')
    .split(/[,\s]+/)
    .filter(Boolean)
    .slice(0, 4)
    .map(t => t.toLowerCase().replace(/[^a-z0-9]/g, ''));

  // Strip frontmatter from content for Dev.to
  const body = post.content.replace(/^---[\s\S]*?---\n\n?/, '').trim();

  try {
    const response = await axios.post(
      'https://dev.to/api/articles',
      {
        article: {
          title: post.title,
          body_markdown: body,
          published: true,
          tags,
          description: post.excerpt
        }
      },
      {
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const url = response.data?.url || '';
    console.log(`[devto] Published: ${url}`);
    return { platform: 'devto', status: 'published', url };
  } catch (err) {
    const msg = err.response?.data?.error || err.message;
    console.error(`[devto] Publish failed: ${msg}`);
    return { platform: 'devto', status: 'error', error: msg };
  }
}

module.exports = { publish };
