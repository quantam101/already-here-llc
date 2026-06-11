import { NextResponse } from 'next/server.js';

export const runtime = 'nodejs';

const questions = [
  { key: 'serviceType', text: 'What service do you need: network support, door access, equipment removal, healthcare equipment, or AI receptionist setup?' },
  { key: 'location', text: 'What city or site location is this for?' },
  { key: 'urgency', text: 'How urgent is this: emergency, same day, quote request, scheduled service, or normal follow-up?' },
  { key: 'preferredTime', text: 'What callback or service window works best?' },
  { key: 'message', text: 'Give any final details, access notes, equipment details, work order number, or desired outcome.' }
] as const;

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, 1200) : '';
}

function scoreLead(data: Record<string, string>): number {
  let score = 20;
  if (data.phone || data.email) score += 20;
  if (data.serviceType) score += 15;
  if (data.location) score += 15;
  if (/emergency|down|same day|urgent|asap/i.test(data.urgency + ' ' + data.message)) score += 20;
  if (/quote|schedule|dispatch|work order|site|equipment|network|door|healthcare|mckesson/i.test(Object.values(data).join(' '))) score += 10;
  return Math.min(score, 100);
}

function leadState(score: number, data: Record<string, string>): string {
  if (/emergency|down|urgent|same day|asap/i.test(data.urgency + ' ' + data.message)) return 'urgent_escalation';
  if (score >= 75) return 'ready_to_quote_or_schedule';
  if (score >= 50) return 'qualified_needs_review';
  return 'needs_more_information';
}

async function submitLead(request: Request, data: Record<string, string>, score: number, state: string) {
  const url = new URL('/api/ai-receptionist/intake', request.url);
  return fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...data, source: data.source || 'autonomous_conversation_engine', leadScore: String(score), leadState: state }),
    cache: 'no-store'
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const step = Number(body.step || 0);
  const data: Record<string, string> = Object.fromEntries(Object.entries(body.data || {}).map(([key, value]) => [key, clean(value)]));
  const answer = clean(body.answer);

  if (step > 0 && questions[step - 1]) data[questions[step - 1].key] = answer;

  if (step < questions.length) {
    return NextResponse.json({
      ok: true,
      status: 'in_progress',
      step,
      nextStep: step + 1,
      question: questions[step].text,
      field: questions[step].key,
      data
    });
  }

  const score = scoreLead(data);
  const state = leadState(score, data);
  const delivery = await submitLead(request, data, score, state).then((r) => r.ok).catch(() => false);

  return NextResponse.json({
    ok: true,
    status: 'complete',
    autonomous: true,
    leadScore: score,
    leadState: state,
    deliveryConfirmed: delivery,
    summary: `Captured ${data.serviceType || 'service request'} for ${data.location || 'unknown location'} with ${data.urgency || 'normal'} urgency.`,
    data
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'ai-receptionist-conversation',
    status: 'ready',
    autonomous: true,
    mode: 'structured_qualification',
    capabilities: ['ask_follow_up_questions', 'qualify_leads', 'score_leads', 'route_to_dispatch', 'return_next_action'],
    firstQuestion: questions[0].text,
    timestamp: new Date().toISOString()
  });
}
