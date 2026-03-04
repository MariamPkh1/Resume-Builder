import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    exclude: ["canvg", "core-js"],
    include: ["jspdf", "html2canvas"],
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
});
