/**
 * Rate GPT — REST API Router
 *
 * Implements endpoints according to specs in docs/api.md with Zod validation,
 * consistent response envelopes, and error handling.
 */

import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import crypto from "crypto";
import {
  getFilterMetadata,
  getMandiPrices,
  getPriceTrend,
  getMarketComparison,
  searchCommodities,
  getDatabaseStats,
  getRecentSyncLogs,
} from "../db/database-factory.js";
import { syncMandiPricesFromUpstream } from "../services/mandiDataService.js";
import { openApiSpec } from "../openapi.js";

const router = Router();

// Admin authentication helper (timing-safe)
function requireAdminAuth(req: Request, res: Response): boolean {
  const expectedKey = process.env.ADMIN_SYNC_KEY;
  if (
    !expectedKey ||
    expectedKey.length < 32 ||
    expectedKey === "change_this_to_a_secure_token" ||
    expectedKey === "replace_with_a_long_random_secret"
  ) {
    sendError(
      res,
      "SERVICE_UNAVAILABLE",
      "Admin synchronization is disabled: ADMIN_SYNC_KEY is not configured.",
      503,
    );
    return false;
  }

  const authHeader = req.headers.authorization;
  const providedToken = authHeader
    ? authHeader.replace(/^Bearer\s+/i, "")
    : req.body?.adminKey;
  if (
    typeof providedToken !== "string" ||
    providedToken.length !== expectedKey.length
  ) {
    sendError(
      res,
      "UNAUTHORIZED",
      "Invalid or missing admin synchronization token",
      401,
    );
    return false;
  }
  const providedBuf = Buffer.from(providedToken);
  const expectedBuf = Buffer.from(expectedKey);
  if (!crypto.timingSafeEqual(providedBuf, expectedBuf)) {
    sendError(
      res,
      "UNAUTHORIZED",
      "Invalid or missing admin synchronization token",
      401,
    );
    return false;
  }
  return true;
}

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
  try {
    const stats = await getDatabaseStats();
    const hasApiKey = Boolean(
      process.env.DATA_GOV_API_KEY &&
      process.env.DATA_GOV_API_KEY !== "your_data_gov_in_api_key_here" &&
      process.env.DATA_GOV_API_KEY !== "MY_DATA_GOV_API_KEY",
    );

    return sendSuccess(
      res,
      {
        status: "healthy",
        version: "1.0.0",
        upstreamSource: {
          name: "Government of India Open Government Data (OGD / AGMARKNET)",
          resourceId:
            process.env.DATA_GOV_RESOURCE_ID ||
            "9ef84268-d588-465a-a308-a864a43d0070",
          apiKeyConfigured: hasApiKey,
        },
        stats: {
          totalRecords: stats.totalRecords,
          commoditiesTracked: stats.commoditiesCount,
          mandisCovered: stats.mandisCount,
          statesCovered: stats.statesCount,
          latestArrivalDate: stats.latestArrivalDate,
          lastSync: stats.lastSync,
        },
        serverTime: new Date().toISOString(),
      },
      undefined,
      "Backend operational",
    );
  } catch (err: any) {
    return sendError(
      res,
      "INTERNAL_ERROR",
      err.message || "Database health check failed",
      500,
    );
  }
});

/**
 * 2. Filter Metadata Endpoint
 * GET /api/v1/meta/filters?state=...&district=...&search=...
 */
const filtersQuerySchema = z.object({
  state: z.string().optional(),
  district: z.string().optional(),
  market: z.string().optional(),
  search: z.string().optional(),
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
    const data = await getFilterMetadata(parsed.data);
    return sendSuccess(res, data, undefined, "Filter metadata retrieved");
  } catch (err: any) {
    return sendError(
      res,
      "INTERNAL_ERROR",
      "Failed to retrieve filter metadata",
      500,
    );
  }
});

/**
 * 3. Latest Mandi Prices Endpoint
 * GET /api/v1/prices
 */
const pricesQuerySchema = z.object({
  state: z.string().optional(),
  district: z.string().optional(),
  market: z.string().optional(),
  commodity: z.string().optional(),
  variety: z.string().optional(),
  date: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
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
    const { records, meta } = await getMandiPrices(parsed.data);
    return sendSuccess(res, records, meta, "Prices fetched successfully");
  } catch (err: any) {
    // Safe diagnostic logging (no secrets).
    console.error("[Route /prices] Operation=getMandiPrices failed");
    console.error("[Route /prices] Error name:", err?.name);
    console.error("[Route /prices] Error message:", err?.message);
    console.error("[Route /prices] Stack:", err?.stack);
    return sendError(
      res,
      "INTERNAL_ERROR",
      err?.message || "Failed to fetch mandi prices",
      500,
    );
  }
});

