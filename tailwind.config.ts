import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: { colors: { brand: { 50:"#eefcf9",100:"#d6f7f1",500:"#14b8a6",600:"#0d9488",700:"#0f766e",900:"#134e4a" } } } },
  plugins: []
};
export default config;
