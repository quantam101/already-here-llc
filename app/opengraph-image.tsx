import { ImageResponse } from 'next/og';
import { siteConfig } from '@/lib/site';

// Default share preview for every page that doesn't define its own image.
// Served at /opengraph-image; the content site (/content) points here too.
export const alt = `${siteConfig.name} — Phoenix Managed IT & Onsite Field Operations`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: 'linear-gradient(135deg, #0b1626 0%, #13263f 60%, #1b3556 100%)',
          color: '#f4f6f9',
          fontFamily: 'sans-serif'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ width: 14, height: 56, background: '#f2a33a', borderRadius: 3 }} />
          <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: -0.5 }}>{siteConfig.name}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1.5, maxWidth: 980 }}>
            Phoenix Managed IT + Onsite Field Execution
          </div>
          <div style={{ fontSize: 30, color: '#b9c6d8', maxWidth: 940, lineHeight: 1.35 }}>
            Help desk, network and Microsoft 365 support — plus technicians onsite when remote can&apos;t close it.
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 28, color: '#d7dfea' }}>
          <div style={{ display: 'flex' }}>alreadyherellc.com</div>
          <div style={{ display: 'flex', color: '#f2a33a', fontWeight: 700 }}>{siteConfig.phoneDisplay}</div>
        </div>
      </div>
    ),
    size
  );
}
