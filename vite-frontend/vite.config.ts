import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue"; // Use react() if using React
import { resolve } from "path";

export default defineConfig({
  plugins: [vue()], // Replace with react() if using React
  server: {
    port: Number(process.env.PORT) || 4173, // Convert to number to fix TypeScript error
    host: "0.0.0.0", // Ensure it listens on all network interfaces
  },
  build: {
    outDir: "dist", // Output directory for the build
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"), // Entry point
      },
    },
  },
  publicDir: "public", // Ensure static assets are correctly served
});
