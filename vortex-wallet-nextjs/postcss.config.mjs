/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Эта строка говорит искать классы во всех jsx/tsx файлах в папке src
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}