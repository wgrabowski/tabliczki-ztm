/// <reference types="vitest" />
import { getViteConfig } from "astro/config";

export default getViteConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/tests/unit/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        "src/tests/",
        "**/*.test.ts",
        "**/*.spec.ts",
        "src/env.d.ts",
        "src/db/database.types.ts",
        "*.config.*",
        ".astro/",
        "dist/",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
    include: ["src/**/*.test.ts"],
    exclude: ["node_modules", "dist", ".astro", "src/tests/e2e"],
  },
});
