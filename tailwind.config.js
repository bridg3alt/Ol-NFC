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
        // Calm deep teal. 600 and darker pass WCAG AA (4.5:1) as text on white.
        primary: {
          50: '#effaf7',
          100: '#d7f1ea',
          200: '#b0e2d5',
          300: '#7fcbb9',
          400: '#4fae9a',
          500: '#2f9180',
          600: '#237467',
          700: '#1f5e54',
          800: '#1c4b44',
          900: '#193f39',
        },
        // Warm terracotta accent, used sparingly for highlights.
        secondary: {
          50: '#fdf5f0',
          100: '#fae6da',
          200: '#f4cab2',
          300: '#eca783',
          400: '#e27f53',
          500: '#d56535',
          600: '#b94f27',
          700: '#9a3f22',
          800: '#7d3521',
          900: '#662e1e',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        // Warm off-white page background and near-black body text.
        canvas: '#faf7f2',
        ink: '#1f2a2e',
      },
      fontFamily: {
        // Atkinson Hyperlegible was designed by the Braille Institute for
        // low-vision readers: letters like I/l/1 and O/0 are easy to tell apart.
        sans: ['"Atkinson Hyperlegible"', 'system-ui', 'sans-serif'],
        display: ['"Atkinson Hyperlegible"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
