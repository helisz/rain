/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './pages/**/*.vue',
    './components/**/*.vue',
    './app.vue',
  ],
  theme: {
    extend: {
      colors: {
        glass: {
          bg: 'rgba(255, 255, 255, 0.65)',
          border: 'rgba(255, 255, 255, 0.4)',
          highlight: 'rgba(255, 255, 255, 0.6)',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
