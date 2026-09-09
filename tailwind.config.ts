import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        base: {
          950: "#050505", // page background
          900: "#090909", // secondary surface
          850: "#0D0D0D", // secondary surface (alt)
          800: "#111111", // elevated surface (cards)
          700: "#1A1A1A", // elevated hover
          600: "#262626",
          border: "#242424",
        },
        gold: {
          50: "#FBF6E9",
          100: "#F5E9C6",
          200: "#E6CF82", // champagne highlight
          300: "#F2C94C", // bright highlight gold
          400: "#D4AF37", // primary gold
          500: "#C4A02F",
          600: "#A6871F",
          700: "#806515", // dark gold
          800: "#5C4A10",
          900: "#3D310B",
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
