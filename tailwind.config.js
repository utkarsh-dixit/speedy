/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './index.html'
  ],
  theme: {
    extend: {
      colors: {
        'app-bg': '#121218',
        'app-surface': '#1E1E2E',
        'app-surface-light': '#2A2A3A',
        'app-primary': '#4361EE',
        'app-secondary': '#3A0CA3',
        'app-accent': '#4CC9F0',
        'app-success': '#2ECC71',
        'app-warning': '#F39C12',
        'app-error': '#E74C3C',
        'app-text': '#E2E8F0',
        'app-text-secondary': '#94A3B8',
      },
      boxShadow: {
        'app': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'app-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
      backgroundImage: {
        'gradient-app': 'linear-gradient(135deg, #121218 0%, #1E1E2E 100%)',
        'gradient-sidebar': 'linear-gradient(180deg, #1E1E2E 0%, #252538 100%)',
        'gradient-header': 'linear-gradient(90deg, #252538 0%, #1E1E2E 100%)',
        'gradient-button': 'linear-gradient(90deg, #4361EE 0%, #4CC9F0 100%)',
        'gradient-premium': 'linear-gradient(90deg, #4361EE 0%, #3A0CA3 100%)',
      },
    },
  },
  plugins: [],
};