import { canonicalId, canonicalSlug, normalizeEmail, normalizePhone } from './canonical-ids';
import type { DatabaseReadyWrite } from './canonical-store';

export type WorkerPath = '1099_contractor' | 'employee' | 'either' | 'partner_company';

export interface TechnicianInput {
  fullName: string;
  email: string;
  phone?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  workerPath: WorkerPath | string;
  workLanes: string[];
  skills: string;
  certifications?: string;
  tools?: string;
  availability: string;
  travelRadiusMiles: number;
  transportation: string;
  yearsExperience?: number;
  hourlyRate?: string;
  source?: string;
  sourceId?: string;
  submittedAt?: string;
  consentContact?: boolean;
  consentData?: boolean;
  consentTruth?: boolean;
}

export interface TechnicianProfile {
  id: string;
  contact_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  worker_path: string;
  work_lanes: string[];
  skills_text: string;
  certifications_text: string;
  tools_text: string;
  availability_text: string;
  travel_radius_miles: number;
  transportation: string;
  years_experience: number;
  hourly_rate: string | null;
  status: 'received' | 'screening' | 'qualified' | 'approved' | 'do_not_dispatch';
  dispatch_readiness_score: number;
  source: string;
  source_id: string | null;
  submitted_at: string;
  created_at: string;
  updated_at: string;
}

