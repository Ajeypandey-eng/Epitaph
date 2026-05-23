import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./types/**/*.{ts}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Geist Mono", "monospace"],
      },
      colors: {
        void: "#050508",
        surface: {
          DEFAULT: "#0a0a12",
          alt: "#12121e",
        },
        "bitrot-purple": "#a78bfa",
        "bitrot-blue": "#60a5fa",
        "bitrot-green": "#34d399",
        "health-critical": "#ff2d55",
        "health-decaying": "#ff9f0a",
        "health-fading": "#ffd60a",
        "health-healthy": "#30d158",
      },
      animation: {
        "pulse-critical": "pulse-critical 1.2s ease-in-out infinite",
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
      },
      keyframes: {
        "pulse-critical": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
