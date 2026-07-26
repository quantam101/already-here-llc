import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Payment Successful | Already Here LLC',
  description: 'Thank you for your purchase. Your payment has been received.'
};

export default function PaymentSuccessPage({
  searchParams
}: {
  searchParams: { session_id?: string };
}) {
  return (
    <main className="container-shell py-16 lg:py-24">
      <div className="card mx-auto max-w-2xl p-8 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
          <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="section-title">Payment successful.</h1>
        <p className="section-copy mt-4">
          Thank you for your purchase. You will receive a confirmation email shortly.
        </p>
        {searchParams.session_id && (
          <p className="mt-4 font-mono text-xs text-slate-500">
            Session: {searchParams.session_id}
          </p>
        )}
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/products" className="link-ring rounded-full px-6 py-3 text-sm font-semibold">
            Browse more products
          </Link>
          <Link href="/" className="text-sm font-semibold text-action hover:underline">
            Return home
          </Link>
        </div>
      </div>
    </main>
  );
}