export interface SkillRecord {
  id: string;
  skill_name: string;
  normalized_name: string;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface TechnicianSkillRecord {
  id: string;
  technician_id: string;
  skill_id: string;
  proficiency: 'primary' | 'secondary' | 'interest';
  evidence_text: string;
  created_at: string;
  updated_at: string;
}

export interface CertificationRecord {
  id: string;
  technician_id: string;
  certification_name: string;
  issuer?: string | null;
  expiration?: string | null;
  verification_status: 'unverified' | 'pending' | 'verified';
  created_at: string;
  updated_at: string;
}

export interface AvailabilityRecord {
  id: string;
  technician_id: string;
  availability_text: string;
  same_day_available: boolean;
  weekend_available: boolean;
  overnight_available: boolean;
  travel_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkOrderRequirement {
  state: string;
  city?: string;
  skillKeywords: string[];
  maxRateCents?: number;
  certificationKeywords?: string[];
  sameDay?: boolean;
  weekend?: boolean;
  overnight?: boolean;
  travelOk?: boolean;
  requireReliableTransport?: boolean;
}

export interface TechnicianMatch {
  technician: TechnicianProfile;
  rank: number;
  fitScore: number;
  hardFiltersPass: boolean;
  explanation: string[];
}

const SKILL_TAXONOMY: { name: string; category: string; aliases: string[] }[] = [
  { name: 'smart_hands', category: 'field_operations', aliases: ['smart hands', 'remote hands', 'remote-hands', 'hands support'] },
  { name: 'network', category: 'network', aliases: ['network', 'router', 'switch', 'access point', 'ap ', 'wi-fi', 'wireless', 'sd-wan'] },
  { name: 'pos', category: 'retail', aliases: ['pos', 'printer', 'kiosk', 'scanner', 'payment device'] },
  { name: 'low_voltage', category: 'low_voltage', aliases: ['low-voltage', 'low voltage', 'cabling', 'cable tracing', 'signal check'] },
  { name: 'access_control', category: 'security', aliases: ['access control', 'camera', 'cctv', 'av ', 'display', 'video'] },
  { name: 'healthcare', category: 'healthcare', aliases: ['healthcare', 'medical device', 'clinical', 'hospital'] },
  { name: 'mechanic', category: 'vehicle', aliases: ['mechanic', 'vehicle', 'automotive', 'no-start', 'battery', 'brake', 'light-duty'] },
  { name: 'hauling', category: 'logistics', aliases: ['hauling', 'junk', 'dump', 'trailer', 'pickup', 'delivery', 'small move'] },
  { name: 'dispatch', category: 'operations', aliases: ['dispatch', 'project coordination', 'coordination', 'operations support'] },
  { name: 'administrative', category: 'operations', aliases: ['administrative', 'admin', 'clerical', 'data entry'] }
];

export function text(input: string | undefined): string {
  return (input ?? '').trim().toLowerCase();
}

export function normalizeWorkPath(value: string): WorkerPath | string {
  const t = text(value);
  if (t.includes('1099') || t.includes('contractor')) return '1099_contractor';
  if (t.includes('employee')) return 'employee';
  if (t.includes('either') || t.includes('open')) return 'either';
  if (t.includes('partner') || t.includes('company')) return 'partner_company';
  return t || 'unknown';
}

export function parseWorkLanes(lanes: string[] | undefined): string[] {
  const list = Array.isArray(lanes) ? lanes : [];
  return list.map((lane) => lane.trim()).filter(Boolean);
}

export function extractSkills(skillsText: string, workLanes: string[] = []): { skills: SkillRecord[]; technicianSkills: TechnicianSkillRecord[] } {
  const normalizedSkillsText = text(skillsText);
  const normalizedLanes = workLanes.map(text);
  const matched = new Set<string>();
  const foundSkills: SkillRecord[] = [];
  const technicianSkills: TechnicianSkillRecord[] = [];
  const now = new Date().toISOString();

  for (const tax of SKILL_TAXONOMY) {
    const combined = [...tax.aliases, ...normalizedLanes];
    const hit = combined.some((alias) => normalizedSkillsText.includes(alias) || normalizedLanes.includes(alias.toLowerCase()));
    if (hit) {
      matched.add(tax.name);
      const skillId = canonicalId('skill', tax.name);
      foundSkills.push({
        id: skillId,
        skill_name: tax.name.replace(/_/g, ' '),
        normalized_name: tax.name,
        category: tax.category,
        created_at: now,
        updated_at: now
      });
    }
  }

  for (const name of matched) {
    const tax = SKILL_TAXONOMY.find((s) => s.name === name);
    if (!tax) continue;
    const skillId = canonicalId('skill', tax.name);
    technicianSkills.push({
      id: canonicalId('techskill', tax.name),
      technician_id: '', // filled later
      skill_id: skillId,
      proficiency: normalizedLanes.some((lane) => tax.aliases.some((alias) => lane.includes(alias))) ? 'primary' : 'secondary',
      evidence_text: skillsText,
      created_at: now,
      updated_at: now
    });
  }

  return { skills: foundSkills, technicianSkills };
}

export function parseCertifications(certText: string | undefined): CertificationRecord[] {
  const raw = text(certText);
  if (!raw) return [];
  const now = new Date().toISOString();
  const entries: CertificationRecord[] = [];
  const lines = raw.split(/\n|,|;|\//);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    entries.push({
      id: canonicalId('cert', trimmed),
      technician_id: '', // filled later
      certification_name: trimmed,
      issuer: null,
      expiration: null,
      verification_status: 'unverified',
      created_at: now,
      updated_at: now
    });
  }
  return entries;
}

export function parseAvailability(availabilityText: string): AvailabilityRecord {
  const t = text(availabilityText);
  const now = new Date().toISOString();
  return {
    id: '', // filled later
    technician_id: '', // filled later
    availability_text: availabilityText,
    same_day_available: /same[- ]?day|today|asap|immediate|now/.test(t),
    weekend_available: /weekend|saturday|sunday/.test(t),
    overnight_available: /overnight|night|24[\s/-]?7|after hours|after-hours/.test(t),
    travel_available: /travel|nationwide|anywhere|willing to drive|out of state/.test(t),
    created_at: now,
    updated_at: now
  };
}

export function computeDispatchReadinessScore(profile: Partial<TechnicianProfile>): number {
  let score = 0;
  if (profile.travel_radius_miles && profile.travel_radius_miles >= 25) score += 10;
  if (profile.travel_radius_miles && profile.travel_radius_miles >= 50) score += 10;
  if (profile.years_experience && profile.years_experience >= 2) score += 15;
  if (profile.years_experience && profile.years_experience >= 5) score += 10;
  if ((profile.work_lanes?.length ?? 0) >= 1) score += 15;
  if ((profile.work_lanes?.length ?? 0) >= 2) score += 10;
  if (profile.skills_text && profile.skills_text.length >= 20) score += 10;
  if (profile.certifications_text && profile.certifications_text.length >= 5) score += 10;
  if (profile.tools_text && profile.tools_text.length >= 5) score += 10;
  if (profile.availability_text && profile.availability_text.length >= 10) score += 10;
  return Math.min(score, 100);
}

