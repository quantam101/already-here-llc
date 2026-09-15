'use strict';

const Groq = require('groq-sdk');
const { getTodayTopic } = require('../config/topics');
const { validatePost, getRecentTitles } = require('../quality-gate');

const AMAZON_TAG = 'alreadyhere-20';
const MAX_GENERATION_ATTEMPTS = 3;

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90)
    .replace(/-+$/g, '');
}

function buildSystemPrompt() {
  return `You are the senior editor for Already Here LLC. Write useful, specific, trustworthy articles about digital entrepreneurship, practical business systems, technology, and income generation.

Editorial standard:
- Write 900-1400 words.
- Solve one clearly defined reader problem. Do not write a generic listicle unless a list is genuinely the best format.
- Tell the reader near the beginning what they will be able to do by the end.
- Give an executable workflow, checklist, decision framework, or worked hypothetical example.
- Explain important tradeoffs, costs, failure modes, or risks when relevant.
- Prefer concrete instructions over motivational filler.
- Never label a heading "Hook" or "Introduction". Headings must be reader-facing.
- Avoid canned AI phrases such as "untapped goldmine", "game-changer", "skyrocket", "new norm for forward-thinking businesses", and "turning data into dollars".
- NEVER invent statistics, market sizes, growth rates, user counts, earnings, survey results, quotations, partnerships, or company capabilities.
- If an exact current fact was not supplied in the prompt, either omit the number or describe the point qualitatively. Do not fabricate a source URL.
- Hypothetical calculations are allowed only when explicitly labeled as examples and when assumptions are shown.
- Use ## for H2 and ### for H3. Include useful bullets where they improve scanability.
- At most 2 relevant Amazon affiliate search links may be used, in this format: [product name](https://www.amazon.com/s?k=QUERY&tag=${AMAZON_TAG}&linkCode=ll2). Affiliate links are recommendations, never evidence for factual claims.
- Do not include Markdown frontmatter.
- Do not include a preamble such as "Here is the article".

Return exactly this structure:
TITLE: <specific SEO title, not a copy of a recent title>
EXCERPT: <one accurate sentence, 140-180 characters, no hype>
---ARTICLE---
## <first reader-facing heading>
<article body>`;
}

function buildUserPrompt(topic, year, recentTitles, retryFeedback = '') {
  const seedTitle = topic.title_template.replace('{year}', year);
  const recent = recentTitles.length
    ? recentTitles.map(title => `- ${title}`).join('\n')
    : '- None yet';

  return `Create a new article from this editorial brief.

Working-title seed: ${seedTitle}
Niche: ${topic.niche}
Reader: ${topic.reader || 'A practical small-business reader'}
Reader outcome: ${topic.outcome || topic.description}
Preferred format: ${topic.format || 'step-by-step practical guide'}
Topic brief: ${topic.description}
Keywords to use naturally: ${topic.keywords.map(k => k.replace('{year}', year)).join(', ')}
Year context: ${year}

Recent titles that MUST NOT be repeated or lightly reworded:
${recent}

Requirements:
1. Make the final title narrower and more useful than a generic "best strategies" headline.
2. Open with the reader's real situation, then state the practical outcome of the article.
3. Use concrete steps and decision criteria. If money math helps, use a clearly labeled hypothetical example with explicit assumptions.
4. Do not claim a platform supports a feature, marketplace relationship, price, market statistic, legal requirement, or current program unless that fact is supplied here. If unsure, tell the reader what to verify before acting.
5. End with a concise next-action checklist rather than generic encouragement.
${retryFeedback ? `\nThe previous draft failed editorial checks. Correct every item below:\n${retryFeedback}` : ''}`;
}

