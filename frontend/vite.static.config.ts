import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Render a SPA shell at build time; FastAPI serves only dist/client at runtime.
export default defineConfig({
  nitro: false,
  tanstackStart: {
    server: { entry: "server" },
    spa: {
      enabled: true,
      prerender: { outputPath: "/index.html" },
    },
  },
});
