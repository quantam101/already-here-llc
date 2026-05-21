'use strict';

const Groq = require('groq-sdk');
const { getTodayTopic } = require('../config/topics');

const AMAZON_TAG = 'alreadyhere-20';

function buildSystemPrompt() {
  return `You are an expert content writer specializing in online income, digital entrepreneurship, and practical financial strategies. Write engaging, SEO-optimized blog posts in Markdown format.

Rules:
- Write 800-1200 words total
- Use ## for H2 headers, ### for H3
- Include actionable tips in bullet lists
- Naturally weave in 2-3 Amazon affiliate product links using format: [product name](https://www.amazon.com/s?k=QUERY&tag=${AMAZON_TAG}&linkCode=ll2)
- Do NOT include the frontmatter block — only the body content (from the first ## heading onward)
- Do not add any preamble like "Here is the article" or "Sure!"`;
}

function buildUserPrompt(topic, year) {
  const title = topic.title_template.replace('{year}', year);
  const desc = topic.description;
  return `Write a comprehensive blog post titled: "${title}"

Topic description: ${desc}
Keywords to use naturally: ${topic.keywords.map(k => k.replace('{year}', year)).join(', ')}

The post should:
1. Open with a hook that addresses reader pain points
2. Explain why this matters in ${year}
3. Cover 5-7 specific strategies with actionable details
4. Include real-world examples and data points where appropriate
5. Close with a motivating call to action

Write only the body content starting from the first ## heading.`;
}

async function generatePost(overrideTopic) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not set — content generation cannot run');
  }

  const groq = new Groq({ apiKey });
  const now = new Date();
  const year = now.getFullYear();
  const topic = overrideTopic || getTodayTopic(now);
  const titleText = topic.title_template.replace('{year}', year);
  const slugTitle = topic.niche.replace(/\s+/g, '-');
  const dateStr = now.toISOString().split('T')[0];
  const slug = `${dateStr}-best-${slugTitle}-strategies-${year}`;

  console.log(`[generator] Generating post: ${titleText}`);

  const completion = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: buildUserPrompt(topic, year) }
    ],
    temperature: 0.7,
    max_tokens: 2000
  });

  const body = completion.choices[0]?.message?.content?.trim();
  if (!body) throw new Error('Groq returned empty content');

  const excerpt = `Discover the best ${topic.niche} tips to boost your wealth in ${year}.`;
  const tags = topic.keywords.map(k => k.replace('{year}', year)).join(', ');

  const frontmatter = `---
title: ${titleText}
description: ${excerpt}
tags: ${tags}
date: ${dateStr}
niche: ${topic.niche}
---\n\n`;

  return {
    slug,
    filename: `${slug}.md`,
    title: titleText,
    date: dateStr,
    niche: topic.niche,
    excerpt,
    content: frontmatter + body
  };
}

module.exports = { generatePost };

// Direct execution for testing: node agents/content-generator.js
if (require.main === module) {
  require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
  generatePost()
    .then(post => {
      console.log('[generator] SUCCESS:', post.filename);
      console.log(post.content.slice(0, 300), '\n...');
    })
    .catch(err => {
      console.error('[generator] FAILED:', err.message);
      process.exit(1);
    });
}
