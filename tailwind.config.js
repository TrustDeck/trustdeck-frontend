/** @type {import('tailwindcss').Config} */

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/primereact/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'color-text-gray': '#5E676C',
        'color-dark-gray': '#7E898F',
        'color-light-gray': '#CBCFD2',
        'color-blue': '#004D9B',
        'color-light-blue': '#007BC3',
        'color-dark-blue': '#002552',
        'color-coral': '#EA5451',
        'sidebar': '#E0ECF1',
        'surface': '#E9E9E9'
      },
      fontFamily: {
        'font-headline': ['Arimo', 'serif'],
        'font-text': ['Arimo', 'serif']
      },
      fontSize: {
        '4xl': '32px', // Custom size for h1
        '2xl': '20px', // Custom size for h2, h3
        'xl': '18px',  // Custom size for h4
        'base': '14px', // Custom size for paragraphs
        'sm': '11px', // Custom size for small text
      },
      fontWeight: {
        'bold': '700',
        'normal': '400',
      },
      width: {
        'sidebar-large': '304px',
        'sidebar-collapse': '60px',
      },
      margin: {
        'sidebar-large': '304px',
        'sidebar-collapse': '60px',
      },
    },
  },
  plugins: [],
}