import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["apple-touch-icon.png"],
      manifest: {
        name: "Italiano contrastivo",
        short_name: "Italiano",
        lang: "es",
        display: "standalone",
        start_url: "./",
        scope: "./",
        background_color: "#fbfaf7",
        theme_color: "#1b4965",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: { globPatterns: ["**/*.{js,css,html,json,md,png,svg}"] },
    }),
  ],
  server: { fs: { allow: [".."] } },
  test: { environment: "jsdom", include: ["src/**/*.test.{ts,tsx}"] },
});
