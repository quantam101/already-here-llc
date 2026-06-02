import { NextResponse } from 'next/server';
import { getEcosystemStatusResponse } from '@/lib/daily-command-core';

function getEnvFlag(name: string): boolean {
  return process.env[name] === '1' || process.env[name] === 'true';
}

const forceOffline = getEnvFlag('DAILY_COMMAND_FORCE_OFFLINE') || getEnvFlag('ECOSYSTEM_FORCE_OFFLINE');
const quotaLock = getEnvFlag('DAILY_COMMAND_QUOTA_LOCK') || getEnvFlag('ECOSYSTEM_QUOTA_LOCK');

export async function GET() {
  const response = getEcosystemStatusResponse({ forceOffline, quotaLock });
  return NextResponse.json(response);
}
