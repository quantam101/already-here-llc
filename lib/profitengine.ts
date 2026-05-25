const PROFITENGINE_URL = process.env.PROFITENGINE_URL ?? process.env.NEXT_PUBLIC_PROFITENGINE_URL ?? '';
const PROFITENGINE_WEBHOOK_SECRET = process.env.PROFITENGINE_WEBHOOK_SECRET ?? '';

async function post(path: string, data: Record<string, unknown>): Promise<boolean> {
  if (!PROFITENGINE_URL || !PROFITENGINE_WEBHOOK_SECRET) return false;

  try {
    const res = await fetch(`${PROFITENGINE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PROFITENGINE_WEBHOOK_SECRET}`,
      },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function notifyBlogPost(blog: {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  date: string;
  category: string;
}): Promise<boolean> {
  return post('/api/webhooks/blog', {
    ...blog,
    url: `https://www.alreadyherellc.com/blog/${blog.slug}`,
    source: 'alreadyherellc.com',
  });
}

export function notifyDispatch(dispatch: {
  dispatchId: string;
  fullName: string;
  company: string;
  email: string;
  phone: string;
  siteCity: string;
  serviceType: string;
  message: string;
}): Promise<boolean> {
  return post('/api/webhooks/dispatch', {
    ...dispatch,
    source: 'alreadyherellc.com',
    submittedAt: new Date().toISOString(),
  });
}

export function notifyTraffic(event: {
  page: string;
  referrer: string;
  userAgent: string;
  timestamp?: string;
  sessionId?: string;
}): Promise<boolean> {
  return post('/api/webhooks/traffic', {
    ...event,
    timestamp: event.timestamp ?? new Date().toISOString(),
    sessionId: event.sessionId ?? '',
    source: 'alreadyherellc.com',
  });
}