export function buildTechnicianRecords(input: TechnicianInput): DatabaseReadyWrite[] {
  const now = input.submittedAt ?? new Date().toISOString();
  const normalizedEmail = normalizeEmail(input.email);
  const normalizedPhone = normalizePhone(input.phone);
  const contactKey = normalizedEmail || normalizedPhone || canonicalSlug(input.fullName);
  const contactId = canonicalId('contact', contactKey);
  const techId = canonicalId('tech', contactKey);
  const orgName = `${input.fullName} (Technician)`;
  const orgId = canonicalId('org', canonicalSlug(orgName));

  const workLanes = parseWorkLanes(input.workLanes);
  const { skills, technicianSkills } = extractSkills(input.skills, workLanes);
  const certifications = parseCertifications(input.certifications);
  const availability = parseAvailability(input.availability);
  availability.id = canonicalId('availability', techId);
  availability.technician_id = techId;

  const profile: TechnicianProfile = {
    id: techId,
    contact_id: contactId,
    full_name: input.fullName.trim(),
    email: normalizedEmail,
    phone: normalizedPhone || null,
    city: input.city?.trim() || null,
    state: input.state?.trim().toUpperCase() || null,
    zip_code: input.zipCode?.trim() || null,
    worker_path: normalizeWorkPath(input.workerPath),
    work_lanes: workLanes,
    skills_text: input.skills.trim(),
    certifications_text: (input.certifications ?? '').trim(),
    tools_text: (input.tools ?? '').trim(),
    availability_text: input.availability.trim(),
    travel_radius_miles: Number.isFinite(input.travelRadiusMiles) ? Math.max(0, input.travelRadiusMiles) : 0,
    transportation: input.transportation.trim(),
    years_experience: Number.isFinite(input.yearsExperience) ? Math.max(0, input.yearsExperience!) : 0,
    hourly_rate: input.hourlyRate?.trim() || null,
    status: 'received',
    dispatch_readiness_score: 0,
    source: input.source ?? 'technician_intake',
    source_id: input.sourceId ?? null,
    submitted_at: now,
    created_at: now,
    updated_at: now
  };
  profile.dispatch_readiness_score = computeDispatchReadinessScore(profile);

  const writes: DatabaseReadyWrite[] = [
    {
      table: 'organizations',
      id: orgId,
      action: 'insert',
      record: {
        id: orgId,
        name: orgName,
        organization_type: 'individual_contractor',
        source: profile.source,
        source_id: profile.source_id,
        aliases: [input.fullName],
        service_area: [input.city, input.state].filter(Boolean).join(', ') || null,
        created_at: now,
        updated_at: now
      }
    },
    {
      table: 'contacts',
      id: contactId,
      action: 'insert',
      record: {
        id: contactId,
        organization_id: orgId,
        full_name: profile.full_name,
        email: profile.email,
        phone: profile.phone,
        source: profile.source,
        source_id: profile.source_id,
        channel: 'website',
        aliases: [profile.full_name, profile.email, profile.phone].filter(Boolean),
        role: 'technician_applicant',
        consent_status: input.consentContact && input.consentData && input.consentTruth ? 'consented' : 'unknown',
        created_at: now,
        updated_at: now
      }
    },
    {
      table: 'technicians',
      id: techId,
      action: 'insert',
      record: { ...profile, organization_id: orgId }
    }
  ];

  for (const skill of skills) {
    writes.push({ table: 'skills', id: skill.id, action: 'insert', record: skill as unknown as Record<string, unknown> });
  }

  for (const ts of technicianSkills) {
    ts.technician_id = techId;
    ts.id = canonicalId('techskill', techId, ts.skill_id);
    writes.push({ table: 'technician_skills', id: ts.id, action: 'insert', record: ts as unknown as Record<string, unknown> });
  }

  for (const cert of certifications) {
    cert.technician_id = techId;
    cert.id = canonicalId('cert', techId, cert.certification_name);
    writes.push({ table: 'certifications', id: cert.id, action: 'insert', record: cert as unknown as Record<string, unknown> });
  }

  writes.push({
    table: 'availability',
    id: availability.id,
    action: 'insert',
    record: availability as unknown as Record<string, unknown>
  });

  return writes;
}

