// app/layout.tsx
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'Already Here LLC | IT & Network Infrastructure Phoenix',
    template: '%s | Already Here LLC'
  },
  description: '15+ years of expert network engineering and IT security for commercial, military, airport, and medical sectors in the Phoenix regional area.',
  keywords: ['Phoenix IT Infrastructure', 'Network Cabling Phoenix', 'Military IT Contractor', 'Airport Network Support'],
  // This helps social media links look professional
  openGraph: {
    title: 'Already Here LLC',
    description: 'Expert IT Infrastructure for Critical Operations.',
    url: 'https://alreadyherellc.com',
    siteName: 'Already Here LLC',
    locale: 'en_US',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}