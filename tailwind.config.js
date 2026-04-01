/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#060d1a',
          900: '#0A1628',
          800: '#0F1F3D',
          700: '#142847',
          600: '#1E3A5F',
          500: '#2a4f7c',
        },
        gold: {
          100: '#FAF4E4',
          200: '#EEE0B8',
          300: '#E2CC8A',
          400: '#D4B866',
          500: '#C9A84C',
          600: '#A8832A',
          700: '#8A6A1E',
        },
        'brand-primary': '#0A1628',
        'brand-accent': '#C9A84C',
        'brand-surface': '#0F1F3D',
        'brand-border': '#1E3A5F',
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        sans: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        'display-xl': ['clamp(2.8rem, 10vw, 9rem)', { lineHeight: '0.88', letterSpacing: '-0.04em' }],
        'display-lg': ['clamp(2rem, 6vw, 5.5rem)', { lineHeight: '0.9', letterSpacing: '-0.04em' }],
        'display-md': ['clamp(1.5rem, 4vw, 3.5rem)', { lineHeight: '1', letterSpacing: '-0.03em' }],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
        '6xl': '3rem',
      },
      animation: {
        'gold-shimmer': 'goldShimmer 4s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-gold': 'pulse-gold 3s ease-in-out infinite',
        'gradient-shift': 'gradientShift 8s ease infinite',
        'fade-in-up': 'fadeInUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-in-bottom': 'slideInFromBottom 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        goldShimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        'pulse-gold': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(201, 168, 76, 0.4)' },
          '50%': { boxShadow: '0 0 0 12px rgba(201, 168, 76, 0)' },
        },
        gradientShift: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(40px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.9)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        slideInFromBottom: {
          from: { transform: 'translateY(100%)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #E2CC8A 0%, #C9A84C 50%, #D4B866 100%)',
        'navy-gradient': 'linear-gradient(135deg, #0A1628 0%, #0F1F3D 100%)',
        'hero-radial': 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(201, 168, 76, 0.08), transparent)',
      },
      boxShadow: {
        'gold': '0 8px 30px rgba(201, 168, 76, 0.3)',
        'gold-lg': '0 20px 60px rgba(201, 168, 76, 0.25)',
        'navy': '0 8px 30px rgba(0, 0, 0, 0.4)',
        'navy-lg': '0 20px 60px rgba(0, 0, 0, 0.5)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};