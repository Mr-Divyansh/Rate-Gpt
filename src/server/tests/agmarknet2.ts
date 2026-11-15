import {
  fetchAgmarknet2Filters,
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

function mockFetcher() {
  let calls = 0;
  const fetcher: typeof fetch = async (input) => {
    calls += 1;
    if (String(input).endsWith("/daily-price-arrival/filters")) {
      return new Response(JSON.stringify(filtersPayload), { status: 200 });
    }
    return new Response("not found", { status: 404 });
  };
  return { fetcher, get calls() { return calls; } };
}

async function main(): Promise<void> {
  process.env.AGMARKNET_API_BASE_URL = "https://agmarknet.test/v1";
  resetAgmarknetCatalogCache();

  const mock = mockFetcher();
  const root = await fetchAgmarknet2Filters({}, mock.fetcher);
  check(root.states.includes("Himachal Pradesh") && !root.states.includes("All States/UTs"), "state catalogue excludes the all-states sentinel");
  check(root.coverage.status === "catalogue" && root.cache.status === "temporary-cache", "root filter metadata identifies a cached administrative catalogue");

  const hp = await fetchAgmarknet2Filters({ state: "Himachal Pradesh" }, mock.fetcher);
  check(hp.districts.join(",") === "Kullu,Mandi", "state filter returns every registered district");
  check(hp.markets.length === 2 && hp.markets.includes("SMY Bhuntar"), "state filter returns every registered mandi");
  check(hp.commodities.includes("Potato") && !hp.commodities.includes("All Commodities"), "commodity catalogue excludes the all-commodities sentinel");

  const kullu = await fetchAgmarknet2Filters({ state: "Himachal Pradesh", district: "Kullu" }, mock.fetcher);
  check(kullu.markets.length === 1 && kullu.markets[0] === "SMY Bhuntar", "district filter returns only mandis in that district");
  check(mock.calls === 1, "administrative catalogue is cached and fetched once");

  const search = await searchAgmarknet2Commodities("pot", 10, mock.fetcher);
  check(search.length === 1 && search[0] === "Potato", "commodity search uses the complete official catalogue");
  const hindiSearch = await searchAgmarknet2Commodities("आलू", 10, mock.fetcher);
  check(hindiSearch.includes("Potato"), "Hindi commodity search maps to the official English crop catalogue");

  console.log(`\nAGMARKNET 2.0 catalogue tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error("AGMARKNET 2.0 catalogue tests could not complete:", error);
  process.exitCode = 1;
});
