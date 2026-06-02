/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0d9488', // teal-600
          hover: '#0f766e',
          light: '#f0fdfa'
        },
        secondary: {
          DEFAULT: '#0284c7', // sky-600
          hover: '#0369a1',
          light: '#f0f9ff'
        },
        background: '#f8fafc',
        card: '#ffffff'
      },
      fontFamily: {
        sans: ['Tajawal', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
