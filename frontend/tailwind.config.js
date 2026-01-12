/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--color-background) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        'surface-hover': 'rgb(var(--color-surface-hover) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        foreground: 'rgb(var(--color-text) / <alpha-value>)',
        'foreground-secondary': 'rgb(var(--color-text-secondary) / <alpha-value>)',
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        'primary-hover': 'rgb(var(--color-primary-hover) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        'accent-hover': 'rgb(var(--color-accent-hover) / <alpha-value>)',
        'success': 'rgb(34 197 94 / <alpha-value>)', // green-500
        'warning': 'rgb(245 158 11 / <alpha-value>)', // amber-500
        'info': 'rgb(59 130 246 / <alpha-value>)', // blue-500
        'error': 'rgb(239 68 68 / <alpha-value>)', // red-500
      },
    },
  },
  plugins: [],
}