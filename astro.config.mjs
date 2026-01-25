// @ts-check
import { defineConfig } from "astro/config";

import sitemap from "@astrojs/sitemap";

import vercel from "@astrojs/vercel";

import svelte from "@astrojs/svelte";

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [sitemap(), svelte()],
  server: { port: 3000 },
  vite: {
    plugins: [],
  },
  adapter: vercel({
    webAnalytics: { enabled: true },
  }),
});
