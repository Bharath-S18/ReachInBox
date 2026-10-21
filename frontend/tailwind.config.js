/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'surface-canvas': '#020408',
        'surface-card': '#090d16',
        'surface-card-hover': '#0f1524',
        'surface-container': '#131315',
        'surface-dock': 'rgba(9, 13, 22, 0.85)',
        'border-subtle': '#1e293b',
        'border-card': '#27272a',
        'border-highlight': '#38bdf8',
        'glow-cyan': 'rgba(56, 189, 248, 0.15)',
        'glow-violet': 'rgba(139, 92, 246, 0.12)',
        'code-badge-bg': 'rgba(30, 41, 59, 0.65)',
        'text-muted': '#94a3b8',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 25px rgba(56, 189, 248, 0.2)',
        'glow-white': '0 0 20px rgba(255, 255, 255, 0.25)',
      },
    },
  },
  plugins: [],
}
