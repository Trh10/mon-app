/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#6E56CF",
        urgent: "#EF4444",
        important: "#F59E0B"
      }
    }
  },
  plugins: [require("@tailwindcss/typography")]
};