import { NextResponse } from 'next/server.js';

export const runtime = 'nodejs';

type Tier = 'basic' | 'pro' | 'officeManager';

function currentTier(): Tier {
  const value = (process.env.AI_RECEPTIONIST_TIER || 'pro').trim();
  if (value === 'basic' || value === 'officeManager') return value;
  return 'pro';
}

export async function GET() {
  const tier = currentTier();
  const isPro = tier === 'pro' || tier === 'officeManager';
  const isOfficeManager = tier === 'officeManager';

  return NextResponse.json({
    ok: true,
    service: 'ai-receptionist-status',
    status: 'ready',
    currentTier: tier,
    currentPlan: tier === 'basic' ? 'Basic Intake' : tier === 'pro' ? 'Pro AI Receptionist' : 'AI Office Manager',
    productLevel: tier === 'basic' ? 'level_1_intake' : tier === 'pro' ? 'level_2_qualification' : 'level_4_office_manager',
    enabled: {
      webIntake: true,
      missedCallRecording: true,
      emailLeadDelivery: true,
      speechQualification: isPro,
      smsLeadCapture: isPro,
      leadScoring: isPro,
      calendarBooking: isOfficeManager,
      crmPipeline: isOfficeManager,
      revenueReporting: isOfficeManager
    },
    tierRule: 'Basic includes intake and recording. Pro adds speech, SMS, and scoring. Office Manager adds booking, CRM, and reporting.',
    timestamp: new Date().toISOString()
  });
}
