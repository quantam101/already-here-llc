function stripTags(value) {
  return String(value ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

const XML_ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" };

function decodeXml(value) {
  return String(value ?? '').replace(/&(?:amp|lt|gt|quot|apos);/g, (entity) => XML_ENTITIES[entity] ?? entity);
}

function tagValue(block, tagName) {
  const match = block.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
  return decodeXml(stripTags(match?.[1] ?? ''));
}

export function approvedRssSources(sourcesConfig) {
  return sourcesConfig.sources.filter((source) => source.type === 'rss' && source.allowed_use === 'public_rss');
}

export function parseRss(xml, sourceId) {
  const itemBlocks = [...String(xml).matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map((match) => match[1]);

  return itemBlocks.map((item) => ({
    sourceId,
    title: tagValue(item, 'title'),
    description: tagValue(item, 'description'),
    evidenceUrl: tagValue(item, 'link'),
    publishedAt: tagValue(item, 'pubDate'),
    intakeChannel: 'rss'
  }));
}

export function filterRssItems(items, radarConfig) {
  const includeTerms = radarConfig.includeTerms.map((term) => term.toLowerCase());
  const excludeTerms = radarConfig.excludeTerms.map((term) => term.toLowerCase());

  return items.filter((item) => {
    const haystack = `${item.title} ${item.description}`.toLowerCase();
    const included = includeTerms.length === 0 || includeTerms.some((term) => haystack.includes(term));
    const excluded = excludeTerms.some((term) => haystack.includes(term));
    return included && !excluded;
  });
}

export async function fetchRssLeads(source, options = {}) {
  if (source.type !== 'rss' || source.allowed_use !== 'public_rss') {
    throw new Error(`Source ${source.id} is not approved for RSS monitoring.`);
  }

  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new Error('A fetch implementation is required to monitor RSS sources.');
  }

  const response = await fetchImpl(source.url, {
    headers: {
      'user-agent': options.userAgent ?? process.env.LOCAL_REVENUE_RADAR_USER_AGENT ?? 'AlreadyHereLocalRevenueRadar/1.0'
    }
  });

  if (!response.ok) {
    throw new Error(`RSS fetch failed for ${source.id}: ${response.status}`);
  }

  return parseRss(await response.text(), source.id);
}

export async function monitorRssSources(sources, radarConfig, options = {}) {
  const batches = await Promise.all(sources.map((source) => fetchRssLeads(source, options)));
  return filterRssItems(batches.flat(), radarConfig);
}
