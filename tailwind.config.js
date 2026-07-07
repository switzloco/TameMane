/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Slate-based dark theme palette
        dark: {
          bg: '#0b0f19',
          card: '#161e2e',
          border: '#243048',
          text: '#f3f4f6',
          muted: '#9ca3af',
        }
      }
    },
  },
  plugins: [],
}
