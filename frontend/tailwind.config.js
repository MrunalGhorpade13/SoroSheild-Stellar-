/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        stellar: {
          blue: '#4A90E2',
          darkBlue: '#357ABD',
          lightBg: '#F8F9FB',
        },
        severity: {
          critical: '#EF4444',
          warning: '#F59E0B',
          info: '#22C55E',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
