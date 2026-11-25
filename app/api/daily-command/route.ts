import { NextResponse } from 'next/server';
import { isInternalAuthorized, unauthorizedInternalResponse } from '@/lib/internal-auth';
import { getDailyCommandResponse } from '@/lib/daily-command-core';

function getEnvFlag(name: string): boolean {
  return process.env[name] === '1' || process.env[name] === 'true';
}

const forceOffline = getEnvFlag('DAILY_COMMAND_FORCE_OFFLINE') || getEnvFlag('ECOSYSTEM_FORCE_OFFLINE');
const quotaLock = getEnvFlag('DAILY_COMMAND_QUOTA_LOCK') || getEnvFlag('ECOSYSTEM_QUOTA_LOCK');

export async function GET(request: Request) {
  if (!isInternalAuthorized(request)) return unauthorizedInternalResponse();
  const url = new URL(request.url);
  const prompt = url.searchParams.get('prompt') ?? undefined;
  const response = getDailyCommandResponse({ prompt, forceOffline, quotaLock });
  return NextResponse.json(response);
}

export async function POST(request: Request) {
  if (!isInternalAuthorized(request)) return unauthorizedInternalResponse();
  const body = await request.json().catch(() => ({}));
  const prompt = typeof body?.prompt === 'string' ? body.prompt : undefined;
  const response = getDailyCommandResponse({ prompt, forceOffline, quotaLock });
  return NextResponse.json(response);
}
