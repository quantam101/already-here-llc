/**
 * Pure, vendor-neutral campaign deployment policy.
 *
 * A saved definition is portable across markets, hosting providers and clients.
 * This validation gates planning/configuration; each operational adapter must
 * independently enforce quota ceilings, consent, permissions and rate limits.
 * A declaration of "free tier" does not guarantee free usage in production.
 */
export type PortableAdapterMode = 'self_hosted' | 'manual' | 'free_tier' | 'disabled' | 'paid';

export interface PortableAdapter {
  mode: PortableAdapterMode;
  provider: string;
  recurringCostCeilingUsd: number;
  quotaLimit?: number;
  failClosedAtQuota?: boolean;
  automaticPaidOverages?: boolean;
}

export interface PortableCampaign {
  schemaVersion: 1;
  tenantId: string;
  campaignId: string;
  businessName: string;
  market: {
    country: string;
    region: string;
    locale: string;
    timeZone: string;
    currency: string;
  };
  publicOrigin: string;
  routes: {
    landing: string;
    lead: string;
    quote: string;
    guide: string;
  };
  policy: {
    monthlySubscriptionBudgetUsd: 0;
    paidAdaptersEnabled: false;
    explicitMarketingConsentRequired: true;
    customerApprovalForCharges: true;
    approvalRequiredForQuotesAndPayments: true;
  };
  adapters: Record<string, PortableAdapter>;
}

export interface PortabilityAudit {
  ok: boolean;
  errors: string[];
  urls: {
    landing: string;
    lead: string;
    quote: string;
    guide: string;
  } | null;
}

function pathSafe(value: string): boolean {
  return typeof value === 'string' && /^\/(?!\/)[A-Za-z0-9/_-]*(?:\?[A-Za-z0-9_=&%-]+)?$/.test(value)
    && !value.includes('..');
}

function validLocale(value: string): boolean {
  try {
    return typeof value === 'string' && Intl.getCanonicalLocales(value).length === 1;
  } catch {
    return false;
  }
}

function originSafe(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      ((url.protocol === 'https:' && url.hostname.length > 0) ||
       (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))
      && url.username === '' && url.password === '' && url.search === '' && url.hash === ''
      && url.pathname === '/' && url.port !== '0'
    );
  } catch {
    return false;
  }
}

export function auditPortableCampaign(config: PortableCampaign): PortabilityAudit {
  const errors: string[] = [];
  if (config.schemaVersion !== 1) errors.push('Unsupported campaign schema version.');
  for (const [field, value] of [
    ['tenantId', config.tenantId],
    ['campaignId', config.campaignId]
  ]) {
    if (typeof value !== 'string' || !/^[a-z][a-z0-9-]{1,62}$/.test(value)) {
      errors.push('Invalid ' + field + ' slug.');
    }
  }
  if (!config.businessName?.trim()) errors.push('Business display name is required.');

  const market = config.market;
  if (!market || !/^[A-Z]{2}$/.test(market.country) ||
      (typeof market.region !== 'string' || !/^[A-Za-z0-9-]{0,48}$/.test(market.region)) ||
      !validLocale(market.locale) ||
      !/^[A-Z]{3}$/.test(market.currency)) {
    errors.push('A valid country, region, locale, and currency are required.');
  }
  try {
    if (typeof market?.timeZone !== 'string' || !market.timeZone.trim()) throw new Error('Missing time zone');
    Intl.DateTimeFormat('en-US', { timeZone: market.timeZone }).format(0);
  } catch {
    errors.push('A valid IANA market time zone is required.');
  }

  if (!originSafe(config.publicOrigin)) errors.push('Public origin must use HTTPS (or local HTTP).');
  for (const [key, value] of Object.entries(config.routes || {})) {
    if (!pathSafe(value)) errors.push('Route "' + key + '" must be a safe relative path.');
  }
  for (const key of ['landing', 'lead', 'quote', 'guide']) {
    if (!config.routes?.[key as keyof PortableCampaign['routes']]) {
      errors.push('Required campaign route missing: ' + key);
    }
  }

  const policy = config.policy;
  if (!policy || policy.monthlySubscriptionBudgetUsd !== 0 || policy.paidAdaptersEnabled !== false ||
      policy.explicitMarketingConsentRequired !== true || policy.customerApprovalForCharges !== true ||
      policy.approvalRequiredForQuotesAndPayments !== true) {
    errors.push('Strict zero-spend, consent, and financial approval policy is mandatory.');
  }
  if (!config.adapters || Object.keys(config.adapters).length === 0) {
    errors.push('At least one explicit channel adapter must be configured.');
  } else {
    for (const [name, adapter] of Object.entries(config.adapters)) {
      if (!adapter || !['self_hosted', 'manual', 'free_tier', 'disabled', 'paid'].includes(adapter.mode) ||
          !adapter.provider?.trim() || adapter.recurringCostCeilingUsd !== 0 ||
          adapter.automaticPaidOverages === true || adapter.mode === 'paid') {
        errors.push('Adapter "' + name + '" cannot guarantee a zero-spend configuration.');
        continue;
      }
      if (adapter.mode === 'free_tier' &&
          (!Number.isSafeInteger(adapter.quotaLimit) || (adapter.quotaLimit ?? 0) < 1 ||
           adapter.failClosedAtQuota !== true || adapter.automaticPaidOverages !== false)) {
        errors.push('Free-tier adapter "' + name + '" requires a positive quota, disabled paid overages, and fail-closed behavior.');
      }
    }
  }

  if (errors.length) return { ok: false, errors, urls: null };
  const root = config.publicOrigin.replace(/\/$/, '');
  return {
    ok: true,
    errors: [],
    urls: {
      landing: root + config.routes.landing,
      lead: root + config.routes.lead,
      quote: root + config.routes.quote,
      guide: root + config.routes.guide
    }
  };
}
