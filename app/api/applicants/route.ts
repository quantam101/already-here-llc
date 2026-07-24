import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const applicantFromEmail = 'Applicants <dispatch@alreadyherellc.com>';
const applicantMailbox = 'dispatch@alreadyherellc.com';
const acceptedResumeTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];
const maxResumeSize = 5 * 1024 * 1024;
const rateLimitWindowMs = 60_000;
const rateLimitMax = 4;
const rateLimit = new Map<string, { count: number; resetAt: number }>();

const requiredFields = [
  'fullName',
  'email',
  'phone',
  'city',
  'state',
  'workerPath',
  'skills',
  'availability',
  'travelRadiusMiles',
  'transportation',
  'consentContact',
  'consentData',
  'consentTruth'
];

const maxFieldLengths: Record<string, number> = {
  fullName: 120,
  email: 160,
  phone: 40,
  city: 120,
  state: 40,
  zipCode: 20,
  workerPath: 40,
  skills: 3000,
  certifications: 2000,
  tools: 2000,
  availability: 1000,
  transportation: 500,
  hourlyRate: 120
};

function getClientKey(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || 'unknown';
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const current = rateLimit.get(key);
  if (!current || current.resetAt <= now) {
    rateLimit.set(key, { count: 1, resetAt: now + rateLimitWindowMs });
    return false;
  }
  current.count += 1;
  return current.count > rateLimitMax;
}

function asCleanString(formData: FormData, field: string): string {
  const value = formData.get(field);
  return typeof value === 'string' ? value.trim() : '';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'resume';
}

function getResume(formData: FormData): File | null {
  const resume = formData.get('resume');
  return resume instanceof File && resume.size > 0 ? resume : null;
}

