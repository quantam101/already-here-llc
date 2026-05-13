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
        soft: '#07111F',
        borderBrand: '#20314A',
        ink: '#E5EDF7'
      },
      boxShadow: {
        panel: '0 24px 80px rgba(0, 0, 0, 0.32)'
      },
      maxWidth: {
        content: '1200px'
      },
      fontFamily: {
        sans: ['Inter', 'IBM Plex Sans', 'Arial', 'Helvetica', 'sans-serif']
      }
    }
  },
  plugins: []
};

export default config;