/**
 * 4. Price Trend Endpoint
 * GET /api/v1/prices/trend
 * Returns actual stored historical observations only.
 */
const trendQuerySchema = z.object({
  commodity: z.string().min(1, "Commodity name is required"),
  market: z.string().min(1, "Market/mandi name is required"),
  state: z.string().optional(),
  district: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

router.get("/prices/trend", async (req: Request, res: Response) => {
  const parsed = trendQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return sendError(
      res,
      "VALIDATION_ERROR",
      "Commodity and market are required for price trend",
      400,
      parsed.error.format(),
    );
  }

  try {
    const { commodity, market, state, district, from, to } = parsed.data;
    const records = await getPriceTrend(commodity, market, state, district, from, to);
    return sendSuccess(
      res,
      records,
      {
        pointsCount: records.length,
        commodity,
        market,
        dateRange:
          records.length > 0
            ? {
                earliest: records[0].arrival_date,
                latest: records[records.length - 1].arrival_date,
              }
            : null,
      },
      "Price trend fetched successfully",
    );
  } catch (err: any) {
    return sendError(res, "INTERNAL_ERROR", "Failed to fetch price trend", 500);
  }
});

/**
 * 5. Market Comparison Endpoint
 * GET /api/v1/prices/compare?commodity=...&date=...
 */
const compareQuerySchema = z.object({
  commodity: z.string().min(1, "Commodity is required"),
  date: z.string().optional(),
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
    const records = await getMarketComparison(
      parsed.data.commodity,
      parsed.data.date,
    );
    return sendSuccess(
      res,
      records,
      {
        marketsCompared: records.length,
        commodity: parsed.data.commodity,
      },
      "Market comparison fetched",
    );
  } catch (err: any) {
    return sendError(res, "INTERNAL_ERROR", "Failed to compare markets", 500);
  }
});

/**
 * 6. Commodity Search Autocomplete Endpoint
 * GET /api/v1/commodities/search?q=tom&limit=10
 */
const searchCommSchema = z.object({
  q: z.string().min(1, "Search query is required"),
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
    const results = await searchCommodities(parsed.data.q, parsed.data.limit);
    return sendSuccess(
      res,
      results,
      { count: results.length },
      "Commodity search completed",
    );
  } catch (err: any) {
    return sendError(res, "INTERNAL_ERROR", "Commodity search failed", 500);
  }
});

/**
 * 7. Admin Data Sync Endpoint
 * POST /api/v1/admin/sync
 * Protected via ADMIN_SYNC_KEY (or simple token)
 */
const syncBodySchema = z.object({
  state: z.string().optional(),
  district: z.string().optional(),
  market: z.string().optional(),
  commodity: z.string().optional(),
  arrivalDate: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

router.post("/admin/sync", async (req: Request, res: Response) => {
  if (!requireAdminAuth(req, res)) return;

  const parsed = syncBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(
      res,
      "VALIDATION_ERROR",
      "Invalid sync request body",
      400,
      parsed.error.format(),
    );
  }

  try {
    const result = await syncMandiPricesFromUpstream(parsed.data);
    return sendSuccess(
      res,
      result,
      undefined,
      result.message,
      result.success ? 200 : 207,
    );
  } catch (err: any) {
    return sendError(
      res,
      "SYNC_FAILED",
      err.message || "Internal error during synchronization",
      500,
    );
  }
});

/**
 * 8. Audit Logs Endpoint
 * GET /api/v1/admin/logs
 */
router.get("/admin/logs", async (req: Request, res: Response) => {
  if (!requireAdminAuth(req, res)) return;
  try {
    const logs = await getRecentSyncLogs(20);
    return sendSuccess(
      res,
      logs,
      { count: logs.length },
      "Sync audit logs retrieved",
    );
  } catch (err: any) {
    return sendError(res, "INTERNAL_ERROR", "Failed to retrieve logs", 500);
  }
});

/**
 * 9. OpenAPI documentation (JSON)
 * GET /api/v1/docs
 */
router.get("/docs", async (_req: Request, res: Response) => {
  return res.status(200).json(openApiSpec);
});

export default router;
