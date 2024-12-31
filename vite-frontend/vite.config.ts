import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue"; // Use react if you choose a React template
import { resolve } from "path";

export default defineConfig({
  plugins: [vue()], // Replace with react() if using React
  build: {
    outDir: "dist", // Output directory for the build
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"), // Entry point
      },
    },
  },
});
