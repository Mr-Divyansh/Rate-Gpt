import {
  fetchAgmarknet2Filters,
  fetchAgmarknet2Prices,
  resetAgmarknetCatalogCache,
  searchAgmarknet2Commodities,
} from "../services/agmarknet2Service.js";

let passed = 0;
let failed = 0;

function check(condition: unknown, label: string): void {
  if (condition) {
    passed += 1;
    console.log(`PASS ${label}`);
  } else {
    failed += 1;
    console.error(`FAIL ${label}`);
  }
}

const filtersPayload = {
  status: true,
  message: "Filters fetched successfully",
  data: {
    state_data: [
      { state_id: 5, state_name: "Himachal Pradesh" },
      { state_id: 6, state_name: "Punjab" },
      { state_id: 100006, state_name: "All States/UTs" },
    ],
    district_data: [
      { id: 51, state_id: 5, district_name: "Kullu" },
      { id: 52, state_id: 5, district_name: "Mandi" },
      { id: 61, state_id: 6, district_name: "Ludhiana" },
    ],
    market_data: [
      { id: 501, state_id: 5, district_id: 51, mkt_name: "SMY Bhuntar" },
      { id: 502, state_id: 5, district_id: 52, mkt_name: "SMY Takoli" },
      { id: 601, state_id: 6, district_id: 61, mkt_name: "Ludhiana APMC" },
      { id: 100009, state_id: 100006, district_id: 100007, mkt_name: "All Markets" },
    ],
    cmdt_data: [
      { cmdt_id: 24, cmdt_name: "Potato", cmdt_group_id: 4 },
      { cmdt_id: 65, cmdt_name: "Tomato", cmdt_group_id: 4 },
      { cmdt_id: 100001, cmdt_name: "All Commodities", cmdt_group_id: 100000 },
    ],
  },
};

function reportFor(date: string): Record<string, unknown> {
  return {
    success: true,
    message: "Data fetched successfully",
    states: [{
      stateId: 5,
      stateName: "Himachal Pradesh",
      markets: [
        {
          marketId: 501,
          marketName: "SMY Bhuntar",
          commodities: [{
            commodityId: 24,
            commodityName: "Potato",
            data: [{
              marketCenter: "SMY Bhuntar",
              variety: "Local",
              grade: "FAQ",
              minimumPrice: 1_000,
              maximumPrice: 1_400,
              modalPrice: 1_200,
              unitOfPrice: "Rs./Quintal",
              arrivals: 2,
              unitOfArrivals: "Tonnes",
            }],
          }],
        },
        {
          marketId: 502,
          marketName: "SMY Takoli",
          commodities: [{
            commodityId: 65,
            commodityName: "Tomato",
            data: [{
              marketCenter: "SMY Takoli",
              variety: "Hybrid",
              grade: "FAQ",
              minimumPrice: 1_800,
              maximumPrice: 2_200,
              modalPrice: 2_000,
              unitOfPrice: "Rs./Quintal",
              arrivals: 1,
              unitOfArrivals: "Tonnes",
            }],
          }],
        },
      ],
    }],
    requestedDate: date,
  };
}

function mockFetcher(options: { failDate?: string; dates?: string[] } = {}) {
  const calls: Array<{ url: string; method: string; body?: Record<string, unknown> }> = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    const body = typeof init?.body === "string" ? JSON.parse(init.body) as Record<string, unknown> : undefined;
    calls.push({ url, method, body });
    if (url.endsWith("/daily-price-arrival/filters")) {
      return new Response(JSON.stringify(filtersPayload), { status: 200 });
    }
    if (url.endsWith("/prices-and-arrivals/market-report/daily")) {
      const date = String(body?.date ?? "");
      if (options.failDate === date) return new Response("temporary failure", { status: 503 });
      return new Response(JSON.stringify(reportFor(date)), { status: 200 });
    }
    return new Response("not found", { status: 404 });
  };
  return { fetcher, calls };
}

