import type { Metadata } from 'next';
import { LoginForm } from '@/components/ahfos/LoginForm';

export const metadata: Metadata = {
  title: 'Sign in | AHFOS Portal',
  alternates: { canonical: '/portal/login' },
};

export default function LoginPage() {
  return (
    <main className="container-shell flex min-h-[70vh] items-center justify-center py-16">
      <LoginForm />
    </main>
  );
}
