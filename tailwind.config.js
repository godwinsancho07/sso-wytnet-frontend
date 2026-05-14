/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#f5f8ff',
          100: '#ebf1ff',
          200: '#ccdbff',
          300: '#99b8ff',
          400: '#668fff',
          500: '#3362ff',
          600: '#0039ff', // Vibrant Premium Blue
          700: '#002ecb',
          800: '#002299',
          900: '#001966',
        },
        accent: {
          purple: '#9333ea',
          pink: '#db2777',
          emerald: '#10b981',
          rose: '#e11d48',
          violet: '#7c3aed',
        }
      },
      boxShadow: {
        'premium': '0 10px 30px -10px rgba(0, 0, 0, 0.04), 0 4px 10px -5px rgba(0, 0, 0, 0.02)',
        'premium-hover': '0 20px 40px -15px rgba(0, 0, 0, 0.08), 0 10px 20px -10px rgba(0, 0, 0, 0.04)',
        'button': '0 10px 20px -5px rgba(0, 57, 255, 0.2)',
        'button-hover': '0 15px 25px -5px rgba(0, 57, 255, 0.3)',
        'card-soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
};
