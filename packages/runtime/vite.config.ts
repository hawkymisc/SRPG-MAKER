import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  base: "./",
  root: resolve(__dirname),
  publicDir: resolve(__dirname, "../../templates/sample"),
  server: {
    port: 5174,
    fs: {
      allow: [resolve(__dirname, "../..")],
    },
  },
  resolve: {
    alias: {
      "@srpg/shared": resolve(__dirname, "../shared/src/index.ts"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
