/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f2fbf6',
          100: '#e0f7e9',
          200: '#baeccb',
          300: '#84dba8',
          400: '#4cc281',
          500: '#26a565',
          600: '#188451',
          700: '#146943',
          800: '#125437',
          900: '#0f452f',
        },
        ink: {
          50: '#f6f7f8',
          100: '#eceef1',
          200: '#d5d9e0',
          300: '#b1b9c4',
          400: '#8691a1',
          500: '#677284',
          600: '#525c6c',
          700: '#434b58',
          800: '#3a404b',
          900: '#22262c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,32,0.06), 0 1px 8px rgba(16,24,32,0.06)',
        pop: '0 8px 24px rgba(16,24,32,0.12)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
}
