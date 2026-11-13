/**
 * ======================================================================================
 * RATE GPT — GOVERNMENT MANDI DATA INTEGRATION SERVICE
 * ======================================================================================
 *
 * 1. API ENDPOINT & RESOURCE ID:
 *    Source: Government of India Open Government Data Platform (OGD / AGMARKNET)
 *    Dataset Name: Current Daily Price of Various Commodities from Various Markets (Mandi)
 *    Default Base URL: https://api.data.gov.in/resource
 *    Resource ID: 9ef84268-d588-465a-a308-a864a43d0070
 *    Full Endpoint: https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070
 *
 * 2. API KEY CONFIGURATION:
 *    Environment Variable: DATA_GOV_API_KEY
 *    // TODO(API KEY): Set DATA_GOV_API_KEY in your .env file.
 *    // Never put this key in frontend code, client requests, or commit it to Git.
 *    // Sign up for an API key at https://data.gov.in/
 *
 * 3. UPSTREAM QUERY PARAMETERS:
 *    - `api-key`: Read from process.env.DATA_GOV_API_KEY
 *    - `format`: "json"
 *    - `offset`: page offset (0-indexed)
 *    - `limit`: number of records per page (default 50, maximum recommended 100)
 *    - `filters[state]`: optional state filter
 *    - `filters[district]`: optional district filter
 *    - `filters[market]`: optional market filter
 *    - `filters[commodity]`: optional commodity filter
 *    - `filters[arrival_date]`: optional arrival date filter
 *
 * 4. UPSTREAM RESPONSE SHAPE & MAPPING:
 *    // TODO(RESPONSE MAPPING): Confirm these field names against a real
 *    // data.gov.in response before relying on this mapping in production.
 *    Standard OGD JSON schema returns:
 *    {
 *      "status": "ok",
 *      "total": 1250,
 *      "count": 50,
 *      "limit": "50",
 *      "offset": "0",
 *      "records": [
 *        {
 *          "state": "Maharashtra",
 *          "district": "Nashik",
 *          "market": "Lasalgaon",
 *          "commodity": "Onion",
 *          "variety": "Red",
 *          "grade": "FAQ",
 *          "arrival_date": "30/10/2026",
 *          "min_price": "1800",
 *          "max_price": "2400",
 *          "modal_price": "2150"
 *        }
 *      ]
 *    }
 * ======================================================================================
 */

import {
  RawMandiInput,
  upsertMandiPrices,
  insertSyncLog,
  acquireMandiSyncLock,
} from "../db/database-factory.js";

export interface UpstreamSyncOptions {
  state?: string;
  district?: string;
  market?: string;
  commodity?: string;
  arrivalDate?: string;
  limit?: number;
  offset?: number;
}

export interface SyncResult {
  success: boolean;
  message: string;
  recordsFetched: number;
  recordsInserted: number;
  recordsUpdated: number;
  status?: "SUCCESS" | "PARTIAL" | "FAILED" | "IN_PROGRESS" | "NOT_CONFIGURED";
  isMockFallback?: boolean;
  error?: string;
}

/**
 * Normalizes various arrival date formats from data.gov.in to ISO YYYY-MM-DD
 * e.g. "30/10/2026" -> "2026-10-30"
 * e.g. "30-10-2026" -> "2026-10-30"
 * e.g. "2026-10-30" -> "2026-10-30"
 */
export function normalizeArrivalDate(
  rawDate: string | undefined | null,
): string | null {
  if (!rawDate) {
    // P0 audit fix: do NOT default missing dates to today; skip such records upstream.
    return null;
  }
  const trimmed = rawDate.trim();

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]);
    const year = Number(dmyMatch[3]);
    return validIsoDate(year, month, day);
  }

  // YYYY-MM-DD
  const ymdMatch = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymdMatch) {
    const year = Number(ymdMatch[1]);
    const month = Number(ymdMatch[2]);
    const day = Number(ymdMatch[3]);
    return validIsoDate(year, month, day);
  }

  // Accept timestamp formats only when they parse to a real date.
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

/**
 * OGD may serialize its total as either a number or a decimal string.
 * Accept comma-grouped strings too: parseInt("13,181", 10) incorrectly returns 13.
 */
export function parseReportedTotal(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const normalized = String(value).trim().replace(/,/g, "");
  if (!/^\\d+$/.test(normalized)) return null;
  const total = Number(normalized);
  return Number.isSafeInteger(total) && total >= 0 ? total : null;
}

