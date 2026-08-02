import { NextResponse } from 'next/server.js';
import { clearSessionCookie } from '@/lib/ahfos/auth';

export const runtime = 'nodejs';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
