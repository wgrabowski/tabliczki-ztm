// @ts-check
import { defineConfig } from "astro/config";

import sitemap from "@astrojs/sitemap";

import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [sitemap()],
  server: { port: 3000 },
  vite: {
    plugins: [],
  },
  adapter: node({
    mode: "standalone",
  }),
});
