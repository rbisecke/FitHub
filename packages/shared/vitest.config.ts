import { defineConfig } from "vitest/config";

// Pure-TS package (0.29): no DOM, no React — the Node environment is sufficient.
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
  },
});
