// @ts-check
import { defineConfig } from "astro/config";
import path from "path";
import { fileURLToPath } from "url";

import sitemap from "@astrojs/sitemap";

import vercel from "@astrojs/vercel";

import svelte from "@astrojs/svelte";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [sitemap(), svelte()],
  server: { port: 3000 },
  vite: {
    plugins: [],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@components": path.resolve(__dirname, "./src/components"),
        "@lib": path.resolve(__dirname, "./src/lib"),
        "@stores": path.resolve(__dirname, "./src/lib/stores"),
        "@services": path.resolve(__dirname, "./src/lib/services"),
        "@types": path.resolve(__dirname, "./src/types.ts"),
        "@ztm-types": path.resolve(__dirname, "./src/ztm-types.ts"),
      },
    },
  },
  adapter: vercel({
    webAnalytics: { enabled: true },
  }),
});