async function main(): Promise<void> {
  process.env.AGMARKNET_API_BASE_URL = "https://agmarknet.test/v1";
  resetAgmarknetCatalogCache();

  const catalogMock = mockFetcher();
  const root = await fetchAgmarknet2Filters({}, catalogMock.fetcher);
  check(root.states.includes("Himachal Pradesh") && !root.states.includes("All States/UTs"), "state catalogue excludes the all-states sentinel");
  check(root.coverage.status === "catalogue" && root.cache.status === "temporary-cache", "root filter metadata identifies a cached administrative catalogue");

  const hp = await fetchAgmarknet2Filters({ state: "Himachal Pradesh" }, catalogMock.fetcher);
  check(hp.districts.join(",") === "Kullu,Mandi", "state filter returns every registered district");
  check(hp.markets.length === 2 && hp.markets.includes("SMY Bhuntar"), "state filter returns every registered mandi");
  check(hp.commodities.includes("Potato") && !hp.commodities.includes("All Commodities"), "commodity catalogue excludes the all-commodities sentinel");
  const kullu = await fetchAgmarknet2Filters({ state: "Himachal Pradesh", district: "Kullu" }, catalogMock.fetcher);
  check(kullu.markets.length === 1 && kullu.markets[0] === "SMY Bhuntar", "district filter returns only mandis in that district");
  check(catalogMock.calls.length === 1, "administrative catalogue is cached and fetched once");

  const search = await searchAgmarknet2Commodities("pot", 10, catalogMock.fetcher);
  check(search.length === 1 && search[0] === "Potato", "commodity search uses the complete official catalogue");

  resetAgmarknetCatalogCache();
  const liveMock = mockFetcher();
  const prices = await fetchAgmarknet2Prices({
    state: "Himachal Pradesh",
    district: "Kullu",
    limit: 100,
  }, liveMock.fetcher);
  check(prices.records.length === 4, "latest-price lookup reads the configured four-day reporting window");
  check(prices.records.every((record) => record.state === "Himachal Pradesh" && record.district === "Kullu"), "state and district filters are enforced on flattened source rows");
  check(prices.records.every((record) => record.source_unit === "Rs./Quintal"), "per-record government price unit is preserved");
  check(prices.meta.cacheStatus === "live" && prices.meta.total === 4 && !prices.meta.hasNext, "live price pagination reports the full local result set");
  check(
    liveMock.calls.filter((call) => call.method === "POST").every((call) =>
      Array.isArray(call.body?.marketIds) &&
      (call.body?.marketIds as number[]).join(",") === "501" &&
      (call.body?.stateIds as number[]).join(",") === "5" &&
      call.body?.includeExcel === false
    ),
    "daily reports request only the selected state's selected district markets",
  );

  resetAgmarknetCatalogCache();
  const exactMock = mockFetcher();
  const exact = await fetchAgmarknet2Prices({
    state: "Himachal Pradesh",
    district: "Kullu",
    arrivalDate: "2026-11-13",
    limit: 10,
  }, exactMock.fetcher);
  check(
    exact.records.length === 1 &&
      exact.records[0]?.arrival_date === "2026-11-13" &&
      exactMock.calls.filter((call) => call.method === "POST").length === 1,
    "an explicit arrival date fetches only that exact government report date",
  );

  resetAgmarknetCatalogCache();
  const partialMock = mockFetcher({ failDate: "2026-11-14" });
  const partial = await fetchAgmarknet2Prices({
    state: "Himachal Pradesh",
    district: "Kullu",
    limit: 100,
  }, partialMock.fetcher);
  check(partial.meta.partial && partial.meta.failedDates.includes("2026-11-14"), "partial daily report outages are surfaced rather than hidden");

  console.log(`\nAGMARKNET 2.0 tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error("AGMARKNET 2.0 tests could not complete:", error);
  process.exitCode = 1;
});
