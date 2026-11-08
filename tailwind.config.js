/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.js', './public/index.html'],
  theme: {
    // Replaces Tailwind's default palette on purpose: only the plan's colours exist.
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      inherit: 'inherit',
      white: '#FFFFFF',
      paper: '#FAFBF8',
      ink: '#1B2A4A',
      'ink-soft': '#2A3D63',
      pencil: '#5E6B7D',
      rule: '#C9D6E8',
      hl: {
        yellow: '#FFE94D',
        pink: '#FF9ECF',
        green: '#9BEA8B',
        blue: '#8FD3FF',
        orange: '#FFB870',
      },
      // Deeper versions of the course hues for chart marks and bars (validated for contrast and colour blindness).
      pen: {
        blue: '#2B7BC4',
        green: '#1E9E78',
        orange: '#D9741A',
        pink: '#B84A9E',
      },
      // Index card: the red line under the heading and the pale blue writing lines.
      card: {
        red: '#E07A7A',
        line: '#C5D8F0',
        stack: '#E4EAF3',
      },
      // Avatar tints for people: soft and round, unlike the skewed course highlighters.
      avatar: {
        lilac: '#DCD3FF',
        sand: '#F2E3C4',
        mint: '#CDE6E1',
        rose: '#F6D3DA',
      },
      // Sequential ramp for the study calendar, light to dark.
      heat: {
        0: '#EEF2F7',
        1: '#C9D6E8',
        2: '#8FA7CC',
        3: '#53709F',
        4: '#1B2A4A',
      },
    },
    fontFamily: {
      sans: ['"Atkinson Hyperlegible Next"', '"Atkinson Hyperlegible"', 'system-ui', 'sans-serif'],
      serif: ['Literata', 'Georgia', 'serif'],
      // Only for the "Social Study" wordmark: written with a marker, like the highlighters.
      logo: ['"Caveat Brush"', 'cursive'],
    },
    // Classic typographic scale: 12, 14, 16, 18, 21, 24, 36, 48, 72.
    fontSize: {
      xs: ['0.75rem', '1.1rem'],
      sm: ['0.875rem', '1.35rem'],
      base: ['1rem', '1.55rem'],
      md: ['1.125rem', '1.65rem'],
      lg: ['1.3125rem', '1.8rem'],
      xl: ['1.5rem', '2rem'],
      '2xl': ['2.25rem', '2.6rem'],
      '3xl': ['3rem', '3.3rem'],
      '4xl': ['4.5rem', '1'],
    },
    extend: {},
  },
  plugins: [],
};