function generateApplicantId(): string {
  const stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return `APP-${stamp}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function validate(formData: FormData): string | null {
  if (asCleanString(formData, 'website')) return 'Submission rejected.';

  for (const field of requiredFields) {
    if (!asCleanString(formData, field)) return `Missing required field: ${field}`;
  }

  for (const [field, maxLength] of Object.entries(maxFieldLengths)) {
    if (asCleanString(formData, field).length > maxLength) return `${field} is too long.`;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(asCleanString(formData, 'email'))) return 'Invalid email address.';

  const workLanes = formData.getAll('workLanes').filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
  if (workLanes.length === 0) return 'Select at least one work lane.';

  const travelRadius = Number(asCleanString(formData, 'travelRadiusMiles'));
  if (!Number.isFinite(travelRadius) || travelRadius < 0 || travelRadius > 3000) return 'Travel radius is invalid.';

  const years = asCleanString(formData, 'yearsExperience');
  if (years) {
    const value = Number(years);
    if (!Number.isFinite(value) || value < 0 || value > 70) return 'Years of experience is invalid.';
  }

  const resume = getResume(formData);
  if (resume) {
    if (!acceptedResumeTypes.includes(resume.type)) return 'Resume must be PDF, DOC, or DOCX.';
    if (resume.size > maxResumeSize) return 'Resume must be 5 MB or smaller.';
  }

  return null;
}

function buildRecord(applicantId: string, formData: FormData) {
  const resume = getResume(formData);
  return {
    applicantId,
    status: 'received',
    source: 'website_applicant_form',
    submittedAt: new Date().toISOString(),
    fullName: asCleanString(formData, 'fullName'),
    email: asCleanString(formData, 'email'),
    phone: asCleanString(formData, 'phone'),
    city: asCleanString(formData, 'city'),
    state: asCleanString(formData, 'state'),
    zipCode: asCleanString(formData, 'zipCode'),
    workerPath: asCleanString(formData, 'workerPath'),
    workLanes: formData.getAll('workLanes').filter((value): value is string => typeof value === 'string').map((value) => value.trim()),
    skills: asCleanString(formData, 'skills'),
    certifications: asCleanString(formData, 'certifications'),
    tools: asCleanString(formData, 'tools'),
    availability: asCleanString(formData, 'availability'),
    travelRadiusMiles: Number(asCleanString(formData, 'travelRadiusMiles')),
    transportation: asCleanString(formData, 'transportation'),
    yearsExperience: asCleanString(formData, 'yearsExperience') ? Number(asCleanString(formData, 'yearsExperience')) : 0,
    hourlyRate: asCleanString(formData, 'hourlyRate'),
    preferredContact: 'email_or_phone',
    resume: resume ? {
      received: true,
      filename: sanitizeFilename(resume.name),
      mimeType: resume.type,
      sizeBytes: resume.size,
      delivery: 'attached_to_applicant_email'
    } : {
      received: false,
      delivery: 'none'
    },
    consent: {
      contact: asCleanString(formData, 'consentContact') === 'true',
      dataProcessing: asCleanString(formData, 'consentData') === 'true',
      truthfulInformation: asCleanString(formData, 'consentTruth') === 'true'
    },
    review: {
      fitScore: 0,
      reviewedBy: '',
      reviewedAt: '',
      notes: '',
      nextAction: 'screen applicant',
      nextFollowUpDate: ''
    }
  };
}

function rows(record: ReturnType<typeof buildRecord>): string {
  const data: Array<[string, string]> = [
    ['Applicant ID', record.applicantId],
    ['Name', record.fullName],
    ['Email', record.email],
    ['Phone', record.phone],
    ['Location', `${record.city}, ${record.state} ${record.zipCode}`.trim()],
    ['Work relationship', record.workerPath],
    ['Work lanes', record.workLanes.join(', ')],
    ['Years experience', String(record.yearsExperience)],
    ['Travel radius', `${record.travelRadiusMiles} miles`],
    ['Transportation', record.transportation],
    ['Availability', record.availability],
    ['Rate preference', record.hourlyRate || 'Not stated'],
    ['Certifications', record.certifications || 'Not stated'],
    ['Tools', record.tools || 'Not stated'],
    ['Skills', record.skills]
  ];

  return data.map(([label, value]) => `<tr><td style="padding:7px 12px;font-weight:700;color:#071B34;vertical-align:top;width:34%">${escapeHtml(label)}</td><td style="padding:7px 12px;color:#334155;white-space:pre-wrap">${escapeHtml(value)}</td></tr>`).join('');
}

async function sendResend(payload: Record<string, unknown>): Promise<void> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(error.message || 'Applicant email delivery failed.');
  }
}

async function deliverApplicant(record: ReturnType<typeof buildRecord>, formData: FormData): Promise<void> {
  const resume = getResume(formData);
  const attachments: Array<{ filename: string; content: string }> = [
    {
      filename: `${record.applicantId}-applicant-record.json`,
      content: Buffer.from(JSON.stringify(record, null, 2)).toString('base64')
    }
  ];

  if (resume) {
    attachments.push({
      filename: sanitizeFilename(resume.name),
      content: Buffer.from(await resume.arrayBuffer()).toString('base64')
    });
  }

  const to = process.env.APPLICANT_TO_EMAIL || process.env.DISPATCH_TO_EMAIL || applicantMailbox;
  const body = `<div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;border:1px solid #DDE5EF;border-radius:14px;overflow:hidden"><div style="background:#071B34;padding:24px 32px;color:#fff"><h1 style="margin:0;font-size:20px">New Applicant — ${escapeHtml(record.applicantId)}</h1></div><div style="padding:24px 32px"><table style="width:100%;border-collapse:collapse;font-size:14px">${rows(record)}</table></div></div>`;

  await sendResend({
    from: applicantFromEmail,
    to: [to],
    reply_to: record.email,
    subject: `[${record.applicantId}] Applicant — ${record.fullName} — ${record.city}, ${record.state}`,
    html: body,
    attachments
  });

  await sendResend({
    from: applicantFromEmail,
    to: [record.email],
    reply_to: applicantMailbox,
    subject: `Application received — ${record.applicantId}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto"><h1>Application received</h1><p>Already Here LLC received your application. Your reference number is <strong>${escapeHtml(record.applicantId)}</strong>.</p><p>This confirmation does not create an employment, contractor, vendor, or assignment relationship. We will contact you if additional information or an interview is requested.</p></div>`
  });

  const webhook = process.env.APPLICANT_DATABASE_WEBHOOK_URL;
  if (webhook) {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    }).catch(() => null);
  }
}

export async function POST(request: Request) {
  if (isRateLimited(getClientKey(request))) {
    return NextResponse.json({ message: 'Too many submissions. Try again shortly.' }, { status: 429 });
  }

  const formData = await request.formData();
  const validationError = validate(formData);
  if (validationError) return NextResponse.json({ message: validationError }, { status: 400 });

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ message: 'Applicant delivery is temporarily unavailable.' }, { status: 503 });
  }

  const applicantId = generateApplicantId();
  const record = buildRecord(applicantId, formData);

  try {
    await deliverApplicant(record, formData);
    return NextResponse.json({ ok: true, applicantId });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Application delivery failed.' }, { status: 502 });
  }
}
