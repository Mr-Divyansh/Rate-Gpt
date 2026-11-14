/** Deterministic local tests; no network calls and no fabricated seed dataset. */
import path from "path";
import os from "os";
import fs from "fs";
import {
  getDatabaseConnectionString,
  validateDatabaseUrl,
} from "../db/database-config.js";

let passed = 0;
let failed = 0;
function check(condition: unknown, name: string): void {
  if (condition) {
    passed++;
    console.log(`PASS ${name}`);
  } else {
    failed++;
    console.error(`FAIL ${name}`);
  }
}

// Isolate this test run from the project's real rategpt.db. database.ts
// resolves and opens its database file as a side effect of being imported
// (module-load time), so RATEGPT_DB_PATH must be set to an *already valid*
// SQLite file before database.js is imported — hence the dynamic imports
// below instead of static ones. Without this, every `npm test` run silently
// inserted a permanent "Audit..." record into the same database the dev
// server uses, with no cleanup.
const tempDbPath = path.join(
  os.tmpdir(),
  `rategpt-verify-${process.pid}-${Date.now()}.db`,
);

async function main() {
  console.log("Rate-GPT deterministic verification (no external API calls)");

  check(
    getDatabaseConnectionString({ DATABASE_URL: "postgres://primary" }) ===
      "postgres://primary",
    "DATABASE_URL takes priority",
  );
  check(
    getDatabaseConnectionString({ POSTGRES_URL: "postgres://vercel" }) ===
      "postgres://vercel",
    "Vercel POSTGRES_URL fallback",
  );
  check(
    getDatabaseConnectionString({
      DATABASE_URL: " ",
      POSTGRES_URL: "postgres://vercel",
    }) === "postgres://vercel",
    "blank DATABASE_URL uses POSTGRES_URL fallback",
  );
  check(
    validateDatabaseUrl({
      DATABASE_URL: "postgresql://user:password@database.example/db",
    }).valid,
    "valid PostgreSQL URL accepted",
  );
  check(
    !validateDatabaseUrl({ DATABASE_URL: "https://database.example/db" }).valid,
    "non-PostgreSQL URL rejected",
  );

  const previousVercel = process.env.VERCEL;
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const previousPostgresUrl = process.env.POSTGRES_URL;
  process.env.VERCEL = "1";
  delete process.env.DATABASE_URL;
  delete process.env.POSTGRES_URL;
  try {
    await (await import("../db/database-factory.js")).getDatabaseStats();
    check(false, "Vercel reports missing PostgreSQL configuration");
  } catch (error) {
    check(
      error instanceof Error &&
        error.message.includes("Set DATABASE_URL (recommended) or POSTGRES_URL"),
      "Vercel reports actionable PostgreSQL configuration error",
    );
  } finally {
    if (previousVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = previousVercel;
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
    if (previousPostgresUrl === undefined) delete process.env.POSTGRES_URL;
    else process.env.POSTGRES_URL = previousPostgresUrl;
  }

  // Pre-create a valid empty SQLite file so database.ts's resolveDbPath()
  // (which only honors RATEGPT_DB_PATH if the file already exists and opens
  // successfully) picks it up instead of falling back to the shared default.
  const { default: Database } = (await import("better-sqlite3")) as {
    default: any;
  };
  const seed = new Database(tempDbPath);
  seed.close();
  process.env.RATEGPT_DB_PATH = tempDbPath;

  const {
    getDatabaseStats,
    getFilterMetadata,
    getMandiPrices,
    upsertMandiPrices,
    generateDedupKey,
    insertSyncLog,
    acquireMandiSyncLock,
  } = await import("../db/database.js");
  const {
    normalizeArrivalDate,
    isFutureArrivalDate,
    parsePrice,
    mapUpstreamRecord,
    parseReportedTotal,
    fetchLivePrices,
    searchLiveCommodities,
    GovernmentApiError,
  } = await import("../services/mandiDataService.js");
  const { isPriceRecord } = await import("../../../script/api.js");

  check(normalizeArrivalDate("30/10/2026") === "2026-10-30", "DD/MM/YYYY normalization");
  check(normalizeArrivalDate("05-11-2026") === "2026-11-05", "DD-MM-YYYY normalization");
  check(normalizeArrivalDate("2026-10-31") === "2026-10-31", "ISO date preservation");
  check(normalizeArrivalDate(null) === null, "missing date is rejected");
  check(!isFutureArrivalDate("2026-11-14", new Date("2026-11-14T05:00:00.000Z")), "today in India is selectable");
  check(isFutureArrivalDate("2026-11-15", new Date("2026-11-14T05:00:00.000Z")), "future arrival date is rejected using India calendar date");
  check(!isFutureArrivalDate("2026-11-13", new Date("2026-11-14T05:00:00.000Z")), "past arrival date remains selectable");
  check(parsePrice("2,450.50") === 2450.5, "formatted numeric price parsing");
  check(parsePrice(null) === null && parsePrice("NA") === null, "missing prices remain null");
  check(parsePrice("-2") === null, "negative prices are rejected");
  check(parseReportedTotal(13181) === 13181, "numeric upstream total parsing");
  check(parseReportedTotal("13181") === 13181, "string upstream total parsing");
  check(parseReportedTotal("13,181") === 13181, "comma-grouped upstream total parsing");
  check(parseReportedTotal("not-a-total") === null, "invalid upstream total rejected");
  const validPriceRecord = {
    commodity: "Apple", market: "Shimla", min_price: 5000, max_price: 7000, modal_price: 6000,
  };
  check(isPriceRecord(validPriceRecord), "complete mandi price record accepted");
  check(
    isPriceRecord({ ...validPriceRecord, min_price: null }),
    "record with one unavailable price accepted",
  );
  check(
    isPriceRecord({ ...validPriceRecord, min_price: null, max_price: null }),
    "record with only modal price accepted",
  );
  check(
    isPriceRecord({ ...validPriceRecord, min_price: null, max_price: null, modal_price: null }),
    "record with all unavailable prices remains valid",
  );
  check(
    !isPriceRecord({ ...validPriceRecord, min_price: "not-a-price" }),
    "record with malformed price rejected",
  );

  const mapped = mapUpstreamRecord({
    state: "Himachal Pradesh", district: "Kangra", market: "Palampur",
    commodity: "Maize", variety: "Local", arrival_date: "31/10/2026",
    min_price: "1800", max_price: "2200", modal_price: "2000",
  });
  check(mapped?.arrivalDate === "2026-10-31", "OGD record date mapping");
  check(mapped?.modalPrice === 2000, "OGD price mapping");
  check(mapUpstreamRecord({ state: "Himachal Pradesh" }) === null, "incomplete OGD record rejected");
  const noPrices = mapUpstreamRecord({
      state: "Himachal Pradesh",
      district: "Kangra",
      market: "Palampur",
      commodity: "Maize",
      arrival_date: "31/10/2026",
      min_price: "NA",
      max_price: "NA",
      modal_price: "NA",
    });
  check(
    noPrices !== null && noPrices.minPrice === null && noPrices.modalPrice === null,
    "missing upstream prices remain null without dropping the record",
  );

  const previousApiKey = process.env.DATA_GOV_API_KEY;
  const previousBaseUrl = process.env.DATA_GOV_API_BASE_URL;
  process.env.DATA_GOV_API_KEY = "test-only-government-key";
  process.env.DATA_GOV_API_BASE_URL = "https://api.data.gov.in/resource";
  const upstreamRecord = {
    id: "record-1",
    State: "Maharashtra",
    District: "Pune",
    Market: "Pune",
    Commodity: "Apple",
    Arrival_Date: "13/11/2026",
    Min_Price: null,
    Max_Price: null,
    Modal_Price: null,
  };
  const mockPage = (
    records: unknown[],
    { total = "13,181", offset = 0, limit = 2 }: { total?: unknown; offset?: number; limit?: number } = {},
  ) => new Response(JSON.stringify({
    records,
    total,
    offset: String(offset),
    limit: String(limit),
  }), { status: 200, headers: { "Content-Type": "application/json" } });

  const beforeLiveFetch = getDatabaseStats().totalRecords;
  let capturedUrl: string | null = null;
  const livePage = await fetchLivePrices({
    state: "Maharashtra",
    district: "Pune",
    market: "Pune",
    commodity: "Apple",
    arrivalDate: "2026-11-13",
    limit: 2,
    offset: 0,
    sort: "date_desc",
  }, async (input) => {
    capturedUrl = String(input);
    return mockPage([upstreamRecord, upstreamRecord], { total: "13,181" });
  });
  const parsedUrl = new URL(capturedUrl || "https://example.test");
  check(parsedUrl.searchParams.get("filters[state.keyword]") === "Maharashtra", "upstream state filter is forwarded");
  check(parsedUrl.searchParams.get("filters[district]") === "Pune", "upstream district filter is forwarded");
  check(parsedUrl.searchParams.get("filters[market]") === "Pune", "upstream market filter is forwarded");
  check(parsedUrl.searchParams.get("filters[commodity]") === "Apple", "upstream commodity filter is forwarded");
  check(parsedUrl.searchParams.get("filters[arrival_date]") === "2026-11-13", "upstream date filter is forwarded");
  check(parsedUrl.searchParams.get("api-key") === "test-only-government-key", "key is attached only to server-to-server request");
  check(livePage.meta.total === 13181, "comma-separated total is parsed for pagination");
  check(livePage.meta.hasNext && livePage.meta.nextOffset === 2, "live page metadata points to next upstream offset");
  check(livePage.meta.cacheStatus === "live" && livePage.records.length === 1, "live response deduplicates records and reports live status");
  check(livePage.records[0].modal_price === null, "missing prices are not fabricated");
  const exactDatePage = await fetchLivePrices({
    state: "Maharashtra", district: "Pune", market: "Pune",
    arrivalDate: "2026-11-14", limit: 2,
  }, async () => mockPage([upstreamRecord], { total: "1", limit: 2 }));
  check(exactDatePage.records.length === 0, "records from neighbouring dates are never shown for an exact date filter");
  let futureRequestMade = false;
  try {
    await fetchLivePrices({ arrivalDate: "2099-01-01", limit: 2 }, async () => {
      futureRequestMade = true;
      return mockPage([]);
    });
    check(false, "future date request is rejected");
  } catch (error) {
    check(error instanceof GovernmentApiError && error.httpStatus === 400 && !futureRequestMade, "future date is rejected before upstream request");
  }
  check(!JSON.stringify(livePage).includes("test-only-government-key"), "upstream key is absent from live response");

  let requestedOffset: string | null = null;
  const nextLivePage = await fetchLivePrices({ limit: 2, offset: 2 }, async (input) => {
    requestedOffset = new URL(String(input)).searchParams.get("offset");
    return mockPage([upstreamRecord], { total: "3", offset: 2, limit: 2 });
  });
  check(requestedOffset === "2" && nextLivePage.meta.offset === 2, "next page requests and reflects the requested offset");
  check(!nextLivePage.meta.hasNext, "last page does not claim another page");

  let retryCount = 0;
  const recoveredPage = await fetchLivePrices({ limit: 2 }, async () => {
    retryCount += 1;
    return retryCount < 3
      ? new Response("", { status: 429 })
      : mockPage([upstreamRecord], { total: "1", limit: 2 });
  });
  check(retryCount === 3 && recoveredPage.records.length === 1, "HTTP 429 gets bounded retries");

  let serverErrorAttempts = 0;
  try {
    await fetchLivePrices({ limit: 2 }, async () => {
      serverErrorAttempts += 1;
      return new Response("", { status: 503 });
    });
    check(false, "persistent HTTP 5xx reports an upstream error");
  } catch (error) {
    check(
      error instanceof GovernmentApiError &&
        error.httpStatus === 502 &&
        error.upstreamStatus === 503 &&
        serverErrorAttempts === 3,
      "HTTP 5xx gets bounded retries and a safe upstream error",
    );
  }

  try {
    await fetchLivePrices({ limit: 2 }, (_input, options) =>
      new Promise<Response>((_resolve, reject) => {
        options?.signal?.addEventListener("abort", () => reject(new Error("aborted")), {
          once: true,
        });
      }),
    );
    check(false, "upstream timeout reports an explicit error");
  } catch (error) {
    check(error instanceof GovernmentApiError && error.httpStatus === 504, "upstream timeout is bounded and reported");
  }

  const fruits = await searchLiveCommodities("अंगूर", 10, async () =>
    mockPage([], { total: "0", limit: 100 }),
  );
  check(fruits.includes("Grapes"), "fruit suggestions include the Hindi Grapes query");
  check(getDatabaseStats().totalRecords === beforeLiveFetch, "live government pages are not permanently stored");

  const oldTimeout = process.env.DATA_GOV_API_KEY;
  process.env.DATA_GOV_API_KEY = "";
  try {
    await fetchLivePrices({}, async () => mockPage([]));
    check(false, "missing government API key reports a configuration error");
  } catch (error) {
    check(error instanceof GovernmentApiError && error.httpStatus === 503, "missing key fails explicitly");
  } finally {
    if (oldTimeout === undefined) delete process.env.DATA_GOV_API_KEY;
    else process.env.DATA_GOV_API_KEY = oldTimeout;
  }
  if (previousApiKey === undefined) delete process.env.DATA_GOV_API_KEY;
  else process.env.DATA_GOV_API_KEY = previousApiKey;
  if (previousBaseUrl === undefined) delete process.env.DATA_GOV_API_BASE_URL;
  else process.env.DATA_GOV_API_BASE_URL = previousBaseUrl;

  const unique = `audit-${Date.now()}`;
  const record = {
    sourceRecordId: unique, state: "Audit State", district: "Audit District",
    market: "Audit Market", commodity: "Audit Crop", variety: "Audit Variety",
    grade: "FAQ", arrivalDate: "2026-10-31", minPrice: 10, maxPrice: 20,
    modalPrice: 15, sourceUnit: "Rs/Quintal",
  };
  const first = upsertMandiPrices([record]);
  const second = upsertMandiPrices([record]);
  check(first.inserted === 1, "first upsert inserts one record");
  check(second.updated === 1 && second.inserted === 0, "repeat upsert updates instead of duplicating");
  const listed = getMandiPrices({ state: "Audit State", limit: 10, offset: 0 });
  check(listed.records.some((r) => r.commodity === "Audit Crop"), "database query returns inserted record");
  check(listed.meta.total >= listed.records.length, "pagination metadata is consistent");
  check(getFilterMetadata({ state: "Audit State" }).districts.includes("Audit District"), "state filter metadata works");
  check(generateDedupKey("A", "B", "C", "D", "E", "2026-01-01") === "a|b|c|d|e|2026-01-01", "dedup key normalization");
  check(getDatabaseStats().totalRecords >= 1, "database statistics query works");
  const firstLock = acquireMandiSyncLock();
  check(typeof firstLock === "function", "SQLite sync lock is acquired");
  check(acquireMandiSyncLock() === null, "overlapping SQLite sync is rejected");
  firstLock?.();
  const secondLock = acquireMandiSyncLock();
  check(typeof secondLock === "function", "SQLite sync lock releases");
  secondLock?.();

  const syncTime = Date.now();
  insertSyncLog({
    status: "SUCCESS",
    requested_date: null,
    state_filter: "ALL",
    records_fetched: 1,
    records_inserted: 1,
    records_updated: 0,
    error_message: null,
    started_at: new Date(syncTime - 1000).toISOString(),
    completed_at: new Date(syncTime - 500).toISOString(),
  });
  insertSyncLog({
    status: "FAILED",
    requested_date: null,
    state_filter: "ALL",
    records_fetched: 0,
    records_inserted: 0,
    records_updated: 0,
    error_message: "test failure",
    started_at: new Date(syncTime).toISOString(),
    completed_at: new Date(syncTime + 100).toISOString(),
  });
  const syncStats = getDatabaseStats();
  check(syncStats.lastSync?.status === "FAILED", "latest attempt reflects failure");
  check(
    syncStats.lastSuccessfulSync?.status === "SUCCESS",
    "last successful sync is tracked separately",
  );

  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("Test runner failed:", error instanceof Error ? error.message : "unknown error");
    process.exitCode = 1;
  })
  .finally(() => {
    for (const suffix of ["", "-wal", "-shm", "-journal"]) {
      try {
        fs.unlinkSync(tempDbPath + suffix);
      } catch {
        /* already gone or never created; ignore */
      }
    }
  });
