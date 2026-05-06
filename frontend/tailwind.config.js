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
        trading: {
          bg: '#040810',
          panel: 'rgba(9, 17, 32, 0.45)',
          border: 'rgba(255, 255, 255, 0.08)',
          green: '#10b981',
          blue: '#0ea5e9',
          orange: '#f59e0b',
          red: '#f43f5e',
          text: '#f8fafc',
          muted: '#94a3b8'
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'radar': 'radar 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      keyframes: {
        radar: {
          '0%': { transform: 'scale(0.95)', opacity: '1' },
          '100%': { transform: 'scale(1.8)', opacity: '0' },
        }
      }
    },
  },
  plugins: [],
}
