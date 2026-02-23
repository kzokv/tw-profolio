/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        body: ["var(--font-body)", "Noto Sans TC", "sans-serif"],
        display: ["var(--font-display)", "Noto Serif TC", "serif"],
      },
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-soft": "var(--surface-soft)",
        ink: "var(--text)",
        muted: "var(--muted)",
        accent: "var(--accent)",
        line: "var(--line)",
      },
      boxShadow: {
        card: "0 16px 40px rgba(15, 36, 66, 0.08)",
        focus: "0 0 0 4px rgba(196, 149, 56, 0.22)",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.45s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
