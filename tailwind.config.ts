import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F3F4EF",
        ink: "#16202A",
        muted: "#566270",
        line: "#D8DCD2",
        sign: { DEFAULT: "#0E6B52", dark: "#0A4F3C", light: "#DDEFE7" },
        hazard: { DEFAULT: "#F4B400", dark: "#8A6400", light: "#FFF3CC" },
      },
      fontFamily: {
        display: [
          "Bahnschrift",
          '"Segoe UI Variable Display"',
          '"Segoe UI"',
          "system-ui",
          "sans-serif",
        ],
        sans: [
          '"Segoe UI Variable Text"',
          '"Segoe UI"',
          "system-ui",
          "-apple-system",
          "Roboto",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
