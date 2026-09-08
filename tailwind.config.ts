import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        base: {
          950: "#121212",
          900: "#161616",
          850: "#1b1b1b",
          800: "#212121",
          700: "#2a2a2a",
          600: "#3a3a3a",
          border: "#2e2e2e",
        },
        gold: {
          50: "#fffceb",
          100: "#fff3c4",
          200: "#ffe58a",
          300: "#ffd24d",
          400: "#ffc61e", // bright primary accent
          500: "#f5b800",
          600: "#d99e00",
          700: "#ad7c00",
          800: "#8a6300",
          900: "#6b4d00",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
