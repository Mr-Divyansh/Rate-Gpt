import {
  fetchAgmarknet2Filters,
  fetchAgmarknet2Prices,
  fetchAgmarknet2PricesForSearch,
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

function indiaToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function shiftDate(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function dmy(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

function monthReport(year: number, month: number, today: string): Record<string, unknown> {
  const currentMonth = today.slice(0, 7) === `${year}-${String(month).padStart(2, "0")}`;
  const firstDate = currentMonth ? today : new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  const secondDate = currentMonth ? shiftDate(today, -1) : shiftDate(firstDate, -1);
  return {
    success: true,
    message: "Data fetched successfully",
    columns: [
      { key: "arrivalDate", title: "Arrival Date" },
      { key: "arrivals", title: "Arrivals (Metric Tonnes)" },
      { key: "variety", title: "Variety" },
      { key: "minimumPrice", title: "Minimum Price (Rs./Quintal)" },
      { key: "maximumPrice", title: "Maximum Price (Rs./Quintal)" },
      { key: "modalPrice", title: "Modal Price (Rs./Quintal)" },
    ],
    markets: [
      {
        marketName: "SMY Bhuntar",
        dates: [
          { arrivalDate: dmy(firstDate), data: [{
            arrivals: 2, variety: "Local", minimumPrice: 1_000, maximumPrice: 1_400, modalPrice: 1_200,
          }] },
          { arrivalDate: dmy(secondDate), data: [{
            arrivals: 3, variety: "Local", minimumPrice: 900, maximumPrice: 1_300, modalPrice: 1_100,
          }] },
        ],
      },
      {
        marketName: "SMY Takoli",
        dates: [
          { arrivalDate: dmy(firstDate), data: [{
            arrivals: 1, variety: "Other", minimumPrice: 700, maximumPrice: 1_000, modalPrice: 850,
          }] },
        ],
      },
    ],
  };
}

function mockFetcher(options: { failMonth?: string } = {}) {
  const calls: Array<{ url: URL; method: string }> = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = init?.method ?? "GET";
    calls.push({ url, method });
    if (url.pathname.endsWith("/daily-price-arrival/filters")) {
      return new Response(JSON.stringify(filtersPayload), { status: 200 });
    }
    if (url.pathname.endsWith("/prices-and-arrivals/date-wise/specific-commodity")) {
      const year = Number(url.searchParams.get("year"));
      const month = Number(url.searchParams.get("month"));
      const monthKey = `${year}-${String(month).padStart(2, "0")}`;
      if (options.failMonth === monthKey) return new Response("temporary failure", { status: 503 });
      return new Response(JSON.stringify(monthReport(year, month, indiaToday())), { status: 200 });
    }
    return new Response("not found", { status: 404 });
  };
  return { fetcher, calls };
}

async function main(): Promise<void> {
  process.env.AGMARKNET_API_BASE_URL = "https://agmarknet.test/v1";
  const today = indiaToday();
  const yesterday = shiftDate(today, -1);
  const currentMonth = today.slice(0, 7);
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
    commodity: "Potato",
    limit: 100,
  }, liveMock.fetcher);
  check(prices.records.length === 1, "monthly commodity report returns the latest observation for the selected mandi and variety");
  check(prices.records[0]?.market === "SMY Bhuntar" && prices.records[0]?.arrival_date === today, "latest observation is selected from the month-wise report");
  check(prices.records.every((record) => record.state === "Himachal Pradesh" && record.district === "Kullu"), "state and district filters are enforced on flattened source rows");
  check(prices.records.every((record) => record.source_unit === "Rs./Quintal"), "price unit is parsed from the government's column titles");
  check(prices.meta.cacheStatus === "live" && prices.meta.total === 1 && !prices.meta.hasNext, "live price pagination reports the full local result set");
  check(
    liveMock.calls.some((call) =>
      call.url.pathname.endsWith("/date-wise/specific-commodity") &&
      call.url.searchParams.get("stateId") === "5" &&
      call.url.searchParams.get("commodityId") === "24" &&
      call.url.searchParams.get("includeExcel") === "false"
    ),
    "monthly report requests the selected state and official commodity ID",
  );

  resetAgmarknetCatalogCache();
  const exactMock = mockFetcher();
  const exact = await fetchAgmarknet2Prices({
    state: "Himachal Pradesh",
    district: "Kullu",
    commodity: "Potato",
    arrivalDate: yesterday,
    limit: 10,
  }, exactMock.fetcher);
  check(
    exact.records.length === 1 &&
      exact.records[0]?.arrival_date === yesterday &&
      exactMock.calls.filter((call) => call.url.pathname.endsWith("/date-wise/specific-commodity")).length === 1,
    "an explicit arrival date returns only that exact day from its monthly report",
  );

  resetAgmarknetCatalogCache();
  const pageMock = mockFetcher();
  const firstPage = await fetchAgmarknet2Prices({
    state: "Himachal Pradesh", commodity: "Potato", limit: 1, offset: 0,
  }, pageMock.fetcher);
  const secondPage = await fetchAgmarknet2Prices({
    state: "Himachal Pradesh", commodity: "Potato", limit: 1, offset: 1,
  }, pageMock.fetcher);
  check(firstPage.meta.total === 2 && firstPage.meta.hasNext, "local pagination reports additional mandi observations");
  check(secondPage.meta.offset === 1 && secondPage.records.length === 1, "local pagination returns the next mandi observation");

  resetAgmarknetCatalogCache();
  const searchMock = mockFetcher();
  const searched = await fetchAgmarknet2PricesForSearch({
    state: "Himachal Pradesh", search: "pot", limit: 100,
  }, searchMock.fetcher);
  check(searched.records.length === 2 && searched.records.every((record) => record.commodity === "Potato"), "crop search expands to the matching public monthly commodity report");

  resetAgmarknetCatalogCache();
  const failureMock = mockFetcher({ failMonth: currentMonth });
  let upstreamFailureSurfaced = false;
  try {
    await fetchAgmarknet2Prices({
      state: "Himachal Pradesh", commodity: "Potato", limit: 10,
    }, failureMock.fetcher);
  } catch {
    upstreamFailureSurfaced = true;
  }
  check(upstreamFailureSurfaced, "failed public monthly reports surface an upstream error instead of fabricated records");

  console.log(`\nAGMARKNET 2.0 tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error("AGMARKNET 2.0 tests could not complete:", error);
  process.exitCode = 1;
});
