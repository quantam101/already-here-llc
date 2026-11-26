/**
 * YouTube search video campaign plan for Already Here LLC.
 *
 * Idea: put a short Already Here video at the top of YouTube search results
 * (Google Ads "in-feed video ads", goal "Product and brand consideration",
 * cost-per-view bidding) for the exact phrases MSPs, Phoenix businesses and
 * field techs type, and send the viewers who click through to a landing page
 * that is built for that one audience.
 *
 * This module is pure and vendor-neutral: it holds the plan, validates it
 * against the in-feed asset limits, builds tracked landing URLs and renders a
 * launch sheet. It never talks to Google Ads. Spending money is an
 * `any_cost` action in approvals/policy.yaml, so every lane ships with
 * `launchApproved: false` and the validator refuses to call a lane
 * launch-ready until a person flips it.
 *
 * Asset limits below come from Google Ads Help, "In-feed video ads"
 * (support.google.com/google-ads/answer/6227733), read 2026-11-26:
 *   - headline: 100 characters max; text past 25 may be cut on some devices
 *   - description: up to 2 lines, 35 characters max each
 *   - views only count for videos 10 seconds or longer
 *   - video must be public or unlisted on YouTube
 *   - charged when a viewer clicks the thumbnail, or an autoplay view runs
 *     10 seconds (or the whole ad if shorter)
 */

export const IN_FEED_LIMITS = {
  headlineMax: 100,
  headlineSafe: 25,
  descriptionLines: 2,
  descriptionLineMax: 35,
  minVideoSeconds: 10
} as const;

export const CAMPAIGN_SOURCE = 'youtube';
export const CAMPAIGN_MEDIUM = 'video_infeed';

export type VideoLaneId = 'msp-smart-hands' | 'phoenix-business-it' | 'field-tech-recruiting';

export interface VideoScriptBeat {
  /** Seconds from the start of the video. */
  at: number;
  /** What is on screen. */
  shot: string;
  /** What is said or shown as text. */
  line: string;
}

export interface VideoLane {
  id: VideoLaneId;
  /** Internal name, also used as utm_campaign. */
  campaignName: string;
  audience: string;
  /** Who the lane is for, in one line, shown on the landing page. */
  promise: string;
  /** Phrases people type into YouTube search that this lane should answer. */
  searchPhrases: string[];
  /** Phrases that would waste views on the wrong people. */
  excludedPhrases: string[];
  locations: string[];
  headline: string;
  /** Exactly two lines. */
  description: [string, string];
  script: {
    title: string;
    lengthSeconds: number;
    beats: VideoScriptBeat[];
  };
  /** Path on this site the ad links to. */
  landingPath: string;
  /** Where the landing page sends someone who is ready to act. */
  conversionPath: string;
  /** Proposed spend, in USD. Nothing is spent until launchApproved is true. */
  proposedDailyBudgetUsd: number;
  /** Highest cost-per-view to bid, in USD. */
  maxCpvUsd: number;
  /** Set to true only after the owner approves the spend for this lane. */
  launchApproved: boolean;
  /** YouTube video ID once the video is uploaded (public or unlisted). */
  youtubeVideoId: string | null;
}

const PHOENIX_VALLEY = [
  'Phoenix, AZ',
  'Glendale, AZ',
  'Peoria, AZ',
  'Scottsdale, AZ',
  'Tempe, AZ',
  'Mesa, AZ',
  'Chandler, AZ',
  'Gilbert, AZ'
];

