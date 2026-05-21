'use strict';

const fs = require('fs');
const path = require('path');

function getOutputDir() {
  const configured = process.env.CONTENT_OUTPUT_DIR || '../content/blog';
  return path.resolve(__dirname, '..', configured);
}

async function publish(post) {
  const outputDir = getOutputDir();

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filePath = path.join(outputDir, post.filename);

  // Skip if identical file already exists (idempotent)
  if (fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath, 'utf8');
    if (existing === post.content) {
      console.log(`[filesystem] Already published (unchanged): ${post.filename}`);
      return { platform: 'filesystem', status: 'skipped', path: filePath };
    }
  }

  fs.writeFileSync(filePath, post.content, 'utf8');
  console.log(`[filesystem] Published: ${filePath}`);
  return { platform: 'filesystem', status: 'published', path: filePath };
}

module.exports = { publish };
