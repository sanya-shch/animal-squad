import { defineConfig } from "vitest/config";

export default defineConfig({
  // Relative base: the build works from any sub-path (GitHub Pages, itch.io, a local folder).
  base: "./",
  build: {
    target: "es2022",
    sourcemap: true,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