export const youtubeVideoLanes: VideoLane[] = [
  {
    id: 'msp-smart-hands',
    campaignName: 'yt_msp_smart_hands_phx',
    audience: 'MSPs, OEM service partners and national vendors who need a tech onsite in Arizona',
    promise: 'Your Phoenix-area smart hands, dispatched and closed out the way your NOC expects.',
    searchPhrases: [
      'smart hands phoenix',
      'onsite it technician phoenix',
      'field service technician arizona',
      'msp field tech subcontractor',
      'data center smart hands arizona',
      'break fix technician phoenix',
      'it dispatch technician near phoenix'
    ],
    excludedPhrases: ['jobs', 'salary', 'how to become', 'free', 'diy'],
    locations: ['United States'],
    headline: 'Phoenix smart hands, MSPs',
    description: ['Onsite techs across the Valley', 'Dispatch, fix, photo closeout'],
    script: {
      title: 'Your tech is already here: Phoenix smart hands in 30 seconds',
      lengthSeconds: 30,
      beats: [
        { at: 0, shot: 'Tech walking into a server room, badge visible', line: 'Your ticket is in Phoenix. Your team is not.' },
        { at: 4, shot: 'Close-up: rack, labeled patch cables', line: 'Already Here puts a tech onsite for the work remote hands cannot close.' },
        { at: 10, shot: 'Quick cuts: drive swap, AP mount, POS swap', line: 'Smart hands, break/fix, network and rollout recovery.' },
        { at: 18, shot: 'Phone showing closeout photos and notes', line: 'You get photos, serials and notes before we leave the site.' },
        { at: 24, shot: 'Logo and phone number on screen', line: 'Send us the ticket. We are already here.' }
      ]
    },
    landingPath: '/video/msp-smart-hands',
    conversionPath: '/rfq',
    proposedDailyBudgetUsd: 10,
    maxCpvUsd: 0.1,
    launchApproved: false,
    youtubeVideoId: null
  },
  {
    id: 'phoenix-business-it',
    campaignName: 'yt_business_it_phx',
    audience: 'Phoenix-area offices, retail, warehouses and property managers with an IT or network problem onsite',
    promise: 'Network, Wi-Fi, cabling and equipment problems fixed onsite by a Phoenix team.',
    searchPhrases: [
      'business wifi installation phoenix',
      'office network cabling phoenix',
      'commercial it support phoenix',
      'pos system install arizona',
      'security camera install business phoenix',
      'it technician for small business phoenix'
    ],
    excludedPhrases: ['jobs', 'salary', 'course', 'certification', 'home', 'diy'],
    locations: PHOENIX_VALLEY,
    headline: 'Onsite IT, Phoenix Valley',
    description: ['Wi-Fi, cabling, POS, cameras', 'Valley techs, written closeout'],
    script: {
      title: 'Business Wi-Fi or network down in Phoenix? Watch this first',
      lengthSeconds: 30,
      beats: [
        { at: 0, shot: 'Frustrated store manager, card reader spinning', line: 'Wi-Fi dropping, POS offline, cameras dark?' },
        { at: 4, shot: 'Tech arriving at a storefront in the Valley', line: 'Already Here sends a Phoenix tech to your site.' },
        { at: 10, shot: 'Cuts: AP install, cable test, camera aim', line: 'Wi-Fi, cabling, POS and camera work for businesses.' },
        { at: 18, shot: 'Tech handing over a one-page closeout', line: 'You get a written closeout of what was done.' },
        { at: 24, shot: 'Logo, phone number, "Request a site visit"', line: 'Tell us what is broken. We are already here.' }
      ]
    },
    landingPath: '/video/phoenix-business-it',
    conversionPath: '/rfq',
    proposedDailyBudgetUsd: 10,
    maxCpvUsd: 0.08,
    launchApproved: false,
    youtubeVideoId: null
  },
  {
    id: 'field-tech-recruiting',
    campaignName: 'yt_field_tech_recruiting',
    audience: 'Independent IT field techs and small low-voltage shops looking for 1099 work',
    promise: 'Steady 1099 field work for techs who show up, fix it and document it.',
    searchPhrases: [
      'field tech 1099 work',
      'independent it field technician',
      'field service technician 1099',
      'smart hands technician work',
      'low voltage subcontractor work',
      'it contractor side work'
    ],
    excludedPhrases: ['w2', 'internship', 'free course', 'certification exam'],
    locations: ['United States'],
    headline: '1099 field tech work',
    description: ['Smart hands, POS, network jobs', 'Apply once, get matched'],
    script: {
      title: 'Field techs: how we keep 1099 techs busy',
      lengthSeconds: 30,
      beats: [
        { at: 0, shot: 'Tech in a van, phone buzzing with a work order', line: 'Tired of chasing one-off tickets?' },
        { at: 4, shot: 'Map with pins near the tech', line: 'Already Here matches 1099 field techs to work in their area.' },
        { at: 10, shot: 'Cuts: rack work, POS swap, AP mount', line: 'Smart hands, POS, network and cabling jobs.' },
        { at: 18, shot: 'Phone: short application form', line: 'Apply once with your coverage area and skills.' },
        { at: 24, shot: 'Logo, "Join the technician network"', line: 'Show up, fix it, document it. We will keep you working.' }
      ]
    },
    landingPath: '/video/field-tech-recruiting',
    conversionPath: '/technician-network',
    proposedDailyBudgetUsd: 5,
    maxCpvUsd: 0.06,
    launchApproved: false,
    youtubeVideoId: null
  }
];

