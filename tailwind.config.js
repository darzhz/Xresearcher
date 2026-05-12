/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F9F9F7',
        ink: '#111111',
        divider: '#E5E5E0',
        editorial: '#CC0000',
        paper: '#F9F9F7',
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        body: ['Lora', 'serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        none: '0px',
      },
    },
  },
  plugins: [],
}
