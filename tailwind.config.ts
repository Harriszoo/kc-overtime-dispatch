import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "kc-blue": {
          50:  "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          500: "#1a56db",
          600: "#1344c4",
          700: "#0f379f",
          900: "#0a2463",
        },
      },
    },
  },
  plugins: [forms],
};

export default config;
