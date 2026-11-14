/**
 * Rate GPT — Production Server / API App
 *
 * Production-safe Express app. This module NEVER imports Vite or Rolldown.
 */
import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import crypto from "crypto";
import apiRouter from "./src/server/routes/api.ts";

dotenv.config();

// Basic environment validation (non-fatal warnings)
if (!process.env.DATA_GOV_API_KEY) {
  console.warn(
    "[Config] DATA_GOV_API_KEY is not set. Live government price requests will be unavailable.",
  );
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

export function createApiApp() {
  const app = express();

  // Vercel runs behind a single reverse proxy. Trust only that one hop so
  // rate limiting uses the real client IP from X-Forwarded-For without
  // allowing arbitrary client-supplied forwarded headers to spoof it.
  app.set("trust proxy", 1);

  // Compression for API responses
  app.use(compression());

  // Request ID + structured logging context
  app.use((req, res, next) => {
    const requestId =
      (req.headers["x-request-id"] as string) || crypto.randomUUID();
    (req as any).requestId = requestId;
    res.setHeader("X-Request-Id", requestId);
    next();
  });

  app.use(helmet({ contentSecurityPolicy: false }));

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests, please try again later.",
      },
    },
  });
  app.use("/api", apiLimiter);

  const liveDataLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: "Too many live market-data requests. Please try again later.",
      },
    },
  });
  app.use("/api/v1/prices", liveDataLimiter);
  app.use("/api/v1/meta/filters", liveDataLimiter);
  app.use("/api/v1/commodities/search", liveDataLimiter);
  const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { code: "RATE_LIMITED", message: "Too many contact attempts. Please try again later." } },
  });
  app.use("/api/v1/contact", contactLimiter);

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      if (req.path.startsWith("/api")) {
        console.log(
          `[HTTP] ${req.method} ${req.path} ${res.statusCode} (${duration}ms)`,
        );
      }
    });
    next();
  });

  // Government price data is fetched on demand; never serve stale intermediary copies.
  app.use("/api", (req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  app.use("/api/v1", apiRouter);
  app.use("/api", apiRouter);

  app.use(
    (
      err: any,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      const requestId = (req as any).requestId;
      console.error("[Server Error]", {
        requestId,
        message: err?.message || err,
        stack: process.env.NODE_ENV === "production" ? undefined : err?.stack,
      });
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected internal server error occurred",
        },
        requestId,
      });
    },
  );

  return app;
}

export const createServer = createApiApp;

// Only boot the standalone static-file server + listener when this file is the
// actual process entry point (e.g. `tsx server.ts` / `npm start`), not merely
// imported for its createApiApp factory. Without this check, anything that
// imports createApiApp from this module (server.dev.ts for `npm run dev`,
// src/server/tests/api.integration.ts) also triggers this block as a side
// effect of the import, which previously bound a second, stale server to
// PORT before the real caller could start its own — e.g. `npm run dev` would
// silently lose port 3000 to this block (serving an outdated dist/ build with
// no HMR) and fall back to 3001+ for the actual dev server.
const isMainModule =
  Boolean(process.argv[1]) && path.resolve(process.argv[1]!) === __filename;

if (isMainModule && !process.env.VERCEL) {
  const app = createApiApp();
  const distPath = path.resolve(__dirname, "dist");
  app.use(express.static(distPath));
  // Keep old market entry points pointed at the retained mandi price page.
  app.get("/app", (req, res) => {
    const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
    res.redirect(301, "/mandi-prices.html" + qs);
  });
  app.get("/app/*", (req, res) => {
    res.redirect(301, "/mandi-prices.html");
  });
  app.get("/market-price", (req, res) => {
    const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
    res.redirect(301, "/mandi-prices.html" + qs);
  });
  app.get("/market-price/*", (req, res) => {
    res.redirect(301, "/mandi-prices.html");
  });
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`=========================================`);
    console.log(`🌾 Rate GPT Server running on http://localhost:${PORT}`);
    console.log(
      `📡 API Endpoints available at http://localhost:${PORT}/api/v1`,
    );
    console.log(
      `🏛️ OGD Endpoint: ${process.env.DATA_GOV_API_BASE_URL || "https://api.data.gov.in/resource"}`,
    );
    console.log(`=========================================`);
  });
}
