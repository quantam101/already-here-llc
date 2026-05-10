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
        navy: '#071B34',
        action: '#1B66FF',
        steel: '#7E8A9A',
        charcoal: '#101820',
        slateBrand: '#7E8A9A',
        soft: '#F8FAFC',
        borderBrand: '#DDE5EF',
        ink: '#101820'
      },
      boxShadow: {
        panel: '0 18px 50px rgba(7, 27, 52, 0.08)'
      },
      maxWidth: {
        content: '1200px'
      },
      fontFamily: {
        sans: ['Inter', 'IBM Plex Sans', 'Arial', 'Helvetica', 'sans-serif']
      },
      typography: {
        DEFAULT: {
          css: {
            color: '#334155',
            maxWidth: 'none',
            h2: { color: '#071B34', fontWeight: '600' },
            h3: { color: '#071B34', fontWeight: '600' },
            a: { color: '#1B66FF' },
            strong: { color: '#101820' }
          }
        }
      }
    }
  },
  plugins: [require('@tailwindcss/typography')]
};

export default config;
