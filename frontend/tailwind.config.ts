import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Geist", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "SFMono-Regular", "monospace"],
        serif: ["Instrument Serif", "Iowan Old Style", "Georgia", "serif"],
      },
      colors: {
        // Surface — black scale (hex so `/opacity` modifiers keep working)
        bg: {
          0: "#000000",
          1: "#050505",
          2: "#0B0B0B",
          3: "#141414",
          4: "#1C1C1C",
        },
        // Borders — white overlays
        line: {
          1: "rgba(255,255,255,0.10)",
          2: "rgba(255,255,255,0.16)",
          3: "rgba(255,255,255,0.22)",
        },
        // Text — white ramp with opacity
        ink: {
          0: "#FFFFFF",
          1: "rgba(255,255,255,0.72)",
          2: "rgba(255,255,255,0.55)",
          3: "rgba(255,255,255,0.40)",
          4: "rgba(255,255,255,0.26)",
        },
        // Brand — cyan primary, deep cyan, warm orange secondary
        brand: {
          DEFAULT: "#06B6D4",
          bright: "#22D3EE",
          deep: "#0891B2",
          warm: "#F97316",
        },
      },
      borderRadius: {
        xs: "6px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "22px",
      },
      boxShadow: {
        panel: "0 18px 60px rgba(0, 0, 0, 0.45)",
        card: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 24px -16px rgba(0,0,0,0.8)",
        pop: "0 1px 0 0 rgba(255,255,255,0.05) inset, 0 24px 60px -24px rgba(0,0,0,0.85)",
        "glow-cyan": "0 0 0 1px rgba(6,182,212,0.25), 0 8px 30px -8px rgba(6,182,212,0.35)",
        "glow-orange": "0 0 0 1px rgba(249,115,22,0.25), 0 8px 30px -8px rgba(249,115,22,0.30)",
      },
    },
  },
  plugins: [],
} satisfies Config;
