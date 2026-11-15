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
      { state_id: 7, state_name: "Andaman and Nicobar" },
      { state_id: 8, state_name: "Chattisgarh" },
      { state_id: 9, state_name: "NCT of Delhi" },
      { state_id: 10, state_name: "Keralam" },
      { state_id: 11, state_name: "Pondicherry" },
      { state_id: 12, state_name: "Dadra and Nagar Haveli" },
      { state_id: 13, state_name: "Daman and Diu" },
      { state_id: 100006, state_name: "All States/UTs" },
    ],
    district_data: [
      { id: 51, state_id: 5, district_name: "Kullu" },
      { id: 52, state_id: 5, district_name: "Mandi" },
      { id: 61, state_id: 6, district_name: "Ludhiana" },
      { id: 71, state_id: 7, district_name: "South Andaman" },
      { id: 81, state_id: 8, district_name: "Raipur" },
      { id: 91, state_id: 9, district_name: "New Delhi" },
      { id: 101, state_id: 10, district_name: "Ernakulam" },
      { id: 111, state_id: 11, district_name: "Puducherry" },
      { id: 121, state_id: 12, district_name: "Dadra and Nagar Haveli" },
      { id: 131, state_id: 13, district_name: "Diu" },
    ],
    market_data: [
      { id: 501, state_id: 5, district_id: 51, mkt_name: "SMY Bhuntar" },
      { id: 502, state_id: 5, district_id: 52, mkt_name: "SMY Takoli" },
      { id: 601, state_id: 6, district_id: 61, mkt_name: "Ludhiana APMC" },
      { id: 701, state_id: 7, district_id: 71, mkt_name: "Port Blair APMC" },
      { id: 801, state_id: 8, district_id: 81, mkt_name: "Raipur APMC" },
      { id: 901, state_id: 9, district_id: 91, mkt_name: "New Delhi APMC" },
      { id: 1001, state_id: 10, district_id: 101, mkt_name: "Ernakulam APMC" },
      { id: 1101, state_id: 11, district_id: 111, mkt_name: "Puducherry APMC" },
      { id: 1201, state_id: 12, district_id: 121, mkt_name: "Silvassa APMC" },
      { id: 1301, state_id: 13, district_id: 131, mkt_name: "Diu APMC" },
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
  const delhi = await fetchAgmarknet2Filters({ state: "Delhi" }, mock.fetcher);
  check(delhi.districts.includes("New Delhi") && delhi.markets.includes("New Delhi APMC"), "Delhi selector maps to the official NCT of Delhi directory name");

  const kerala = await fetchAgmarknet2Filters({ state: "Kerala" }, mock.fetcher);
  check(kerala.districts.includes("Ernakulam") && kerala.markets.includes("Ernakulam APMC"), "Kerala selector maps to the official Keralam directory name");

  const chhattisgarh = await fetchAgmarknet2Filters({ state: "Chhattisgarh" }, mock.fetcher);
  check(chhattisgarh.markets.includes("Raipur APMC"), "Chhattisgarh selector maps to the source spelling Chattisgarh");

  const andaman = await fetchAgmarknet2Filters({ state: "Andaman and Nicobar Islands" }, mock.fetcher);
  check(andaman.markets.includes("Port Blair APMC"), "Andaman and Nicobar Islands selector maps to the source directory name");

  const puducherry = await fetchAgmarknet2Filters({ state: "Puducherry" }, mock.fetcher);
  check(puducherry.markets.includes("Puducherry APMC"), "Puducherry selector maps to the source name Pondicherry");

  const combinedUt = await fetchAgmarknet2Filters({
    state: "Dadra and Nagar Haveli and Daman and Diu",
  }, mock.fetcher);
  check(
    combinedUt.markets.includes("Silvassa APMC") && combinedUt.markets.includes("Diu APMC"),
    "combined Dadra and Nagar Haveli and Daman and Diu selector merges both source directories",
  );

  const ladakh = await fetchAgmarknet2Filters({ state: "Ladakh" }, mock.fetcher);
  check(
    ladakh.coverage.status === "complete" && ladakh.markets.length === 0,
    "a state absent from the official directory returns an honest empty result",
  );

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
