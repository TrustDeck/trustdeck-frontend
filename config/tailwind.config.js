/** @type {import('tailwindcss').Config} */

export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './node_modules/primereact/**/*.{js,ts,jsx,tsx}'
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
        sidebar: '#E0ECF1',
        surface: '#E9E9E9'
      },
      fontFamily: {
        'font-headline': ['Arimo', 'sans-serif'],
        'font-text': ['Arimo', 'sans-serif']
      },
      fontSize: {
        xs: '11px',
        sm: '12px',
        base: '14px',
        lg: '16px',
        xl: '18px',
        '2xl': '20px',
        '3xl': '24px',
        '4xl': '32px'
      },
      fontWeight: {
        bold: '700',
        normal: '400'
      },
      width: {
        'sidebar-large': '304px',
        'sidebar-collapse': '60px'
      },
      margin: {
        'sidebar-large': '304px',
        'sidebar-collapse': '60px'
      }
    }
  },
  plugins: []
}
