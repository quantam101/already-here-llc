import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

const AUDIT_DIR = path.resolve(process.cwd(), 'data');
const AUDIT_FILE = path.join(AUDIT_DIR, 'polymarket-support-tickets.jsonl');

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as { email?: string; subject?: string; message?: string; plan?: string };
    const { email = '', subject = '', message = '', plan = '' } = body;

    if (!email || !subject || !message) {
      return NextResponse.json({ message: 'Email, subject, and message are required.' }, { status: 400 });
    }

    const ticket = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      email: email.trim().toLowerCase(),
      subject: subject.trim().slice(0, 200),
      message: message.trim().slice(0, 5000),
      plan: plan.trim().slice(0, 50),
      createdAt: new Date().toISOString()
    };

    await fs.mkdir(AUDIT_DIR, { recursive: true });
    await fs.appendFile(AUDIT_FILE, `${JSON.stringify(ticket)}\n`, 'utf-8');

    return NextResponse.json({ ok: true, ticketId: ticket.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Support ticket submission failed.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
