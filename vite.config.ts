import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

/**
 * The game needs nothing from anywhere else: no third-party scripts, no network calls, no inline
 * code. Saying so in a policy means that even a bug (or a bad dependency) cannot make the page
 * load or run something unexpected. Images may be `data:` URLs because Vite inlines tiny ones.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

/** Only for the production build: the dev server injects inline scripts for hot reload. */
function contentSecurityPolicy(): Plugin {
  return {
    name: "content-security-policy",
    apply: "build",
    transformIndexHtml: () => [
      {
        tag: "meta",
        attrs: { "http-equiv": "Content-Security-Policy", content: CONTENT_SECURITY_POLICY },
        injectTo: "head-prepend",
      },
    ],
  };
}

export default defineConfig({
  // Relative base: the build works from any sub-path (GitHub Pages, itch.io, a local folder).
  base: "./",
  plugins: [contentSecurityPolicy()],
  build: {
    target: "es2022",
    sourcemap: true,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
