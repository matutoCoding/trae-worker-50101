/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1B3A2D',
          light: '#2A5A45',
          dark: '#0F2018',
        },
        gold: {
          DEFAULT: '#C4A35A',
          light: '#D4B86A',
          dark: '#A88940',
        },
        cream: '#F5F3EF',
        charcoal: '#2C2C2C',
        sage: {
          DEFAULT: '#5A8F7B',
          light: '#7AB59E',
        },
        border: '#E2DDD5',
      },
      fontFamily: {
        serif: ['Noto Serif SC', 'serif'],
        sans: ['Noto Sans SC', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
