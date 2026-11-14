/**
 * Rate GPT — REST API Router
 *
 * Implements endpoints according to specs in docs/api.md with Zod validation,
 * consistent response envelopes, and error handling.
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import {
  fetchLiveFilters,
  fetchLivePrices,
  GovernmentApiError,
  searchLiveCommodities,
} from "../services/mandiDataService.js";

const router = Router();

function sendSuccess<T>(
  res: Response,
  data: T,
  meta?: any,
  message: string = "Success",
  status: number = 200,
) {
  return res.status(status).json({
    success: true,
    data,
    meta,
    message,
  });
}

function sendError(
  res: Response,
  code: string,
  message: string,
  status: number = 400,
  details?: any,
) {
  return res.status(status).json({
    success: false,
    error: {
      code,
      message,
      details,
    },
  });
}

/**
 * 1. Health & System Status Endpoint
 * GET /api/v1/health
 */
router.get("/health", (_req: Request, res: Response) => {
  return sendSuccess(res, { status: "ok" }, undefined, "Service available");
});

/**
 * 2. Filter Metadata Endpoint
 * GET /api/v1/meta/filters?state=...&district=...&search=...
 */
const filtersQuerySchema = z.object({
  state: z.string().trim().min(1).max(100).optional(),
  district: z.string().trim().min(1).max(100).optional(),
  market: z.string().trim().min(1).max(100).optional(),
});

router.get("/meta/filters", async (req: Request, res: Response) => {
  const parsed = filtersQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return sendError(
      res,
      "VALIDATION_ERROR",
      "Invalid filter query parameters",
      400,
      parsed.error.format(),
    );
  }

  try {
    const data = await fetchLiveFilters(parsed.data);
    return sendSuccess(
      res,
      data,
      {
        source: "Government of India OGD / AGMARKNET",
        scope: "Distinct values observed across up to two live government result pages; location options may be partial.",
      },
      "Live filter metadata retrieved",
    );
  } catch (err: any) {
    if (err instanceof GovernmentApiError) {
      return sendError(res, "UPSTREAM_ERROR", err.message, err.httpStatus);
    }
    return sendError(
      res,
      "UPSTREAM_ERROR",
      "Failed to retrieve live filter metadata",
      502,
    );
  }
});

/**
 * 3. Latest Mandi Prices Endpoint
 * GET /api/v1/prices
 */
const pricesQuerySchema = z.object({
  state: z.string().trim().min(1).max(100).optional(),
  district: z.string().trim().min(1).max(100).optional(),
  market: z.string().trim().min(1).max(100).optional(),
  commodity: z.string().trim().min(1).max(100).optional(),
  date: z.string().trim().min(1).max(20).optional(),
  search: z.string().trim().min(1).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).max(1_000_000).default(0),
  sort: z
    .enum([
      "modal_price_asc",
      "modal_price_desc",
      "market_asc",
      "market_desc",
      "date_desc",
      "date_asc",
      "commodity_asc",
      "commodity_desc",
    ])
    .default("date_desc"),
});

router.get("/prices", async (req: Request, res: Response) => {
  const parsed = pricesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return sendError(
      res,
      "VALIDATION_ERROR",
      "Invalid query parameters for prices",
      400,
      parsed.error.format(),
    );
  }

  try {
    const { date, ...filters } = parsed.data;
    const { records, meta } = await fetchLivePrices({
      ...filters,
      arrivalDate: date,
    });
    return sendSuccess(res, records, meta, "Live prices fetched successfully");
  } catch (err: any) {
    if (err instanceof GovernmentApiError) {
      return sendError(res, "UPSTREAM_ERROR", err.message, err.httpStatus, {
        upstreamStatus: err.upstreamStatus,
      });
    }
    console.error("[Route /prices] Operation=getMandiPrices failed", {
      name: err?.name,
      code: err?.code,
    });
    return sendError(
      res,
      "UPSTREAM_ERROR",
      "Failed to fetch live mandi prices",
      502,
    );
  }
});

/**
 * 4. Historical trend endpoint
 *
 * Historical price series are intentionally not retained. The upstream
 * resource exposes arrival-date observations, not a guaranteed historical
 * time-series query for arbitrary date ranges. Do not silently read legacy
 * retained rows or present them as live data.
 */
router.get("/prices/trend", (_req: Request, res: Response) => {
  return sendError(
    res,
    "HISTORICAL_STORAGE_DISABLED",
    "Historical price charts are unavailable because Rate-GPT does not retain historical mandi prices.",
    410,
  );
});

/**
 * 5. Live market comparison endpoint
 * GET /api/v1/prices/compare?commodity=...&date=...
 */
