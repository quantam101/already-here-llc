import { getWorkPassport, verifyPassportToken } from '@/lib/work-passport';

export const dynamic = 'force-dynamic';

export default async function PassportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const closeoutId = verifyPassportToken(decodeURIComponent(token));
  const passport = closeoutId ? await getWorkPassport(closeoutId) : null;

  if (!passport) {
    return (
      <main style={{ maxWidth: 640, margin: '4rem auto', padding: '0 1rem', fontFamily: 'system-ui' }}>
        <h1>Verified Work Passport</h1>
        <p>This proof link is invalid or the work record no longer exists.</p>
      </main>
    );
  }

  const row = (label: string, value: string | number | null) =>
    value !== null && value !== '' ? (
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #eee' }}>
        <span style={{ color: '#666' }}>{label}</span>
        <span style={{ fontWeight: 600 }}>{value}</span>
      </div>
    ) : null;

  return (
    <main style={{ maxWidth: 640, margin: '4rem auto', padding: '0 1rem', fontFamily: 'system-ui' }}>
      <p style={{ letterSpacing: '0.1em', textTransform: 'uppercase', color: '#0a7', fontSize: '0.8rem' }}>
        Verified Work Record — Already Here LLC
      </p>
      <h1 style={{ marginTop: 0 }}>{passport.service_type}</h1>
      <p style={{ color: '#666' }}>
        {passport.site_label} · Completed {passport.completed_at?.slice(0, 10) ?? 'on record'}
      </p>
      <section>
        {row('Technician', passport.technician)}
        {row('Client', passport.organization)}
        {row('Hours on site', passport.hours_worked)}
        {row('QA', passport.qa_status)}
        {row('Customer rating', passport.customer_rating !== null ? `${passport.customer_rating} / 5` : null)}
        {row('Signed closeout', passport.signed ? 'Yes' : 'No')}
        {row('Photo evidence', passport.photo_count ? `${passport.photo_count} photo(s)` : 'None on record')}
        {passport.revenue_cents !== null
          ? row('Value', `${passport.currency} ${(passport.revenue_cents / 100).toFixed(2)}`)
          : null}
      </section>
      {passport.skills.length > 0 && (
        <p style={{ marginTop: '1rem', color: '#444' }}>Skills: {passport.skills.join(', ')}</p>
      )}
      <p style={{ marginTop: '2rem', fontSize: '0.8rem', color: '#999' }}>
        Issued {passport.issued_at.slice(0, 10)} · Cryptographically signed — this page can only be served for a real completed work record.
      </p>
    </main>
  );
}
