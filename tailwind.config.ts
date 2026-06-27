import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eefdf6',
          100: '#d6f9e8',
          200: '#b0f1d4',
          300: '#7be3ba',
          400: '#3fcd99',
          500: '#1ab27e',
          600: '#0d9066',
          700: '#0c7354',
          800: '#0d5b45',
          900: '#0c4a3a',
        },
      },
    },
  },
  plugins: [],
};

export default config;
