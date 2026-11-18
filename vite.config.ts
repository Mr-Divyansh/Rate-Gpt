import { cp } from "node:fs/promises";
import path from "path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const imageLibraryPlugin = {
  name: "copy-image-library",
  apply: "build" as const,
  async closeBundle() {
    await cp(
      path.resolve(rootDir, "Images"),
      path.resolve(rootDir, "dist", "Images"),
      { recursive: true },
    );
  },
};

export default defineConfig(() => {
  return {
    plugins: [imageLibraryPlugin],
    resolve: {
      alias: {
        "@": rootDir,
      },
    },
    build: {
      rollupOptions: {
        input: {
          home: path.resolve(rootDir, "index.html"),
          mandiPrices: path.resolve(rootDir, "mandi-prices.html"),
          about: path.resolve(rootDir, "about.html"),
          contact: path.resolve(rootDir, "contact.html"),
          weather: path.resolve(rootDir, "weather.html"),
          terms: path.resolve(rootDir, "terms.html"),
          privacy: path.resolve(rootDir, "privacy.html"),
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== "true",
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === "true" ? null : {},
    },
  };
});
