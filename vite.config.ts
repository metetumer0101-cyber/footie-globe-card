// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // Build the SSR bundle for long-running Node hosting by default (nitro
  // `node-server` preset → a runnable `.output/`: `node .output/server/index.mjs`
  // serves the app). `scripts/publish-live.sh` builds this and serves it on port
  // 3000, the team's live-site port.
  //
  // The preset is selectable at build time via the `NITRO_PRESET` env var. When
  // set (e.g. `NITRO_PRESET=vercel bun run build`), that preset is used instead —
  // Vercel's git-linked auto-deploy runs `bun run build` and needs the `vercel`
  // serverless preset (the default `node-server` preset doesn't serve correctly on
  // Vercel). When unset, `node-server` remains the default, so local builds and the
  // team's port-3000 hosting are unchanged.
  nitro: { preset: process.env.NITRO_PRESET ?? "node-server" },
});