export function matchTechnicians(
  technicians: TechnicianProfile[],
  requirements: WorkOrderRequirement
): TechnicianMatch[] {
  const reqSkills = requirements.skillKeywords.map((k) => k.toLowerCase());
  const reqCerts = (requirements.certificationKeywords ?? []).map((k) => k.toLowerCase());
  const state = requirements.state.toUpperCase();

  const results: TechnicianMatch[] = technicians.map((tech) => {
    const explanation: string[] = [];
    const hardFiltersPass = true;

    const techState = (tech.state ?? '').toUpperCase();
    const stateMatch = techState === state || techState === '' || state === '';
    if (!stateMatch) explanation.push('state mismatch');

    const skillsText = text(tech.skills_text + ' ' + tech.work_lanes.join(' '));
    const skillHits = reqSkills.filter((keyword) => skillsText.includes(keyword));
    if (skillHits.length > 0) explanation.push(`matched skills: ${skillHits.join(', ')}`);

    const certText = text(tech.certifications_text);
    const certHits = reqCerts.filter((keyword) => certText.includes(keyword));
    if (certHits.length > 0) explanation.push(`matched certifications: ${certHits.join(', ')}`);

    const availability = parseAvailability(tech.availability_text);
    if (requirements.sameDay && availability.same_day_available) explanation.push('same-day available');
    if (requirements.weekend && availability.weekend_available) explanation.push('weekend available');
    if (requirements.overnight && availability.overnight_available) explanation.push('overnight available');
    if (requirements.travelOk && availability.travel_available) explanation.push('travel available');

    if (requirements.requireReliableTransport) {
      const transport = text(tech.transportation);
      if (/reliable|vehicle|truck|trailer|own car|insured/.test(transport)) {
        explanation.push('reliable transport indicated');
      } else {
        explanation.push('transportation not clearly reliable');
      }
    }

    const skillScore = reqSkills.length > 0 ? (skillHits.length / reqSkills.length) * 40 : 20;
    const certScore = reqCerts.length > 0 ? (certHits.length / reqCerts.length) * 15 : 5;
    const availabilityScore =
      ((requirements.sameDay && availability.same_day_available ? 1 : 0) +
        (requirements.weekend && availability.weekend_available ? 1 : 0) +
        (requirements.overnight && availability.overnight_available ? 1 : 0) +
        (requirements.travelOk && availability.travel_available ? 1 : 0)) *
      5;
    const experienceScore = Math.min((tech.years_experience ?? 0) * 3, 20);
    const readinessScore = (tech.dispatch_readiness_score ?? 0) / 5;
    const transportScore = requirements.requireReliableTransport && /reliable|vehicle|truck|trailer|own car|insured/.test(text(tech.transportation)) ? 10 : 0;
    const rateScore = requirements.maxRateCents && tech.hourly_rate
      ? (() => {
          const m = text(tech.hourly_rate).match(/(\d+(?:\.\d+)?)/);
          const cents = m ? Number(m[1]) * 100 : Number.MAX_SAFE_INTEGER;
          return cents <= requirements.maxRateCents! ? 10 : 0;
        })()
      : 0;

    const fitScore = Math.min(
      skillScore + certScore + availabilityScore + experienceScore + readinessScore + transportScore + rateScore,
      100
    );

    return {
      technician: tech,
      rank: 0,
      fitScore,
      hardFiltersPass,
      explanation
    };
  });

  results.sort((a, b) => b.fitScore - a.fitScore);
  for (let i = 0; i < results.length; i++) {
    results[i].rank = i + 1;
  }
  return results;
}
