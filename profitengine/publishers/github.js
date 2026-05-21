'use strict';

const axios = require('axios');

async function publish(post) {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo = process.env.GITHUB_REPO_NAME;
  const branch = process.env.GITHUB_BRANCH || 'main';

  if (!token || !owner || !repo) {
    console.log('[github] GITHUB_TOKEN/OWNER/REPO not set — skipping');
    return { platform: 'github', status: 'skipped', reason: 'missing config' };
  }

  const filePath = `posts/${post.filename}`;
  const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  // Check if file already exists to get its SHA (required for updates)
  let sha;
  try {
    const existing = await axios.get(apiBase, { headers, timeout: 15000 });
    sha = existing.data?.sha;
  } catch (err) {
    if (err.response?.status !== 404) {
      console.error(`[github] Check failed: ${err.message}`);
    }
  }

  const encoded = Buffer.from(post.content).toString('base64');
  const payload = {
    message: `feat(content): add ${post.filename}`,
    content: encoded,
    branch
  };
  if (sha) payload.sha = sha;

  try {
    const resp = await axios.put(apiBase, payload, { headers, timeout: 30000 });
    const url = resp.data?.content?.html_url || '';
    console.log(`[github] Published: ${url}`);
    return { platform: 'github', status: 'published', url };
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    console.error(`[github] Publish failed: ${msg}`);
    return { platform: 'github', status: 'error', error: msg };
  }
}

module.exports = { publish };
