/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#6E56CF",
        urgent: "#EF4444",
        important: "#F59E0B",
        accent: "var(--accent-color)"
      },
      backgroundColor: {
        'theme-primary': 'var(--bg-primary)',
        'theme-secondary': 'var(--bg-secondary)',
        'theme-card': 'var(--bg-card)',
        'theme-hover': 'var(--bg-hover)'
      },
      textColor: {
        'theme-primary': 'var(--text-primary)',
        'theme-secondary': 'var(--text-secondary)',
        'theme-muted': 'var(--text-muted)'
      },
      borderColor: {
        'theme': 'var(--border-color)'
      }
    }
  },
  plugins: [require("@tailwindcss/typography")]
};