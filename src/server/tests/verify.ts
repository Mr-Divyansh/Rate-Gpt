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
  const { normalizeArrivalDate, parsePrice, mapUpstreamRecord, parseReportedTotal } =
    await import("../services/mandiDataService.js");
  const { isPriceRecord } = await import("../../../script/api.js");

  check(normalizeArrivalDate("30/10/2026") === "2026-10-30", "DD/MM/YYYY normalization");
  check(normalizeArrivalDate("05-11-2026") === "2026-11-05", "DD-MM-YYYY normalization");
  check(normalizeArrivalDate("2026-10-31") === "2026-10-31", "ISO date preservation");
  check(normalizeArrivalDate(null) === null, "missing date is rejected");
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
    !isPriceRecord({ ...validPriceRecord, min_price: null, max_price: null, modal_price: null }),
    "record with no available prices rejected",
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
  check(
    mapUpstreamRecord({
      state: "Himachal Pradesh",
      district: "Kangra",
      market: "Palampur",
      commodity: "Maize",
      arrival_date: "31/10/2026",
      min_price: "NA",
      max_price: "NA",
      modal_price: "NA",
    }) === null,
    "records without a valid price are rejected",
  );

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
