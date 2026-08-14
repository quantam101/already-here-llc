import type { Metadata } from 'next';
import { RegisterForm } from '@/components/ahfos/RegisterForm';

export const metadata: Metadata = {
  title: 'Create account | AHFOS Portal',
  alternates: { canonical: '/portal/register' },
};

export default function RegisterPage() {
  return (
    <main className="container-shell flex min-h-[70vh] items-center justify-center py-16">
      <RegisterForm />
    </main>
  );
}
