import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        aurora: {
          cyan: "#5CE1E6",
          purple: "#7F5AF0",
          green: "#2CB67D",
          navy: "#16161A"
        }
      },
      backgroundImage: {
        "aurora-gradient": "radial-gradient(circle at top left, rgba(92, 225, 230, 0.35), transparent 55%), radial-gradient(circle at top right, rgba(127, 90, 240, 0.25), transparent 50%), radial-gradient(circle at bottom, rgba(44, 182, 125, 0.2), transparent 60%)"
      },
      boxShadow: {
        glow: "0 0 30px rgba(127, 90, 240, 0.35)",
        glass: "0 25px 50px -12px rgba(15, 23, 42, 0.45)"
      }
    }
  },
  plugins: []
};

export default config;
