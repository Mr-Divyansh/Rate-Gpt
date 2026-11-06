/** Deterministic local tests; no network calls and no fabricated seed dataset. */
import path from "path";
import os from "os";
import fs from "fs";

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
  } = await import("../db/database.js");
  const { normalizeArrivalDate, parsePrice, mapUpstreamRecord } =
    await import("../services/mandiDataService.js");

  check(normalizeArrivalDate("30/10/2026") === "2026-10-30", "DD/MM/YYYY normalization");
  check(normalizeArrivalDate("05-11-2026") === "2026-11-05", "DD-MM-YYYY normalization");
  check(normalizeArrivalDate("2026-10-31") === "2026-10-31", "ISO date preservation");
  check(normalizeArrivalDate(null) === null, "missing date is rejected");
  check(parsePrice("2,450.50") === 2450.5, "formatted numeric price parsing");
  check(parsePrice(null) === null && parsePrice("NA") === null, "missing prices remain null");

  const mapped = mapUpstreamRecord({
    state: "Himachal Pradesh", district: "Kangra", market: "Palampur",
    commodity: "Maize", variety: "Local", arrival_date: "31/10/2026",
    min_price: "1800", max_price: "2200", modal_price: "2000",
  });
  check(mapped?.arrivalDate === "2026-10-31", "OGD record date mapping");
  check(mapped?.modalPrice === 2000, "OGD price mapping");
  check(mapUpstreamRecord({ state: "Himachal Pradesh" }) === null, "incomplete OGD record rejected");

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