const compareQuerySchema = z.object({
  commodity: z.string().trim().min(1).max(100),
  date: z.string().trim().min(1).max(20).optional(),
});

router.get("/prices/compare", async (req: Request, res: Response) => {
  const parsed = compareQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return sendError(
      res,
      "VALIDATION_ERROR",
      "Commodity is required for market comparison",
      400,
      parsed.error.format(),
    );
  }

  try {
    const records = await fetchLivePrices({
      commodity: parsed.data.commodity,
      arrivalDate: parsed.data.date,
      limit: 100,
      offset: 0,
      sort: "modal_price_desc",
    });
    return sendSuccess(
      res,
      records.records,
      {
        ...records.meta,
        marketsCompared: records.records.length,
        commodity: parsed.data.commodity,
        comparisonMayBePartial: records.meta.hasNext,
        scope: "First live government API page only; use pagination for further results.",
      },
      "Live market comparison fetched",
    );
  } catch (err: any) {
    if (err instanceof GovernmentApiError) {
      return sendError(res, "UPSTREAM_ERROR", err.message, err.httpStatus, {
        upstreamStatus: err.upstreamStatus,
      });
    }
    return sendError(res, "UPSTREAM_ERROR", "Failed to compare live markets", 502);
  }
});

/**
 * 6. Commodity Search Autocomplete Endpoint
 * GET /api/v1/commodities/search?q=tom&limit=10
 */
const searchCommSchema = z.object({
  q: z.string().trim().min(1, "Search query is required").max(100),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

router.get("/commodities/search", async (req: Request, res: Response) => {
  const parsed = searchCommSchema.safeParse(req.query);
  if (!parsed.success) {
    return sendError(
      res,
      "VALIDATION_ERROR",
      "Invalid search query",
      400,
      parsed.error.format(),
    );
  }

  try {
    const results = await searchLiveCommodities(parsed.data.q, parsed.data.limit);
    return sendSuccess(
      res,
      results,
      {
        count: results.length,
        source: "Government of India OGD / AGMARKNET",
        sourceDerived: true,
      },
      "Live commodity search completed",
    );
  } catch (err: any) {
    if (err instanceof GovernmentApiError) {
      return sendError(res, "UPSTREAM_ERROR", err.message, err.httpStatus);
    }
    return sendError(res, "UPSTREAM_ERROR", "Commodity search failed", 502);
  }
});


// Contact form: personal data is validated and forwarded server-to-server.
// The Web3Forms access key is never included in browser code or responses.
const contactSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.union([z.string().trim().email().max(254), z.literal("")]).optional(),
  phone: z.string().trim().max(24).optional(),
  message: z.string().trim().min(1).max(5000),
  consent: z.literal(true),
  botcheck: z.union([z.string(), z.null()]).optional(),
}).refine((value) => Boolean(value.email || value.phone), {
  message: "An email address or phone number is required.",
  path: ["email"],
});

router.post("/contact", async (req: Request, res: Response) => {
  if (typeof req.body?.botcheck === "string" && req.body.botcheck.trim()) {
    return sendSuccess(res, { accepted: true }, undefined, "Message received");
  }
  const parsed = contactSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, "VALIDATION_ERROR", "Please check the contact form and required consent.", 400);
  }
  const accessKey = process.env.WEB3FORMS_ACCESS_KEY?.trim();
  if (!accessKey) {
    return sendError(res, "CONTACT_UNAVAILABLE", "The contact form is temporarily unavailable.", 503);
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let upstream: globalThis.Response;
    try {
      upstream = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: accessKey,
          subject: "New Rate-GPT Contact Request",
          from_name: "Rate-GPT Contact Form",
          name: parsed.data.name,
          email: parsed.data.email || "",
          phone: parsed.data.phone || "",
          message: parsed.data.message,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
    const result = await upstream.json().catch(() => null);
    if (!upstream.ok || result?.success !== true) {
      return sendError(res, "CONTACT_DELIVERY_FAILED", "The message could not be delivered. Please try again later.", 502);
    }
    return sendSuccess(res, { accepted: true }, undefined, "Message received");
  } catch {
    return sendError(res, "CONTACT_DELIVERY_FAILED", "The message could not be delivered. Please try again later.", 502);
  }
});

router.get("/sync-status", (_req: Request, res: Response) => {
  return sendSuccess(res, {
    mode: "on-demand",
    schedulerEnabled: false,
    bulkSyncEnabled: false,
    priceStorage: "disabled",
    source: "Government of India OGD / AGMARKNET",
    freshnessStatus:
      "Data is fetched from the government source when requested; published arrival data is not guaranteed real-time.",
    lastFetchedAt: null,
    timestamp: new Date().toISOString(),
  });
});
export default router;
