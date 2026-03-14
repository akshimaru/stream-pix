import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/shared/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#060816",
        foreground: "#f6f7fb",
        card: "#0f1730",
        border: "rgba(135, 148, 186, 0.2)",
        muted: "#8fa1d1",
        primary: "#8b5cf6",
        secondary: "#22d3ee",
        accent: "#f472b6",
        success: "#34d399",
        warning: "#fbbf24",
        danger: "#fb7185",
      },
      boxShadow: {
        neon: "0 0 0 1px rgba(139,92,246,.25), 0 16px 48px rgba(34,211,238,.14), 0 8px 20px rgba(244,114,182,.12)",
      },
      backgroundImage: {
        "hero-grid":
          "radial-gradient(circle at top, rgba(139,92,246,0.22), transparent 35%), radial-gradient(circle at 80% 10%, rgba(34,211,238,0.15), transparent 30%), linear-gradient(135deg, rgba(12,18,38,0.95), rgba(4,7,18,1))",
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        pulseGlow: "pulseGlow 2.8s ease-in-out infinite",
        shimmer: "shimmer 1.6s linear infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0 rgba(34,211,238,0.15)" },
          "50%": { boxShadow: "0 0 30px rgba(34,211,238,0.25)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      borderRadius: {
        xl: "1.25rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
    },
  },
  plugins: [],
};

export default config;
