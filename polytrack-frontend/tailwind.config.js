/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary:   { DEFAULT: "#6366F1", hover: "#4F46E5", light: "#EEF2FF" },
        surface:   { DEFAULT: "#FFFFFF", soft: "#F8FAFC", border: "#E2E8F0" },
        text:      { primary: "#0F172A", secondary: "#64748B", muted: "#94A3B8" },
        success:   "#10B981",
        warning:   "#F59E0B",
        danger:    "#EF4444",
        sidebar:   { bg: "#0F172A", hover: "#1E293B", active: "#6366F1", text: "#94A3B8", textActive: "#FFFFFF" },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: { DEFAULT: "8px", lg: "12px", xl: "16px" },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        modal: "0 20px 60px -10px rgb(0 0 0 / 0.3)",
      }
    },
  },
  plugins: [],
}