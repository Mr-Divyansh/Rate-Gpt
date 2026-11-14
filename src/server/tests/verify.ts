/** Deterministic service checks. No network calls and no database setup. */
import {
  fetchLivePrices,
  GovernmentApiError,
  isFutureArrivalDate,
  mapUpstreamRecord,
  normalizeArrivalDate,
  parsePrice,
  parseReportedTotal,
  searchLiveCommodities,
} from "../services/mandiDataService.js";

let passed = 0;
let failed = 0;

function check(condition: unknown, name: string): void {
  if (condition) {
    passed += 1;
    console.log(`PASS ${name}`);
  } else {
    failed += 1;
    console.error(`FAIL ${name}`);
  }
}

const upstreamRecord = {
  id: "record-1",
  State: "Maharashtra",
  District: "Pune",
  Market: "Pune Market",
  Commodity: "Apple",
  Variety: "Red",
  Grade: "FAQ",
  Arrival_Date: "13/11/2026",
  Min_Price: "1,800",
  Max_Price: "2,400",
  Modal_Price: "2,100",
};

function responseFor(
  records: unknown[],
  input: RequestInfo | URL,
  total = String(records.length),
): Response {
  const url = new URL(String(input));
  return new Response(JSON.stringify({
    records,
    total,
    limit: url.searchParams.get("limit"),
    offset: url.searchParams.get("offset"),
  }), { status: 200, headers: { "Content-Type": "application/json" } });
}

async function main(): Promise<void> {
  process.env.DATA_GOV_API_KEY = "deterministic-test-key";
  process.env.DATA_GOV_API_BASE_URL = "https://example.test/resource";

  check(normalizeArrivalDate("13/11/2026") === "2026-11-13", "DD/MM/YYYY dates are normalized");
  check(normalizeArrivalDate("2026-11-13") === "2026-11-13", "ISO dates are preserved");
  check(normalizeArrivalDate("31/02/2026") === null, "impossible dates are rejected");
  check(parsePrice("1,234.50") === 1234.5, "formatted numeric prices are parsed");
  check(parsePrice("") === null && parsePrice("-1") === null, "missing and negative prices are not fabricated");
  check(parseReportedTotal("1,003") === 1003 && parseReportedTotal("bad") === null, "upstream totals are validated");
  check(!isFutureArrivalDate("2026-11-14", new Date("2026-11-14T12:00:00Z")), "today in India is selectable");
  check(isFutureArrivalDate("2026-11-15", new Date("2026-11-14T12:00:00Z")), "future arrival dates are rejected");

  const mapped = mapUpstreamRecord({ ...upstreamRecord, Min_Price: null, Max_Price: "", Modal_Price: null });
  check(mapped?.arrivalDate === "2026-11-13", "OGD arrival dates are mapped exactly");
  check(mapped?.minPrice === null && mapped?.maxPrice === null && mapped?.modalPrice === null, "missing source prices remain null");
  check(mapUpstreamRecord({ Commodity: "Apple" }) === null, "incomplete source records are rejected");

  let filtersUrl: URL | undefined;
  const filtered = await fetchLivePrices({
    state: "Maharashtra",
    district: "Pune",
    market: "Pune Market",
    commodity: "Apple",
    arrivalDate: "2026-11-13",
    limit: 5,
    sort: "date_desc",
  }, async (input) => {
    filtersUrl = new URL(String(input));
    return responseFor([upstreamRecord], input);
  });
  check(filtersUrl?.searchParams.get("filters[state.keyword]") === "Maharashtra", "state filter uses the OGD field id");
  check(filtersUrl?.searchParams.get("filters[district.keyword]") === "Pune", "district filter uses its exact-match field");
  check(filtersUrl?.searchParams.get("filters[market.keyword]") === "Pune Market", "market filter uses its exact-match field");
  check(filtersUrl?.searchParams.get("filters[commodity.keyword]") === "Apple", "commodity filter uses its exact-match field");
  check(filtersUrl?.searchParams.get("filters[arrival_date]") === "2026-11-13", "arrival date filter is normalized upstream");
  check(!JSON.stringify(filtered).includes("deterministic-test-key"), "government credentials never enter responses");

  const rawPage = [
    { ...upstreamRecord, id: "duplicate", Arrival_Date: "12/11/2026" },
    { ...upstreamRecord, id: "duplicate", Arrival_Date: "12/11/2026" },
    { ...upstreamRecord, id: "newer", Commodity: "Mango", Arrival_Date: "13/11/2026", Modal_Price: null },
  ];
  const page = await fetchLivePrices({ limit: 3, sort: "date_desc" }, async (input) => responseFor(rawPage, input));
  check(page.records.length === 2 && page.meta.nextOffset === 3, "duplicate source records are removed without corrupting pagination");
  check(page.records[0]?.arrival_date === "2026-11-13", "date ordering is applied to the displayed live page");
  check(page.records.some((record) => record.modal_price === null), "partial price records remain available with null values");

  let retries = 0;
  const retried = await fetchLivePrices({ limit: 1 }, async (input) => {
    retries += 1;
    if (retries < 3) return new Response("slow down", { status: 429 });
    return responseFor([upstreamRecord], input);
  });
  check(retries === 3 && retried.records.length === 1, "transient upstream rate limits use bounded retries");

  let searchedUrl: URL | undefined;
  const commodities = await searchLiveCommodities("अंगूर", 10, async (input) => {
    searchedUrl = new URL(String(input));
    return responseFor([{ ...upstreamRecord, id: "grapes", Commodity: "Grapes" }], input);
  });
  check(searchedUrl?.searchParams.get("q") === "Grapes", "Hindi commodity search is translated before the upstream request");
  check(commodities.length === 1 && commodities[0] === "Grapes", "commodity suggestions are limited to upstream records");

  let futureWasRequested = false;
  try {
    await fetchLivePrices({ arrivalDate: "2099-01-01" }, async (input) => {
      futureWasRequested = true;
      return responseFor([], input);
    });
  } catch (error) {
    check(error instanceof GovernmentApiError && error.httpStatus === 400, "future dates fail before an upstream request");
  }
  check(!futureWasRequested, "future-date validation avoids unnecessary upstream traffic");

  const previousKey = process.env.DATA_GOV_API_KEY;
  delete process.env.DATA_GOV_API_KEY;
  try {
    await fetchLivePrices({}, async (input) => responseFor([], input));
    check(false, "missing government key fails explicitly");
  } catch (error) {
    check(error instanceof GovernmentApiError && error.httpStatus === 503, "missing government key fails explicitly");
  } finally {
    process.env.DATA_GOV_API_KEY = previousKey;
  }

  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error("Test runner failed:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
});