export function getVideoLane(id: string): VideoLane | undefined {
  return youtubeVideoLanes.find((lane) => lane.id === id);
}

export interface LaneAudit {
  id: string;
  errors: string[];
  warnings: string[];
  /** True only when there are no errors, a video is attached and spend is approved. */
  launchReady: boolean;
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const SAFE_PATH = /^\/[a-z0-9\-/]*$/;

export function auditVideoLane(lane: VideoLane): LaneAudit {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!lane.headline.trim()) errors.push('headline is empty');
  if (lane.headline.length > IN_FEED_LIMITS.headlineMax) {
    errors.push(`headline is ${lane.headline.length} chars, max ${IN_FEED_LIMITS.headlineMax}`);
  } else if (lane.headline.length > IN_FEED_LIMITS.headlineSafe) {
    warnings.push(`headline is ${lane.headline.length} chars and may be cut after ${IN_FEED_LIMITS.headlineSafe} on some devices`);
  }

  if (lane.description.length !== IN_FEED_LIMITS.descriptionLines) {
    errors.push(`description must have ${IN_FEED_LIMITS.descriptionLines} lines`);
  }
  lane.description.forEach((line, index) => {
    if (!line.trim()) errors.push(`description line ${index + 1} is empty`);
    if (line.length > IN_FEED_LIMITS.descriptionLineMax) {
      errors.push(`description line ${index + 1} is ${line.length} chars, max ${IN_FEED_LIMITS.descriptionLineMax}`);
    }
  });

  if (lane.script.lengthSeconds < IN_FEED_LIMITS.minVideoSeconds) {
    errors.push(`video is ${lane.script.lengthSeconds}s; views only count at ${IN_FEED_LIMITS.minVideoSeconds}s or longer`);
  }
  const beatTimes = lane.script.beats.map((beat) => beat.at);
  if (beatTimes.some((time, index) => index > 0 && time <= beatTimes[index - 1])) {
    errors.push('script beats must be in time order');
  }
  if (beatTimes.some((time) => time < 0 || time >= lane.script.lengthSeconds)) {
    errors.push('script beats must fall inside the video length');
  }

  if (lane.searchPhrases.length < 3) errors.push('need at least 3 search phrases');
  const lowerSearch = new Set(lane.searchPhrases.map((phrase) => phrase.toLowerCase()));
  if (lowerSearch.size !== lane.searchPhrases.length) errors.push('search phrases have duplicates');
  for (const excluded of lane.excludedPhrases) {
    if (lane.searchPhrases.some((phrase) => phrase.toLowerCase().split(/\s+/).includes(excluded.toLowerCase()))) {
      errors.push(`search phrase contains excluded word "${excluded}"`);
    }
  }
  if (lane.locations.length === 0) errors.push('no locations set');

  for (const [name, path] of [['landingPath', lane.landingPath], ['conversionPath', lane.conversionPath]] as const) {
    if (!SAFE_PATH.test(path) || path.includes('//')) errors.push(`${name} must be a plain site path`);
  }

  if (!(lane.proposedDailyBudgetUsd > 0)) errors.push('proposed daily budget must be above 0');
  if (!(lane.maxCpvUsd > 0)) errors.push('max cost-per-view must be above 0');

  if (lane.youtubeVideoId !== null && !YOUTUBE_ID.test(lane.youtubeVideoId)) {
    errors.push('youtubeVideoId is not an 11-character YouTube ID');
  }
  if (lane.youtubeVideoId === null) warnings.push('no video uploaded yet');
  if (!lane.launchApproved) warnings.push('spend not approved yet (any_cost needs owner approval)');

