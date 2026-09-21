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
        primary: {
          50: '#EEF4F8',
          100: '#D6E5EE',
          200: '#A9C7DA',
          300: '#74A3BF',
          400: '#4A82A3',
          500: '#2D6486',
          600: '#1B4965',
          700: '#163C53',
          800: '#122F41',
          900: '#0D2231',
        },
        accent: {
          50: '#FDF6EA',
          100: '#F8E7C6',
          200: '#F0CE8C',
          300: '#E2A03F',
          400: '#C9862A',
          500: '#A66C1E',
        },
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
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
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
