import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        navy: '#0F2747',
        action: '#1565C0',
        slateBrand: '#64748B',
        soft: '#F8FAFC',
        borderBrand: '#E2E8F0',
        ink: '#0F172A'
      },
      boxShadow: {
        panel: '0 18px 50px rgba(15, 39, 71, 0.08)'
      },
      maxWidth: {
        content: '1200px'
      },
      typography: {
        DEFAULT: {
          css: {
            color: '#334155',
            maxWidth: 'none',
            h2: { color: '#0F2747', fontWeight: '600' },
            h3: { color: '#0F2747', fontWeight: '600' },
            a: { color: '#1565C0' },
            strong: { color: '#0F172A' }
          }
        }
      }
    }
  },
  plugins: [require('@tailwindcss/typography')]
};

export default config;
