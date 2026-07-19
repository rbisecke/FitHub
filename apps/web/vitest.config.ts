import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    // Default environment is node; component/a11y specs opt into jsdom per-file with
    // a `// @vitest-environment jsdom` comment (vitest-axe requires jsdom, not
    // happy-dom — 09 §8).
    environment: "node",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // e2e/ uses Playwright — exclude it from Vitest discovery.
    exclude: ["e2e/**", "**/node_modules/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
