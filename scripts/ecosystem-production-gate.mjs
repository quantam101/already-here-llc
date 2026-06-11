const requiredUrls = [
  'https://www.alreadyherellc.com/',
  'https://www.alreadyherellc.com/dispatch',
  'https://www.alreadyherellc.com/api/health',
  'https://www.alreadyherellc.com/api/runtime/status',
  'https://www.alreadyherellc.com/api/revenue-mesh'
];

const optionalUrls = [
  process.env.PROFITENGINE_HEALTH_URL,
  process.env.TOKENFORGE_HEALTH_URL,
  process.env.FIELD_NETWORK_DASHBOARD_URL
].filter(Boolean);

async function checkUrl(url, required = true) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { 'user-agent': 'already-here-ecosystem-gate/1.0' } });
    const ok = response.status >= 200 && response.status < 400;
    if (!ok && required) throw new Error(`${url} returned HTTP ${response.status}`);
    console.log(`${ok ? 'PASS' : 'WARN'} ${url} HTTP ${response.status}`);
    return ok;
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const failures = [];

  for (const url of requiredUrls) {
    try {
      await checkUrl(url, true);
    } catch (error) {
      failures.push(error.message);
    }
  }

  for (const url of optionalUrls) {
    try {
      await checkUrl(url, false);
    } catch (error) {
      console.warn(`WARN ${error.message}`);
    }
  }

  if (failures.length) {
    console.error('Ecosystem production gate failed:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log('Ecosystem production gate passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
