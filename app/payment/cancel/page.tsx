import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Payment Cancelled | Already Here LLC',
  description: 'Your payment was cancelled. You can try again or contact us for help.'
};

export default function PaymentCancelPage() {
  return (
    <main className="container-shell py-16 lg:py-24">
      <div className="card mx-auto max-w-2xl p-8 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
          <svg className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="section-title">Payment cancelled.</h1>
        <p className="section-copy mt-4">
          No charge was made. If you have questions or need a custom invoice, reach out and we will help.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/products" className="link-ring rounded-full px-6 py-3 text-sm font-semibold">
            Back to products
          </Link>
          <Link href="/rfq" className="text-sm font-semibold text-action hover:underline">
            Request a quote
          </Link>
        </div>
      </div>
    </main>
  );
}
