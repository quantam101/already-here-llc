import { NextResponse } from 'next/server.js';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'ai-receptionist-status',
    status: 'ready',
    productLevel: 'level_2_qualification',
    enabled: {
      webIntake: true,
      conversationQuestions: true,
      leadScoring: true,
      dispatchRouting: true,
      smsEndpoint: true,
      phoneWebhook: true
    },
    nextUpgrade: 'calendar booking and CRM pipeline persistence',
    timestamp: new Date().toISOString()
  });
}
