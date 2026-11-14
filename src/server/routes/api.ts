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
import { openApiSpec } from "../openapi.js";

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
router.get("/health", async (req: Request, res: Response) => {
  const apiKey = process.env.DATA_GOV_API_KEY?.trim();
  const apiKeyConfigured = Boolean(
    apiKey &&
    apiKey !== "your_data_gov_in_api_key_here" &&
    apiKey !== "MY_DATA_GOV_API_KEY",
  );
  return sendSuccess(
    res,
    {
      status: "healthy",
      version: "1.0.0",
      upstreamSource: {
        name: "Government of India OGD / AGMARKNET",
        apiKeyConfigured,
      },
      priceStorage: "disabled",
      serverTime: new Date().toISOString(),
    },
    undefined,
    "Backend operational",
  );
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
        scope: "Distinct values from a bounded live result page; market options may be partial.",
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
 * database rows or present them as live data.
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
        fruitSuggestions: true,
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

/**
 * 9. OpenAPI documentation (JSON)
 * GET /api/v1/docs
 */
router.get("/docs", async (_req: Request, res: Response) => {
  return res.status(200).json(openApiSpec);
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
