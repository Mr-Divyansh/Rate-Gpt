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
import {
  fetchAgmarknet2Filters,
  normalizeAgmarknetStateName,
  searchAgmarknet2Commodities,
} from "../services/agmarknet2Service.js";

const router = Router();

// Machine-readable API discovery for AI agents and developer tools.
router.get("/", (_req: Request, res: Response) => {
  return sendSuccess(res, {
    name: "Rate-GPT Mandi Prices API",
    version: "1.0.0",
    commitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    description: "On-demand government-reported Indian mandi price observations and a consent-based contact form. Price records are not stored by Rate-GPT.",
    documentation: "https://rate-gpt.vercel.app/docs/api.md",
    openapi: "https://rate-gpt.vercel.app/openapi.json",
    llms: "https://rate-gpt.vercel.app/llms.txt",
    endpoints: {
      filters: "/api/v1/meta/filters",
      prices: "/api/v1/prices",
      compare: "/api/v1/prices/compare",
      commoditySearch: "/api/v1/commodities/search",
      syncStatus: "/api/v1/sync-status",
      health: "/api/v1/health",
      trend: "/api/v1/prices/trend",
      contact: "/api/v1/contact"
    },
    responseFormat: "{ success, data, meta, message }",
    priceDataMode: "live-on-demand",
    priceStorage: "disabled",
    source: "Government of India OGD / AGMARKNET"
  }, undefined, "API discovery document");
});

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
    const data = await fetchAgmarknet2Filters(parsed.data).catch((error: unknown) => {
      // Keep the OGD resource as a live fallback if the newer AGMARKNET 2.0
      // directory is temporarily unavailable, but leave a safe diagnostic so
      // silent source fallback can be investigated from server logs.
      console.warn("[AGMARKNET 2.0] Directory unavailable; using OGD filter fallback", {
        name: error instanceof Error ? error.name : "UnknownError",
        message: error instanceof Error ? error.message : "Unknown directory error",
      });
      return fetchLiveFilters(parsed.data);
    });
    // This endpoint contains only the public administrative directory (not prices or user data).
    // Let Vercel edge cache it so cold starts do not repeatedly wait on AGMARKNET.
    res.setHeader("Cache-Control", "public, s-maxage=900, stale-while-revalidate=3600, max-age=0");
    const source = "source" in data && typeof data.source === "string"
      ? data.source
      : "Government of India OGD / AGMARKNET";
    return sendSuccess(
      res,
      data,
      {
        source,
        scope: data.coverage.message,
        coverage: data.coverage,
        filterCacheStatus: data.cache.status,
        filterCacheTtlMs: data.cache.ttlMs,
        filterCacheStoredAt: data.cache.storedAt,
        filterCacheAppliesTo: data.cache.appliesTo,
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
 * 3. Latest government-reported mandi prices endpoint
 * GET /api/v1/prices
 */
const pricesQuerySchema = z.object({
  state: z.string().trim().min(1).max(100).optional(),
  district: z.string().trim().min(1).max(100).optional(),
  market: z.string().trim().min(1).max(100).optional(),
  commodity: z.string().trim().min(1).max(100).optional(),
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
  // The public OGD price resource does not expose a reliable historical date filter.
  // Reject legacy date queries instead of silently returning an unrelated live page.
  if (req.query.date !== undefined) {
    return sendError(
      res,
      "HISTORICAL_DATE_UNAVAILABLE",
      "The government price feed does not support reliable historical date queries. Rate-GPT shows only observations actually returned by the live source.",
      410,
    );
  }

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
    const liveOptions = {
      ...parsed.data,
      state: parsed.data.state ? normalizeAgmarknetStateName(parsed.data.state) : undefined,
    };
    // Price records come only from the key-authenticated OGD resource.
    // The public AGMARKNET 2.0 monthly report is CAPTCHA-gated and is not
    // automated. The AGMARKNET 2.0 directory is used for selector metadata.
    const result = await fetchLivePrices(liveOptions);
    // Short edge TTL only: source prices are daily observations, and identical
    // queries can safely share a 60-second edge-cached response. No database/persistent cache.
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300, max-age=0");
    res.setHeader("Vercel-CDN-Cache-Control", "max-age=60, stale-while-revalidate=300");
    return sendSuccess(
      res,
      result.records,
      result.meta,
      "Latest government-reported prices fetched successfully",
    );
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
router.get("/prices/compare", (_req: Request, res: Response) => {
  // The selected OGD feed cannot reliably retrieve arbitrary historical dates.
  // Do not compare a current response as if it belonged to a requested past date.
  return sendError(
    res,
    "HISTORICAL_DATE_UNAVAILABLE",
    "Date-specific market comparisons are unavailable because the government price feed does not provide a reliable historical date query.",
    410,
  );
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
    let results: string[];
    try {
      results = await searchAgmarknet2Commodities(parsed.data.q, parsed.data.limit);
    } catch {
      results = await searchLiveCommodities(parsed.data.q, parsed.data.limit);
    }
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=900, max-age=0");
    res.setHeader("Vercel-CDN-Cache-Control", "max-age=300, stale-while-revalidate=900");
    return sendSuccess(
      res,
      results,
      {
        count: results.length,
        source: "Government of India AGMARKNET 2.0",
        sourceDerived: true,
      },
      "Government-reported commodity search completed",
    );
  } catch (err: any) {
    if (err instanceof GovernmentApiError) {
      return sendError(res, "UPSTREAM_ERROR", err.message, err.httpStatus);
    }
    return sendError(res, "UPSTREAM_ERROR", "Commodity search failed", 502);
  }
});



/**
 * Live public GitHub contribution summary for the About page.
 * Counts repository commits, authored PRs, issue comments and PR review comments.
 * GitHub's public API is cached at the edge to avoid repeated anonymous API calls.
 */
const CONTRIBUTOR_LOGINS = ["Mr-Divyansh", "AbhayWebWorld"] as const;
const GITHUB_REPO = "Mr-Divyansh/Rate-Gpt";
const githubJsonCache = new Map<string, { expiresAt: number; data: any }>();

async function githubGetJson(url: string): Promise<any> {
  const cached = githubJsonCache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.data;
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "Rate-GPT-About-Contributions",
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    const error: any = new Error("GitHub contribution data is temporarily unavailable");
    error.status = response.status === 403 || response.status === 429 ? 503 : 502;
    throw error;
  }
  if (response.status === 202) return null; // GitHub is still calculating contributor statistics.
  const data = await response.json();
  githubJsonCache.set(url, { expiresAt: Date.now() + 5 * 60 * 1000, data });
  return data;
}

async function githubGetPages(pathname: string, maxPages = 20): Promise<any[]> {
  const items: any[] = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/${pathname}${pathname.includes("?") ? "&" : "?"}per_page=100&page=${page}`;
    const batch = await githubGetJson(url);
    if (!Array.isArray(batch)) break;
    items.push(...batch);
    if (batch.length < 100) break;
  }
  return items;
}

router.get("/github/contributions", async (_req: Request, res: Response) => {
  try {
    const [contributors, pulls, issueComments, reviewComments] = await Promise.all([
      githubGetJson(`https://api.github.com/repos/${GITHUB_REPO}/stats/contributors`),
      githubGetPages("pulls?state=all"),
      githubGetPages("issues/comments"),
      githubGetPages("pulls/comments"),
    ]);
    if (!Array.isArray(contributors)) {
      return sendError(res, "GITHUB_STATS_PROCESSING", "GitHub is still calculating repository contribution statistics. Please retry shortly.", 503);
    }
    const people = CONTRIBUTOR_LOGINS.map((login) => {
      const stats = Array.isArray(contributors)
        ? contributors.find((entry: any) => entry?.author?.login?.toLowerCase() === login.toLowerCase())
        : undefined;
      const authoredPulls = pulls.filter((pr: any) => pr?.user?.login?.toLowerCase() === login.toLowerCase());
      const issueCommentCount = issueComments.filter((comment: any) => comment?.user?.login?.toLowerCase() === login.toLowerCase()).length;
      const reviewCommentCount = reviewComments.filter((comment: any) => comment?.user?.login?.toLowerCase() === login.toLowerCase()).length;
      const weeks = Array.isArray(stats?.weeks) ? stats.weeks : [];
      return {
        login,
        commits: Number(stats?.total ?? 0),
        pullRequests: authoredPulls.length,
        comments: issueCommentCount + reviewCommentCount,
        issueComments: issueCommentCount,
        reviewComments: reviewCommentCount,
        additions: weeks.reduce((sum: number, week: any) => sum + Number(week?.a ?? 0), 0),
        deletions: weeks.reduce((sum: number, week: any) => sum + Number(week?.d ?? 0), 0),
        codeChanges: weeks.reduce((sum: number, week: any) => sum + Number(week?.a ?? 0) + Number(week?.d ?? 0), 0),
        statsAvailable: Boolean(stats),
      };
    });
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=900, max-age=0");
    res.setHeader("Vercel-CDN-Cache-Control", "max-age=300, stale-while-revalidate=900");
    return sendSuccess(res, {
      repository: GITHUB_REPO,
      period: "all-time",
      source: "GitHub public repository API",
      updatedAt: new Date().toISOString(),
      contributors: people,
      definitions: {
        commits: "Commits attributed to the contributor in GitHub repository contribution statistics.",
        pullRequests: "Pull requests opened by the contributor, including closed and merged PRs.",
        comments: "Issue/PR conversation comments plus inline pull-request review comments.",
        additions: "Lines added in commits, as reported by GitHub contribution statistics.",
        deletions: "Lines deleted in commits, as reported by GitHub contribution statistics.",
      },
    }, { cacheSeconds: 300 }, "Live GitHub contribution data retrieved");
  } catch (error: any) {
    return sendError(
      res,
      "GITHUB_CONTRIBUTIONS_UNAVAILABLE",
      "GitHub contribution data could not be loaded right now. Please try again shortly.",
      Number(error?.status) || 502,
    );
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
    upstreamUpdatedAt: null,
    timestamp: new Date().toISOString(),
  });
});
export default router;
