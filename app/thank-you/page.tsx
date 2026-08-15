import Link from 'next/link';

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined };
}

function getParam(params: { [key: string]: string | string[] | undefined }, key: string): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function ThankYouPage({ searchParams }: Props) {
  const params = await searchParams;
  const download = getParam(params, 'download');
  const offer = getParam(params, 'offer');

  const fieldOpsDownloads = download === 'field-ops' ? [
    { label: 'Work order template (CSV)', href: '/templates/field-operations/work-order-template.csv' },
    { label: 'Technician intake template (CSV)', href: '/templates/field-operations/technician-intake-template.csv' },
    { label: 'Asset register template (CSV)', href: '/templates/field-operations/asset-register-template.csv' },
    { label: 'Closeout checklist (Markdown)', href: '/templates/field-operations/closeout-checklist.md' },
    { label: 'Quote-to-cash checklist (Markdown)', href: '/templates/field-operations/quote-to-cash-checklist.md' }
  ] : null;

  const heading = fieldOpsDownloads
    ? 'Purchase complete.'
    : offer === 'field-operations-workflow-review' || offer === 'equipment-lifecycle-assessment'
      ? 'Scope received.'
      : 'Submission received.';

  const body = fieldOpsDownloads
    ? 'Your Field Operations Template Library is ready to download. Files are vendor-neutral CSV and Markdown templates you can import into any spreadsheet, CRM, or documentation system.'
    : 'The dispatch request has been submitted. If the coverage fit and schedule alignment are workable, the next step is dispatch confirmation.';

  return (
    <div className="container-shell py-20 lg:py-28">
      <div className="mx-auto max-w-3xl card p-8 text-center sm:p-12">
        <span className="eyebrow">{fieldOpsDownloads ? 'Order confirmed' : 'Submission received'}</span>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-navy">{heading}</h1>
        <p className="mt-5 text-base leading-7 text-slate-600">{body}</p>

        {fieldOpsDownloads ? (
          <div className="mt-8 text-left">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Downloads</h2>
            <ul className="mt-3 grid gap-2">
              {fieldOpsDownloads.map((item) => (
                <li key={item.href}>
                  <a href={item.href} download className="link-ring flex items-center justify-between rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm font-medium text-navy transition hover:border-action hover:text-action">
                    <span>{item.label}</span>
                    <span className="text-action">Download</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

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
