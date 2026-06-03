import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ['selector', 'html[data-theme="dark"]'],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
