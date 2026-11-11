/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#F5F0FC', 100: '#EDE7F6', 200: '#D1C4E9', 300: '#B39DDB', 400: '#9575CD',
          500: '#7E57C2', 600: '#673AB7', 700: '#5E35B1', 800: '#4527A0', 900: '#311B92',
        },
        lavender: '#EDE7F6',
        canvas: '#F8F9FC',
        navy: { DEFAULT: '#1A1F3D', light: '#4A5072', muted: '#8A8FA8' },
        income: { DEFAULT: '#16A34A', soft: '#E8F7EE' },
        expense: { DEFAULT: '#E53935', soft: '#FDECEC' },
        invest: { DEFAULT: '#E0A100', soft: '#FFF6DC' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(26,31,61,0.04), 0 4px 16px rgba(26,31,61,0.06)',
        pop: '0 12px 40px rgba(26,31,61,0.18)',
      },
      borderRadius: { xl2: '1.25rem' },
      keyframes: {
        'fade-up': { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'none' } },
        'scale-in': { '0%': { opacity: 0, transform: 'scale(.96)' }, '100%': { opacity: 1, transform: 'none' } },
        'slide-up': { '0%': { transform: 'translateY(100%)' }, '100%': { transform: 'none' } },
      },
      animation: {
        'fade-up': 'fade-up .35s ease-out both',
        'scale-in': 'scale-in .18s ease-out both',
        'slide-up': 'slide-up .25s ease-out both',
      },
    },
  },
  plugins: [],
};
