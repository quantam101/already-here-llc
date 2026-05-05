import Link from 'next/link';

export default function ThankYouPage() {
  return (
    <div className="container-shell py-20 lg:py-28">
      <div className="mx-auto max-w-3xl card p-8 text-center sm:p-12">
        <span className="eyebrow">Submission received</span>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-navy">Scope received.</h1>
        <p className="mt-5 text-base leading-7 text-slate-600">
          The dispatch request has been submitted. If the coverage fit and schedule alignment are workable, the next step is dispatch confirmation.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/services" className="link-ring inline-flex items-center justify-center rounded-full border border-borderBrand px-6 py-3 text-sm font-semibold text-navy">
            View Services
          </Link>
          <Link href="/" className="link-ring inline-flex items-center justify-center rounded-full bg-action px-6 py-3 text-sm font-semibold text-white">
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
