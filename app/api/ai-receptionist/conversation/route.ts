import { NextResponse } from 'next/server.js';
import { answerQuestion, looksLikeQuestion } from '@/lib/conversation-knowledge';

export const runtime = 'nodejs';

const questions = [
  { key: 'fullName', text: 'What is your name?' },
  { key: 'contact', text: 'What phone number or email should we use to confirm?' },
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

  if (answer && looksLikeQuestion(answer)) {
    const pendingIdx = Math.max(step - 1, 0);
    const kb = await answerQuestion(answer);
    return NextResponse.json({
      ok: true,
      status: 'in_progress',
      step: pendingIdx,
      nextStep: pendingIdx + 1,
      question: `${kb.answered ? kb.text : 'I could not find that in our records.'}\n\n${questions[pendingIdx].text}`,
      field: questions[pendingIdx].key,
      knowledge: kb,
      data
    });
  }

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

  if (data.contact && !data.phone && !data.email) {
    const emailMatch = data.contact.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/);
    const digits = data.contact.replace(/(\d)\s*(?:ext\.?|x)\s*\d+\s*$/i, '$1').replace(/\D/g, '');
    if (emailMatch) data.email = emailMatch[0];
    else if (digits.length >= 7) data.phone = digits;
    else data.message = `${data.message || ''} contact: ${data.contact}`.trim();
  }

  const score = scoreLead(data);
  const state = leadState(score, data);
  const delivery = await submitLead(request, data, score, state).then((r) => r.ok).catch(() => false);
  const outcome = await fetch(new URL('/api/ai-receptionist/outcome', request.url), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ lead: { ...data, leadDelivered: String(delivery) } }),
    cache: 'no-store'
  }).then((r) => (r.ok ? r.json() : null)).catch(() => null);

  return NextResponse.json({
    ok: true,
    status: 'complete',
    autonomous: true,
    loop: 'closed',
    leadScore: score,
    leadState: state,
    deliveryConfirmed: delivery,
    outcome,
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
    capabilities: ['ask_follow_up_questions', 'qualify_leads', 'score_leads', 'route_to_dispatch', 'return_next_action', 'close_conversation_to_outcome_loop', 'answer_questions_from_canonical_store', 'answer_questions_from_command_brain'],
    firstQuestion: questions[0].text,
    timestamp: new Date().toISOString()
  });
}