function validIsoDate(year: number, month: number, day: number): string | null {
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Parses numeric price string into clean float or null.
 * Crucial rule: Never convert missing prices to zero!
 */
export function parsePrice(val: any): number | null {
  if (val === null || val === undefined || val === "") return null;
  const normalized = String(val).replace(/,/g, "").trim();
  if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) return null;
  const num = Number(normalized);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

/**
 * Safely maps upstream OGD records into verified internal MandiInput shape
 */
export function mapUpstreamRecord(raw: any): RawMandiInput | null {
  if (!raw || typeof raw !== "object") return null;

  // Expected field variations from data.gov.in
  const state = String(raw.state || raw.State || "").trim();
  const district = String(raw.district || raw.District || "").trim();
  const market = String(raw.market || raw.Market || "").trim();
  const commodity = String(raw.commodity || raw.Commodity || "").trim();

  // Basic validation: state, district, market, and commodity are mandatory
  if (!state || !district || !market || !commodity) {
    return null;
  }

  const variety = raw.variety || raw.Variety || "Other";
  const grade = raw.grade || raw.Grade || "FAQ";
  const rawDate = raw.arrival_date ?? raw.Arrival_Date ?? raw.date;
  const arrivalDate = normalizeArrivalDate(rawDate);

  // P0 audit fix: skip records without a valid arrival date instead of fabricating today's date.
  if (!arrivalDate) return null;

  // P0 audit fix: use nullish coalescing so a legitimate price of 0 is preserved.
  const minPrice = parsePrice(raw.min_price ?? raw.Min_Price);
  const maxPrice = parsePrice(raw.max_price ?? raw.Max_Price);
  const modalPrice = parsePrice(raw.modal_price ?? raw.Modal_Price);
  if (minPrice === null && maxPrice === null && modalPrice === null) {
    return null;
  }

  return {
    sourceRecordId: raw.id || raw._id || null,
    state,
    district,
    market,
    commodity,
    variety: String(variety).trim(),
    grade: String(grade).trim(),
    arrivalDate,
    minPrice,
    maxPrice,
    modalPrice,
    sourceUnit: "Rs/Quintal",
  };
}

/**
 * Synchronizes mandi price records from Government of India OGD API.
 * If credentials are not supplied or upstream fails, preserves existing data and logs audit trail.
 */
export async function syncMandiPricesFromUpstream(
  options: UpstreamSyncOptions = {},
): Promise<SyncResult> {
  const releaseLock = await acquireMandiSyncLock();
  if (!releaseLock) {
    return {
      success: false,
      status: "IN_PROGRESS",
      message: "A mandi synchronization is already in progress.",
      recordsFetched: 0,
      recordsInserted: 0,
      recordsUpdated: 0,
    };
  }
  try {
    return await runMandiPriceSync(options);
  } finally {
    await releaseLock();
  }
}

async function runMandiPriceSync(
  options: UpstreamSyncOptions,
): Promise<SyncResult> {
  const startedAt = new Date().toISOString();
  const apiKey = process.env.DATA_GOV_API_KEY;
  const baseUrl =
    process.env.DATA_GOV_API_BASE_URL || "https://api.data.gov.in/resource";
  const resourceId =
    process.env.DATA_GOV_RESOURCE_ID || "9ef84268-d588-465a-a308-a864a43d0070";

  // Check if API key is configured
  if (
    !apiKey ||
    apiKey === "your_data_gov_in_api_key_here" ||
    apiKey === "MY_DATA_GOV_API_KEY"
  ) {
    const errorMsg =
      "DATA_GOV_API_KEY is not configured or using default placeholder. Upstream synchronization skipped.";
    console.warn(`[Sync] ${errorMsg}`);

    await insertSyncLog({
      status: "NOT_CONFIGURED",
      requested_date: options.arrivalDate || null,
      state_filter: options.state || "ALL",
      records_fetched: 0,
      records_inserted: 0,
      records_updated: 0,
      error_message: errorMsg,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
    });

    return {
      success: false,
      status: "NOT_CONFIGURED",
      message:
        "Government API key is not configured. No upstream sync was performed; existing stored records were left unchanged.",
      recordsFetched: 0,
      recordsInserted: 0,
      recordsUpdated: 0,
      isMockFallback: false,
      error: errorMsg,
    };
  }

  // Construct query parameters (P0 audit fix: paginate through all upstream pages).
  const limit = Math.min(options.limit || 100, 100);
  const startOffset = options.offset || 0;

  const allRawRecords: any[] = [];
  let offset = startOffset;
  let totalAvailable = Infinity;
  const MAX_PAGES = 200; // safety cap (supports full India dataset ~14k records)
  let pagesFetched = 0;

  console.log(
    `[Sync] Requesting data from OGD platform (Resource: ${resourceId})...`,
  );

  try {
    while (offset < totalAvailable && pagesFetched < MAX_PAGES) {
      const url = new URL(`${baseUrl}/${resourceId}`);
      url.searchParams.set("api-key", apiKey);
      url.searchParams.set("format", "json");
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("offset", String(offset));

      if (options.state) url.searchParams.set("filters[state]", options.state);
      if (options.district)
        url.searchParams.set("filters[district]", options.district);
      if (options.market)
        url.searchParams.set("filters[market]", options.market);
      if (options.commodity)
        url.searchParams.set("filters[commodity]", options.commodity);
      if (options.arrivalDate)
        url.searchParams.set("filters[arrival_date]", options.arrivalDate);

      // P0 audit fix: per-request timeout (30s) instead of a single overall cap.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s per request

      let response: Response;
      try {
        response = await fetch(url.toString(), {
          method: "GET",
          headers: {
            Accept: "application/json",
            "User-Agent": "RateGPT-Mandi-Client/1.0",
          },
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        // Do not log upstream response bodies: error payloads may echo request details.
        const statusMsg = `Upstream API returned HTTP ${response.status}.`;
        console.error(`[Sync] ${statusMsg}`);

        await insertSyncLog({
          status: "FAILED",
          requested_date: options.arrivalDate || null,
          state_filter: options.state || "ALL",
          records_fetched: allRawRecords.length,
          records_inserted: 0,
          records_updated: 0,
          error_message: statusMsg,
          started_at: startedAt,
          completed_at: new Date().toISOString(),
        });

        return {
          success: false,
          message: "Failed to fetch from Government API.",
          recordsFetched: allRawRecords.length,
          recordsInserted: 0,
          recordsUpdated: 0,
          error: statusMsg,
        };
      }

      const data: any = await response.json();
      const rawRecords = Array.isArray(data.records) ? data.records : [];
      allRawRecords.push(...rawRecords);
      pagesFetched++;

      const reportedTotal = parseReportedTotal(data.total);
      // Never trust a total smaller than the records already returned. Some
      // upstream responses serialize grouped totals (for example "13,181");
      // a malformed/truncated value must not terminate pagination early.
      if (reportedTotal !== null && reportedTotal >= offset + rawRecords.length) {
        totalAvailable = reportedTotal;
      } else if (rawRecords.length === 0) {
        totalAvailable = allRawRecords.length; // stop if no usable total reported
      }

      console.log(
        `[Sync] Page ${pagesFetched}: received ${rawRecords.length} records (total so far: ${allRawRecords.length}/${Number.isFinite(totalAvailable) ? totalAvailable : "?"})`,
      );

      if (rawRecords.length === 0) break;
      offset += rawRecords.length;
      await new Promise((r) => setTimeout(r, 1500)); // delay to avoid rate limiting
    }

    // Map and sanitize records
    const validRecords: RawMandiInput[] = [];
    for (const raw of allRawRecords) {
      const mapped = mapUpstreamRecord(raw);
      if (mapped) validRecords.push(mapped);
    }

    // Upsert only normalized source records; never invent fallback prices.
    const { inserted, updated } = await upsertMandiPrices(validRecords);
    const completedAt = new Date().toISOString();
    const paginationCapped = pagesFetched >= MAX_PAGES && offset < totalAvailable;

    const status = validRecords.length > 0 && !paginationCapped ? "SUCCESS" : "PARTIAL";
    await insertSyncLog({
      status,
      requested_date: options.arrivalDate || null,
      state_filter: options.state || "ALL",
      records_fetched: allRawRecords.length,
      records_inserted: inserted,
      records_updated: updated,
      error_message: paginationCapped
        ? `Pagination safety cap reached after ${MAX_PAGES} pages; sync may be incomplete.`
        : validRecords.length > 0
          ? null
          : "No valid records returned from upstream.",
      started_at: startedAt,
      completed_at: completedAt,
    });

    return {
      success: validRecords.length > 0,
      status,
      message: paginationCapped
        ? `Partially synced ${validRecords.length} records (${inserted} new, ${updated} updated) across ${pagesFetched} page(s); the pagination safety cap was reached.`
        : `Synced ${validRecords.length} records (${inserted} new, ${updated} updated) across ${pagesFetched} page(s).`,
      recordsFetched: allRawRecords.length,
      recordsInserted: inserted,
      recordsUpdated: updated,
    };
  } catch (err: any) {
    const errorMessage =
      err?.name === "AbortError"
        ? "Upstream request timed out after 30 seconds."
        : "Upstream network request failed. Check connectivity and server configuration.";

    const cause = err?.cause;
    console.error(`[Sync Error] ${errorMessage}`, {
      name: typeof err?.name === "string" ? err.name : "UnknownError",
      code: typeof err?.code === "string" ? err.code : undefined,
      causeName: cause instanceof Error ? cause.name : undefined,
      causeCode:
        typeof cause === "object" &&
        cause !== null &&
        "code" in cause &&
        typeof cause.code === "string"
          ? cause.code
          : undefined,
    });

    await insertSyncLog({
      status: "FAILED",
      requested_date: options.arrivalDate || null,
      state_filter: options.state || "ALL",
      records_fetched: 0,
      records_inserted: 0,
      records_updated: 0,
      error_message: errorMessage,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
    });

    return {
      success: false,
      status: "FAILED",
      message: "Synchronization failed due to network or upstream error.",
      recordsFetched: 0,
      recordsInserted: 0,
      recordsUpdated: 0,
      error: errorMessage,
    };
  }
}
