export default {
  content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      colors: {
        canvas: '#F2F5F7',
        ink: {
          50: '#F6F8FA',
          100: '#EAEEF2',
          200: '#D6DDE5',
          300: '#B4C0CD',
          400: '#8496A9',
          500: '#5D7186',
          600: '#44576B',
          700: '#324454',
          800: '#22303C',
          900: '#0F1B2B',
        },
        // themeable (Branding page): RGB channels in CSS variables, see index.css
        primary: Object.fromEntries([50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((step) => [step, `rgb(var(--primary-${step}) / <alpha-value>)`])),
        accent: Object.fromEntries([50, 100, 200, 300, 400, 500].map((step) => [step, `rgb(var(--accent-${step}) / <alpha-value>)`])),
        success: {
          50: '#ECF7F0',
          100: '#CFEBDA',
          500: '#2F855A',
          600: '#276749',
        },
        danger: {
          50: '#FDF0EF',
          100: '#F8D7D4',
          500: '#C2453B',
          600: '#A2352C',
        },
        warn: {
          50: '#FDF7E7',
          100: '#F7E9BF',
          500: '#B7791F',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,27,43,0.05), 0 1px 3px rgba(15,27,43,0.05)',
        pop: '0 12px 32px -8px rgba(15,27,43,0.22)',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [],
};
