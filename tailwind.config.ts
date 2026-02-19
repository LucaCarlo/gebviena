import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // GTV primary palette
        primary: "#204ce5",
        accent: "#eb5b27",
        "accent-dark": "#D24614",
        cream: "#f8f2e8",
        base: "#ffffff",
        dark: "#000000",
        "grey-dark": "#757f80",
        "grey-mid": "#c7cacd",
        "grey-light": "#f6f6f6",
        // Legacy aliases (admin pages + internal pages)
        brand: {
          50: "#f8f2e8",
          100: "#f2ede6",
          200: "#e5ddd1",
          300: "#c9b99f",
          400: "#a89675",
          500: "#eb5b27",
          600: "#6d5a3f",
          700: "#54432f",
          800: "#3d3122",
          900: "#2a2118",
          950: "#1a1410",
        },
        warm: {
          50: "#fafaf9",
          100: "#f5f4f2",
          200: "#e8e6e3",
          300: "#d4d1cc",
          400: "#a8a39c",
          500: "#7c766e",
          600: "#5c5650",
          700: "#434039",
          800: "#2d2b27",
          900: "#1c1b18",
        },
      },
      fontFamily: {
        serif: ['"Libre Caslon Text"', "Georgia", "Times New Roman", "serif"],
        sans: ["var(--font-work-sans)", "Work Sans", "Helvetica Neue", "Arial", "sans-serif"],
      },
      fontSize: {
        "h1": ["3.625rem", { lineHeight: "1.1" }],
        "h2": ["2.375rem", { lineHeight: "1.0" }],
        "h3": ["1.75rem", { lineHeight: "1.2" }],
        "h4": ["1.25rem", { lineHeight: "1.3" }],
        "body": ["1.25rem", { lineHeight: "1.3" }],
        "small": ["0.8125rem", { lineHeight: "1.4" }],
        "link": ["1rem", { lineHeight: "1.3" }],
      },
      maxWidth: {
        "8xl": "88rem",
        "content": "58.25rem",
        "wide": "73.125rem",
        "site": "1660px",
      },
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
        "26": "6.5rem",
        "30": "7.5rem",
        "34": "8.5rem",
      },
      transitionDuration: {
        "600": "600ms",
        "800": "800ms",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-left": {
          "0%": { opacity: "0", transform: "translateX(-100%)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.8s ease-out forwards",
        "slide-in-left": "slide-in-left 0.4s ease-out forwards",
      },
    },
  },
  plugins: [],
};
export default config;
