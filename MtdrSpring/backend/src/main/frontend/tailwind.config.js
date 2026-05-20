/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:      '#F0F9F7',
          100:     '#E0F7FA',
          200:     '#B2DFDB',
          300:     '#80CBC4',
          400:     '#4DB8AA',
          DEFAULT: '#009B77',
          600:     '#00897B',
          700:     '#00796B',
          800:     '#004D40',
          900:     '#004D00',
          dark:    '#004D40',
          light:   '#B2DFDB',
          lighter: '#E0F7FA',
          muted:   '#AEEEEE',
          accent:  '#00BFFF',
        },
        secondary: {
          DEFAULT: '#00796B',
          light:   '#80CBC4',
        },
        success: {
          50:      '#F1F8E9',
          100:     '#C8E6C9',
          DEFAULT: '#1B5E20',
          light:   '#A5D6A7',
          dark:    '#1B5E20',
        },
        status: {
          success:  '#10B981',
          warning:  '#F59E0B',
          error:    '#EF4444',
          info:     '#3B82F6',
          neutral:  '#6B7280',
        },
      },
      boxShadow: {
        brand: '0 10px 18px 0 rgba(0, 155, 119, 0.08), 0 4.5rem 8rem 0 rgba(0, 155, 119, 0.04)',
        'brand-lg': '0 20px 25px -5px rgba(0, 155, 119, 0.15)',
        'brand-sm': '0 4px 6px -1px rgba(0, 155, 119, 0.1)',
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-in-out',
        slideIn: 'slideIn 0.3s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
