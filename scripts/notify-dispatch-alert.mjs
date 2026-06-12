#!/usr/bin/env node

/**
 * Already Here LLC dispatch/revenue alert bridge.
 *
 * Sends the same operational alert to Slack and/or Zapier using webhook URLs
 * stored in GitHub Actions secrets. No secret values are logged or hardcoded.
 */

const args = parseArgs(process.argv.slice(2));

const payload = {
  event: args.event || process.env.ALERT_EVENT || 'dispatch_partner_alert',
  title: args.title || process.env.ALERT_TITLE || 'Already Here LLC Dispatch Alert',
  status: normalizeStatus(args.status || process.env.ALERT_STATUS || 'info'),
  grade: args.grade || process.env.ALERT_GRADE || '',
  priority: args.priority || process.env.ALERT_PRIORITY || 'normal',
  summary: args.summary || process.env.ALERT_SUMMARY || '',
  recommendedAction: args.action || process.env.ALERT_ACTION || '',
  sourceUrl: args.sourceUrl || process.env.ALERT_SOURCE_URL || '',
  source: args.source || process.env.ALERT_SOURCE || 'github-actions',
  repository: process.env.GITHUB_REPOSITORY || '',
  ref: process.env.GITHUB_REF_NAME || process.env.GITHUB_REF || '',
  sha: process.env.GITHUB_SHA || '',
  runUrl: buildRunUrl(),
  createdAt: new Date().toISOString(),
};

const targets = [
  {
    name: 'slack',
    url: process.env.SLACK_WEBHOOK_URL,
    body: buildSlackPayload(payload),
  },
  {
    name: 'zapier',
    url: process.env.ZAPIER_WEBHOOK_URL,
    body: payload,
  },
].filter((target) => Boolean(target.url));

if (targets.length === 0) {
  console.log('No notification endpoint configured. Add SLACK_WEBHOOK_URL and/or ZAPIER_WEBHOOK_URL as GitHub Actions secrets.');
  process.exit(0);
}

const results = await Promise.allSettled(targets.map(sendWebhook));
const failures = results.filter((result) => result.status === 'rejected');

for (const result of results) {
  if (result.status === 'fulfilled') {
    console.log(`Notification sent through ${result.value}.`);
  } else {
    console.error(result.reason?.message || result.reason);
  }
}

if (failures.length > 0 && process.env.REQUIRE_NOTIFICATION_DELIVERY === 'true') {
  process.exit(1);
}

async function sendWebhook(target) {
  const response = await fetch(target.url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'already-here-llc-dispatch-alert/1.0',
    },
    body: JSON.stringify(target.body),
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => '');
    throw new Error(`${target.name} notification failed with HTTP ${response.status}${responseText ? `: ${responseText.slice(0, 300)}` : ''}`);
  }

  return target.name;
}

function buildSlackPayload(data) {
  const fields = [
    data.grade && { type: 'mrkdwn', text: `*Grade*\n${data.grade}` },
    data.priority && { type: 'mrkdwn', text: `*Priority*\n${data.priority}` },
    data.status && { type: 'mrkdwn', text: `*Status*\n${data.status}` },
    data.repository && { type: 'mrkdwn', text: `*Repository*\n${data.repository}` },
  ].filter(Boolean);

  const textLines = [
    `*${data.title}*`,
    data.summary,
    data.recommendedAction ? `Action: ${data.recommendedAction}` : '',
    data.sourceUrl ? `Source: ${data.sourceUrl}` : '',
    data.runUrl ? `Run: ${data.runUrl}` : '',
  ].filter(Boolean);

  return {
    text: `${data.title}${data.summary ? ` — ${data.summary}` : ''}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: textLines.join('\n'),
        },
      },
      ...(fields.length > 0 ? [{ type: 'section', fields }] : []),
    ],
  };
}

function buildRunUrl() {
  if (!process.env.GITHUB_SERVER_URL || !process.env.GITHUB_REPOSITORY || !process.env.GITHUB_RUN_ID) {
    return '';
  }

  return `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;
}

function normalizeStatus(status) {
  return String(status).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-') || 'info';
}

function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith('--')) continue;

    const [rawKey, inlineValue] = current.slice(2).split('=');
    const key = rawKey.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    const nextValue = argv[index + 1];

    if (inlineValue !== undefined) {
      parsed[key] = inlineValue;
    } else if (nextValue && !nextValue.startsWith('--')) {
      parsed[key] = nextValue;
      index += 1;
    } else {
      parsed[key] = 'true';
    }
  }

  return parsed;
}