  return {
    id: lane.id,
    errors,
    warnings,
    launchReady: errors.length === 0 && lane.youtubeVideoId !== null && lane.launchApproved
  };
}

export function auditAllVideoLanes(lanes: VideoLane[] = youtubeVideoLanes): LaneAudit[] {
  const ids = new Set<string>();
  const audits = lanes.map((lane) => {
    const audit = auditVideoLane(lane);
    if (ids.has(lane.id)) audit.errors.push('duplicate lane id');
    ids.add(lane.id);
    return audit;
  });
  return audits;
}

/** The URL to paste into the ad. utm_content tells which video/version drove the visit. */
export function buildLandingUrl(origin: string, lane: VideoLane, content = 'v1'): string {
  const url = new URL(lane.landingPath, origin);
  url.searchParams.set('utm_source', CAMPAIGN_SOURCE);
  url.searchParams.set('utm_medium', CAMPAIGN_MEDIUM);
  url.searchParams.set('utm_campaign', lane.campaignName);
  url.searchParams.set('utm_content', content.replace(/[^a-z0-9_-]/gi, '').slice(0, 40) || 'v1');
  return url.toString();
}

const PASS_THROUGH_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid'] as const;

/**
 * Carry ad attribution from the landing page to the form page, so the RFQ or
 * applicant form can record which video brought the lead in.
 */
export function buildConversionHref(lane: VideoLane, incoming: Record<string, string | string[] | undefined>): string {
  const params = new URLSearchParams();
  for (const key of PASS_THROUGH_PARAMS) {
    const raw = incoming[key];
    const value = (Array.isArray(raw) ? raw[0] : raw)?.trim();
    if (value && /^[A-Za-z0-9_.-]{1,120}$/.test(value)) params.set(key, value);
  }
  if (!params.has('utm_source')) params.set('utm_source', CAMPAIGN_SOURCE);
  if (!params.has('utm_campaign')) params.set('utm_campaign', lane.campaignName);
  return `${lane.conversionPath}?${params.toString()}`;
}

export function monthlyCeilingUsd(lane: VideoLane, days = 30): number {
  return Math.round(lane.proposedDailyBudgetUsd * days * 100) / 100;
}

function csvCell(value: string | number | boolean | null): string {
  const text = value === null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** One row per lane, for entering the campaign by hand in Google Ads. */
export function renderLaunchSheetCsv(origin: string, lanes: VideoLane[] = youtubeVideoLanes): string {
  const header = [
    'campaign', 'goal', 'ad_format', 'bidding', 'max_cpv_usd', 'proposed_daily_budget_usd', 'monthly_ceiling_usd',
    'locations', 'youtube_search_phrases', 'excluded_words', 'headline', 'description_1', 'description_2',
    'video_id', 'final_url', 'launch_approved'
  ];
  const rows = lanes.map((lane) => [
    lane.campaignName,
    'Product and brand consideration',
    'In-feed video ad',
    'Target CPV',
    lane.maxCpvUsd,
    lane.proposedDailyBudgetUsd,
    monthlyCeilingUsd(lane),
    lane.locations.join('; '),
    lane.searchPhrases.join('; '),
    lane.excludedPhrases.join('; '),
    lane.headline,
    lane.description[0],
    lane.description[1],
    lane.youtubeVideoId,
    buildLandingUrl(origin, lane),
    lane.launchApproved
  ].map(csvCell).join(','));
  return [header.join(','), ...rows].join('\n') + '\n';
}

/** Shot list and script per lane, for filming on a phone. */
export function renderShootSheetMarkdown(lanes: VideoLane[] = youtubeVideoLanes): string {
  const parts: string[] = ['# YouTube video shoot sheet', ''];
  for (const lane of lanes) {
    parts.push(`## ${lane.script.title}`, '');
    parts.push(`Lane: ${lane.id} | Length: ${lane.script.lengthSeconds}s | For: ${lane.audience}`, '');
    parts.push('| Time | Shot | Line |', '| --- | --- | --- |');
    for (const beat of lane.script.beats) {
      parts.push(`| 0:${String(beat.at).padStart(2, '0')} | ${beat.shot} | ${beat.line} |`);
    }
    parts.push('');
  }
  return parts.join('\n');
}