function parseDraft(raw) {
  const text = String(raw || '').trim();
  const match = text.match(/^TITLE:\s*(.+)\nEXCERPT:\s*(.+)\n---ARTICLE---\s*\n([\s\S]+)$/);
  if (!match) {
    throw new Error('Model response did not follow TITLE / EXCERPT / ---ARTICLE--- format');
  }
  const title = match[1].trim().replace(/^['"]|['"]$/g, '');
  const excerpt = match[2].trim().replace(/^['"]|['"]$/g, '');
  const body = match[3].trim();
  if (!title || !excerpt || !body) throw new Error('Generated draft is missing title, excerpt, or body');
  return { title, excerpt, body };
}

async function resolveGroqModel(groq) {
  const configured = process.env.GROQ_MODEL || process.env.GMAOS_GROQ_MODEL || '';
  const candidates = [
    configured,
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    'groq/compound',
    'groq/compound-mini',
    'llama-3.1-8b-instant'
  ].filter(Boolean);

  try {
    const models = await groq.models.list();
    const available = new Set((models.data || []).map(model => model.id));
    const selected = candidates.find(model => available.has(model));
    if (selected) {
      console.log(`[generator] Selected Groq model: ${selected}`);
      return selected;
    }
    throw new Error(`No supported text model available. Account models: ${[...available].join(', ')}`);
  } catch (error) {
    if (configured) {
      console.warn(`[generator] Could not enumerate Groq models; using configured model ${configured}: ${error.message}`);
      return configured;
    }
    console.warn(`[generator] Could not enumerate Groq models; falling back to openai/gpt-oss-120b: ${error.message}`);
    return 'openai/gpt-oss-120b';
  }
}

async function generatePost(overrideTopic) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not set — content generation cannot run');
  }

  const groq = new Groq({ apiKey });
  const model = await resolveGroqModel(groq);
  const now = new Date();
  const year = now.getFullYear();
  const topic = overrideTopic || getTodayTopic(now);
  const dateStr = now.toISOString().split('T')[0];
  const recentTitles = getRecentTitles(30);
  const maxAttempts = Number(process.env.CONTENT_MAX_ATTEMPTS || MAX_GENERATION_ATTEMPTS);
  let retryFeedback = '';
  let lastFailure = null;

  console.log(`[generator] Brief: ${topic.title_template.replace('{year}', year)}`);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const completion = await groq.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: buildUserPrompt(topic, year, recentTitles, retryFeedback) }
      ],
      temperature: 0.55,
      max_tokens: 3200
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) {
      lastFailure = { errors: ['Groq returned empty content'], warnings: [] };
      retryFeedback = '- Return a complete draft using the required output structure.';
      continue;
    }

    let draft;
    try {
      draft = parseDraft(raw);
    } catch (error) {
      lastFailure = { errors: [error.message], warnings: [] };
      retryFeedback = `- ${error.message}. Follow the exact required response structure.`;
      console.warn(`[generator] Draft ${attempt}/${maxAttempts} format failure: ${error.message}`);
      continue;
    }

    const slug = `${dateStr}-${slugify(draft.title)}`;
    const filename = `${slug}.md`;
    const tags = topic.keywords.map(k => k.replace('{year}', year)).join(', ');
    const frontmatter = `---\ntitle: ${JSON.stringify(draft.title)}\ndescription: ${JSON.stringify(draft.excerpt)}\ntags: ${JSON.stringify(tags)}\ndate: ${dateStr}\nniche: ${JSON.stringify(topic.niche)}\n---\n\n`;
    const post = {
      slug,
      filename,
      title: draft.title,
      date: dateStr,
      niche: topic.niche,
      excerpt: draft.excerpt,
      content: frontmatter + draft.body
    };

    const quality = validatePost(post);
    console.log(`[generator] Quality attempt ${attempt}/${maxAttempts}: ${quality.pass ? 'PASS' : 'FAIL'} score=${quality.score}`);
    quality.errors.forEach(error => console.warn(`  [quality:error] ${error}`));
    quality.warnings.forEach(warning => console.warn(`  [quality:warning] ${warning}`));

    if (quality.pass) {
      return { ...post, quality };
    }

    lastFailure = quality;
    retryFeedback = [
      ...quality.errors.map(error => `- ERROR: ${error}`),
      ...quality.warnings.map(warning => `- IMPROVE: ${warning}`)
    ].join('\n');
  }

  const details = lastFailure?.errors?.join(' | ') || 'Unknown editorial failure';
  throw new Error(`Content failed the quality gate after ${maxAttempts} attempts: ${details}`);
}

module.exports = {
  generatePost,
  resolveGroqModel,
  buildSystemPrompt,
  buildUserPrompt,
  parseDraft,
  slugify
};

if (require.main === module) {
  require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
  generatePost()
    .then(post => {
      console.log('[generator] SUCCESS:', post.filename, `score=${post.quality.score}`);
      console.log(post.content.slice(0, 400), '\n...');
    })
    .catch(err => {
      console.error('[generator] FAILED:', err.message);
      process.exit(1);
    });
}
