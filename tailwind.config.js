export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      colors: {
        ink: '#27313f',
        mist: '#eef3f7',
        clay: '#b76e63',
        moss: '#537568',
      },
      boxShadow: {
        soft: '0 18px 45px rgba(39,49,63,0.10)',
      },
    },
  },
  plugins: [],
}
