import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, "index.html"),
          home: path.resolve(__dirname, "home.html"),
          mandiPrice: path.resolve(__dirname, "mandiPrice.html"),
          app: path.resolve(__dirname, "app.html"),
          about: path.resolve(__dirname, "about.html"),
          calculator: path.resolve(__dirname, "calculator.html"),
          comparison: path.resolve(__dirname, "comparison.html"),
          crops: path.resolve(__dirname, "crops.html"),
          mandiPricesPage: path.resolve(__dirname, "mandi-prices.html"),
          marketDashboard: path.resolve(__dirname, "marketDashboard.html"),
          priceTrendsPage: path.resolve(__dirname, "price-trends.html"),
          watchlist: path.resolve(__dirname, "watchlist.html"),
          mandiPrices: path.resolve(__dirname, "mandiPrices.html"),
          priceTrends: path.resolve(__dirname, "priceTrends.html"),
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
