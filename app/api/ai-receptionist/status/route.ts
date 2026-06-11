import { NextResponse } from 'next/server.js';

export const runtime = 'nodejs';

const tiers = {
  basic: {
    name: 'Basic Intake',
    includes: ['webIntake', 'missedCallRecording', 'emailLeadDelivery'],
    excludes: ['speechQualification', 'smsAutomation', 'calendarBooking', 'crmPipeline']
  },
  pro: {
    name: 'Pro AI Receptionist',
    includes: ['webIntake', 'missedCallRecording', 'emailLeadDelivery', 'speechQualification', 'smsLeadCapture', 'leadScoring'],
    excludes: ['calendarBooking', 'crmPipeline']
  },
  officeManager: {
    name: 'AI Office Manager',
    includes: ['webIntake', 'missedCallRecording', 'emailLeadDelivery', 'speechQualification', 'smsLeadCapture', 'leadScoring', 'calendarBooking', 'crmPipeline', 'revenueReporting'],
    excludes: []
  }
} as const;

type Tier = keyof typeof tiers;

function currentTier(): Tier {
  const value = (process.env.AI_RECEPTIONIST_TIER || 'pro').trim();
  if (value === 'basic' || value === 'officeManager') return value;
  return 'pro';
}

export async function GET() {
  const tier = currentTier();
  const plan = tiers[tier];

  return NextResponse.json({
    ok: true,
    service: 'ai-receptionist-status',
    status: 'ready',
    currentTier: tier,
    currentPlan: plan.name,
    productLevel: tier === 'basic' ? 'level_1_intake' : tier === 'pro' ? 'level_2_autonomous_qualification' : 'level_4_ai_office_manager',
    enabled: {
      webIntake: true,
      missedCallRecording: true,
      emailLeadDelivery: true,
      speechQualification: plan.includes.includes('speechQualification'),
      smsLeadCapture: plan.includes.includes('smsLeadCapture'),
      leadScoring: plan.includes.includes('leadScoring'),
      calendarBooking: plan.includes.includes('calendarBooking'),
      crmPipeline: plan.includes.includes('crmPipeline'),
      revenueReporting: plan.includes.includes('revenueReporting')
    },
    tiers,
    tierRule: 'Features are enabled or blocked by purchased tier. Speech qualification starts at Pro. Booking, CRM, and reporting require Office Manager.',
    nextUpgrade: 'calendar booking and CRM pipeline persistence',
    timestamp: new Date().toISOString()
  });
}
