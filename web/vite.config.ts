import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Identifica la versión publicada (visible en Ajustes) para saber qué app se está viendo.
const BUILD_ID = (process.env.GITHUB_SHA ?? "local").slice(0, 7);
const BUILD_DATE = new Date().toISOString().slice(0, 10);

export default defineConfig({
  base: "./",
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID), __BUILD_DATE__: JSON.stringify(BUILD_DATE) },
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
      // El precache es solo la app y el contenido (liviano: se instala rápido y no se aborta). El audio va aparte, a la caché
      // `audio-v1`: se guarda al escucharlo y se puede bajar entero desde Ajustes.
      workbox: {
        globPatterns: ["**/*.{js,css,html,json,md,png,svg,woff2,txt}"],
        // Los ejercicios van en un archivo por nivel (`items_A1.json`…): cada uno debe quedar bajo este tope (check-precache avisa al llegar al 85 %).
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        // Las atribuciones de Tatoeba (≈0,7 MB y crecen con cada nivel) están en la app y en el sitio; no hacen falta para trabajar sin conexión.
        globIgnores: ["**/ATTRIBUZIONI-*.md"],
        runtimeCaching: [{
          urlPattern: ({ url }) => url.pathname.endsWith(".mp3"),
          handler: "CacheFirst",
          options: { cacheName: "audio-v1", rangeRequests: true, cacheableResponse: { statuses: [200] } },
        }],
      },
    }),
  ],
  server: { fs: { allow: [".."] } },
  test: { environment: "jsdom", include: ["src/**/*.test.{ts,tsx}"] },
});
