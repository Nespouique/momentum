import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    // Muscle group colors - needed because they're dynamically generated
    // Rose (pecs)
    "bg-rose-500/15", "text-rose-400", "border-rose-500/30", "hover:bg-rose-500/20", "hover:text-rose-400",
    // Sky (dos)
    "bg-sky-500/15", "text-sky-400", "border-sky-500/30", "hover:bg-sky-500/20", "hover:text-sky-400",
    // Amber (epaules)
    "bg-amber-500/15", "text-amber-400", "border-amber-500/30", "hover:bg-amber-500/20", "hover:text-amber-400",
    // Emerald (biceps)
    "bg-emerald-500/15", "text-emerald-400", "border-emerald-500/30", "hover:bg-emerald-500/20", "hover:text-emerald-400",
    // Violet (triceps)
    "bg-violet-500/15", "text-violet-400", "border-violet-500/30", "hover:bg-violet-500/20", "hover:text-violet-400",
    // Orange (quadriceps)
    "bg-orange-500/15", "text-orange-400", "border-orange-500/30", "hover:bg-orange-500/20", "hover:text-orange-400",
    // Pink (ischios)
    "bg-pink-500/15", "text-pink-400", "border-pink-500/30", "hover:bg-pink-500/20", "hover:text-pink-400",
    // Indigo (fessiers)
    "bg-indigo-500/15", "text-indigo-400", "border-indigo-500/30", "hover:bg-indigo-500/20", "hover:text-indigo-400",
    // Cyan (abdos)
    "bg-cyan-500/15", "text-cyan-400", "border-cyan-500/30", "hover:bg-cyan-500/20", "hover:text-cyan-400",
    // Teal (mollets)
    "bg-teal-500/15", "text-teal-400", "border-teal-500/30", "hover:bg-teal-500/20", "hover:text-teal-400",
    // Lime (trapezes)
    "bg-lime-500/15", "text-lime-400", "border-lime-500/30", "hover:bg-lime-500/20", "hover:text-lime-400",
    // Yellow (lombaires)
    "bg-yellow-500/15", "text-yellow-400", "border-yellow-500/30", "hover:bg-yellow-500/20", "hover:text-yellow-400",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        // Custom accent colors
        "accent-blue": "hsl(var(--accent-blue))",
        "accent-orange": "hsl(var(--accent-orange))",
        "accent-green": "hsl(var(--accent-green))",
        "accent-yellow": "hsl(var(--accent-yellow))",
        "accent-red": "hsl(var(--accent-red))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-inter)"],
        mono: ["var(--font-jetbrains-mono)"],
      },
    },
  },
  plugins: [],
};

export default config;
