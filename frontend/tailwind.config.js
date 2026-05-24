/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        'helios-bg': '#0A0F1A',
        'helios-card': '#141B2B',
        'helios-accent': '#F59E0B',
      }
    }
  },
  plugins: []
}