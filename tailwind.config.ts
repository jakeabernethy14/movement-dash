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
          50: "#fdf8ec",
          100: "#faedc4",
          200: "#f5da8d",
          300: "#f0c355",
          400: "#e9ad33",
          500: "#d99a21", // primary accent
          600: "#b87e18",
          700: "#946116",
          800: "#784f18",
          900: "#654318",
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
