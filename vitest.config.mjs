import { defineConfig } from "vitest/config";

// La suite de la app (web/) corre con su propia configuración: `npm --prefix web test`.
export default defineConfig({ test: { include: ["tests/**/*.test.mjs"] } });
