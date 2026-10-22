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
        'brand-green': '#00a854',
        'brand-green-hover': '#009249',
        'brand-green-light': '#e8f5e9',
        'brand-orange-light': '#fff7ed',
        'brand-orange-text': '#ea580c',
        'brand-gray-bg': '#f4f6f5',
        'brand-gray-input': '#f4f6f5',
        'brand-gray-border': '#e5e7eb',
        'surface-canvas': '#ffffff',
        'surface-card': '#ffffff',
        'surface-card-hover': '#f9fafb',
        'surface-container': '#f4f6f5',
        'border-subtle': '#e5e7eb',
        'border-card': '#e5e7eb',
        'border-highlight': '#00a854',
        'text-muted': '#6b7280',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['Inter', 'Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'clean-card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'clean-popover': '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
}
