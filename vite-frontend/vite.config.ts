import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

export default defineConfig({
  plugins: [vue()],
  base: "./",  // ✅ Ensure correct base path for Azure
  server: {
    port: Number(process.env.PORT) || 8080, // ✅ Ensure compatibility with Azure
    host: "0.0.0.0",
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
      },
    },
  },
  publicDir: "public",
});
