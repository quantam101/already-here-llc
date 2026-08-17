import { DarkPoolDashboard } from '@/components/DarkPoolDashboard';

export const metadata = {
  title: 'FINRA Dark Pool Command Center | Already Here LLC',
  description:
    'Weekly ATS transparency analytics: institutional accumulation and distribution signals from FINRA dark pool data.',
};

export default function DarkPoolPage() {
  return <DarkPoolDashboard />;
}
