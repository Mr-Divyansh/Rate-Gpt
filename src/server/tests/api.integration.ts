import http from "http";
import type { AddressInfo } from "net";
import { createApiApp } from "../../../server.ts";
import { normalizeArrivalDate } from "../services/mandiDataService.js";

const apiKey = "integration-only-upstream-key";
const sourceRecords = [
  {
    id: "apple-1",
    State: "Maharashtra",
    District: "Pune",
    Market: "Pune Market",
    Commodity: "Apple",
    Variety: "Red",
    Arrival_Date: "13/11/2026",
    Min_Price: "1,800",
    Max_Price: "2,400",
    Modal_Price: "2,100",
  },
  {
    id: "delhi-apple-1",
    State: "NCT of Delhi",
    District: "New Delhi",
    Market: "Azadpur APMC",
    Commodity: "Apple",
    Variety: "Red",
    Arrival_Date: "13/11/2026",
    Min_Price: "1,700",
    Max_Price: "2,300",
    Modal_Price: "2,000",
  },
  {
    id: "apple-1",
    State: "Maharashtra",
    District: "Pune",
    Market: "Pune Market",
    Commodity: "Apple",
    Variety: "Red",
    Arrival_Date: "13/11/2026",
    Min_Price: "1,800",
    Max_Price: "2,400",
    Modal_Price: "2,100",
  },
  {
    id: "mango-1",
    State: "Maharashtra",
    District: "Pune",
    Market: "Pune Market",
    Commodity: "Mango",
    Arrival_Date: "12/11/2026",
    Min_Price: "900",
    Max_Price: "1,300",
    Modal_Price: "1,100",
  },
  {
    id: "guava-1",
    State: "Gujarat",
    District: "Surat",
    Market: "Surat Market",
    Commodity: "Guava",
    Arrival_Date: "13/11/2026",
    Min_Price: null,
    Max_Price: null,
    Modal_Price: null,
  },
  {
    id: "grapes-1",
    State: "Karnataka",
    District: "Bengaluru Rural",
    Market: "Bengaluru Market",
    Commodity: "Grapes",
    Arrival_Date: "13/11/2026",
    Min_Price: "3,000",
    Max_Price: "4,000",
    Modal_Price: "3,500",
  },
  {
    State: "Andhra Pradesh",
    District: "Alluri Sitharama Raju",
    Market: "Chintapally APMC",
    Commodity: "Gur(Jaggery)",
    Variety: "Other",
    Grade: "FAQ",
    Arrival_Date: "13/11/2026",
    Min_Price: "5,110",
    Max_Price: "5,110",
    Modal_Price: "5,110",
  },
  {
    State: "Andhra Pradesh",
    District: "Alluri Sitharama Raju",
    Market: "Araku Valley APMC",
    Commodity: "Turmeric",
    Variety: "Finger",
    Grade: "Grade Range-1",
    Arrival_Date: "13/11/2026",
    Min_Price: "17,920",
    Max_Price: "17,920",
    Modal_Price: "17,920",
  },
  {
    State: "Andhra Pradesh",
    District: "Alluri Sitharama Raju",
    Market: "Paderu APMC",
    Commodity: "Groundnut",
    Variety: "Local",
    Grade: "Grade Range-2",
    Arrival_Date: "13/11/2026",
    Min_Price: "7,300",
    Max_Price: "7,300",
    Modal_Price: "7,300",
  },
];

const expectedStatesAndUnionTerritories = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
  "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka",
  "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

const stateIds = new Map(expectedStatesAndUnionTerritories.map((name, index) => [name, index + 1]));
const districtDirectory = new Map<string, { id: number; state_id: number; district_name: string }>();
const marketDirectory = new Map<string, { id: number; state_id: number; district_id: number; mkt_name: string }>();
const commodityDirectory = new Map<string, { cmdt_id: number; cmdt_name: string; cmdt_group_id: number }>();
let nextDistrictId = 100;
let nextMarketId = 1_000;
let nextCommodityId = 1;
for (const record of sourceRecords as any[]) {
  const state_id = stateIds.get(record.State);
  if (!state_id) continue;
  const districtKey = `${record.State}| ${record.District}`;
  if (!districtDirectory.has(districtKey)) {
    districtDirectory.set(districtKey, {
      id: nextDistrictId++, state_id, district_name: record.District,
    });
  }
  const district = districtDirectory.get(districtKey)!;
  const marketKey = `${districtKey}| ${record.Market}`;
  if (!marketDirectory.has(marketKey)) {
    marketDirectory.set(marketKey, {
      id: nextMarketId++, state_id, district_id: district.id, mkt_name: record.Market,
    });
  }
  if (!commodityDirectory.has(record.Commodity)) {
    commodityDirectory.set(record.Commodity, {
      cmdt_id: nextCommodityId++, cmdt_name: record.Commodity, cmdt_group_id: 4,
    });
  }
}

const upstreamRequests: URL[] = [];
const upstream = http.createServer((req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  upstreamRequests.push(url);

  if (url.pathname.endsWith("/daily-price-arrival/filters")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: true,
      message: "Filters fetched successfully",
      data: {
        state_data: expectedStatesAndUnionTerritories.map((state_name) => ({
          state_id: stateIds.get(state_name), state_name,
        })),
        district_data: [...districtDirectory.values()],
        market_data: [...marketDirectory.values()],
        cmdt_data: [...commodityDirectory.values()],
      },
    }));
    return;
  }

  const filters = [
    ["filters[state.keyword]", "State"],
    ["filters[district.keyword]", "District"],
    ["filters[market.keyword]", "Market"],
    ["filters[commodity.keyword]", "Commodity"],
    ["filters[arrival_date]", "Arrival_Date"],
  ] as const;
  let records = (sourceRecords as any[]).filter((record) =>
    filters.every(([parameter, field]) => {
      const filter = url.searchParams.get(parameter);
      const sourceValue = field === "Arrival_Date"
        ? normalizeArrivalDate(String(record[field])) ?? String(record[field])
        : String(record[field]);
      const normalizedFilter = field === "Arrival_Date" ? normalizeArrivalDate(filter) ?? filter : filter;
      return !filter || sourceValue === normalizedFilter;
    }),
  );
  const query = url.searchParams.get("q")?.toLocaleLowerCase();
  if (query) {
    records = records.filter((record) =>
      record.Commodity.toLocaleLowerCase().includes(query),
    );
  }
  const offset = Number(url.searchParams.get("offset") || 0);
  const limit = Number(url.searchParams.get("limit") || 50);
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({
    status: "ok",
    title: "Current Daily Price of Various Commodities from Various Markets (Mandi)",
    updated: 1_794_600_047,
    total: String(records.length),
    count: Math.min(limit, Math.max(0, records.length - offset)),
    limit: String(limit),
    offset: String(offset),
    records: records.slice(offset, offset + limit),
  }));
});

const listen = (server: http.Server) =>
  new Promise<AddressInfo>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server.address() as AddressInfo));
  });
const close = (server: http.Server) =>
  new Promise<void>((resolve, reject) =>
    server.close((error) => error ? reject(error) : resolve()),
  );

let passed = 0;
let failed = 0;
function assert(condition: boolean, name: string, detail = "") {
  if (condition) {
    console.log(`  PASS ${name}`);
    passed += 1;
  } else {
    console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
    failed += 1;
  }
}

async function main() {
  const upstreamAddress = await listen(upstream);
  process.env.DATA_GOV_API_KEY = apiKey;
  process.env.DATA_GOV_API_BASE_URL =
    `http://127.0.0.1:${upstreamAddress.port}/resource`;
  process.env.AGMARKNET_API_BASE_URL =
    `http://127.0.0.1:${upstreamAddress.port}/v1`;
  process.env.NODE_ENV = "test";
  process.env.VERCEL_GIT_COMMIT_SHA = "integration-test-commit";
  const app = createApiApp();
  const apiServer = http.createServer(app);
  const apiAddress = await listen(apiServer);
  const base = `http://127.0.0.1:${apiAddress.port}`;

  try {
    console.log("\nRate-GPT live API integration tests");

    const healthResponse = await fetch(`${base}/api/v1/health`, {
      headers: { "X-Request-Id": "caller-controlled-request-id" },
    });
    const health = await healthResponse.json();
    const generatedRequestId = healthResponse.headers.get("x-request-id") || "";
    assert(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(generatedRequestId) &&
        generatedRequestId !== "caller-controlled-request-id",
      "request IDs are generated by the server and caller values are not trusted",
    );
    assert(health.success && health.data.status === "ok", "health returns minimal service status");
    assert(!("upstreamSource" in health.data) && !("apiKeyConfigured" in health.data), "health does not disclose upstream credential configuration");
    assert(!JSON.stringify(health).includes(apiKey), "health never returns government key");
    const securityHeaders = {
      csp: healthResponse.headers.get("content-security-policy") || "",
      hsts: healthResponse.headers.get("strict-transport-security") || "",
      frame: healthResponse.headers.get("x-frame-options") || "",
      noSniff: healthResponse.headers.get("x-content-type-options") || "",
      referrer: healthResponse.headers.get("referrer-policy") || "",
      permissions: healthResponse.headers.get("permissions-policy") || "",
    };
    assert(securityHeaders.csp.includes("default-src 'self'") && !securityHeaders.csp.includes("'unsafe-eval'"), "API uses a restrictive CSP without unsafe-eval");
    assert(securityHeaders.hsts.includes("max-age="), "API responses enable HSTS");
    assert(securityHeaders.frame === "DENY", "API responses deny framing");
    assert(securityHeaders.noSniff === "nosniff", "API responses set nosniff");
    assert(securityHeaders.referrer === "strict-origin-when-cross-origin", "API responses use a strict referrer policy");
    assert(securityHeaders.permissions.includes("camera=()") && securityHeaders.permissions.includes("geolocation=()"), "API responses disable unused powerful browser features");
    assert(healthResponse.headers.get("access-control-allow-origin") === null, "API does not enable cross-origin access");

    const docs = await fetch(`${base}/api/v1/docs`);
    assert(docs.status === 404, "OpenAPI documentation endpoint is not publicly exposed");

    const missingConsent = await fetch(`${base}/api/v1/contact`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test", email: "test@example.com", message: "Hello", consent: false }),
    });
    assert(missingConsent.status === 400, "contact submission requires explicit policy consent");

    const oversizedBody = await fetch(`${base}/api/v1/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test", email: "test@example.com", message: "x".repeat(40 * 1024), consent: true }),
    });
    const oversizedPayload = await oversizedBody.json();
    assert(
      oversizedBody.status === 413 &&
        oversizedPayload.error?.code === "PAYLOAD_TOO_LARGE",
      "oversized JSON request bodies are rejected with HTTP 413",
    );

    const malformedBody = await fetch(`${base}/api/v1/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{invalid-json",
    });
    const malformedPayload = await malformedBody.json();
    assert(
      malformedBody.status === 400 && malformedPayload.error?.code === "BAD_REQUEST",
      "malformed JSON receives a safe HTTP 400 response",
    );

    const previousFetch = globalThis.fetch;
    const previousContactKey = process.env.WEB3FORMS_ACCESS_KEY;
    const forwardedContact: { value?: Record<string, unknown> } = {};
    process.env.WEB3FORMS_ACCESS_KEY = "integration-only-contact-key";
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      assert(String(input) === "https://api.web3forms.com/submit", "contact is forwarded server-to-server");
      forwardedContact.value = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    }) as typeof fetch;
    const contactResponse = await previousFetch(`${base}/api/v1/contact`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test User", email: "test@example.com", phone: "", message: "Test request", consent: true, botcheck: "" }),
    });
    const contactPayload = await contactResponse.json();
    assert(contactResponse.status === 200 && contactPayload.success, "valid consented contact form is accepted");
    assert(forwardedContact.value?.access_key === "integration-only-contact-key", "contact provider key is attached only on the server");
    assert(!JSON.stringify(contactPayload).includes("integration-only-contact-key"), "contact response never exposes provider key");
    globalThis.fetch = previousFetch;
    if (previousContactKey === undefined) delete process.env.WEB3FORMS_ACCESS_KEY;
    else process.env.WEB3FORMS_ACCESS_KEY = previousContactKey;

    const discoveryResponse = await fetch(`${base}/api/v1/`);
    const discovery = await discoveryResponse.json();
    assert(
      discoveryResponse.status === 200 &&
        discovery.success &&
        discovery.data.openapi.endsWith("/openapi.json") &&
        discovery.data.priceStorage === "disabled" &&
        discovery.data.commitSha === "integration-test-commit" &&
        discovery.data.endpoints?.contact === "/api/v1/contact" &&
        discovery.data.endpoints?.trend === "/api/v1/prices/trend",
      "API root provides machine-readable discovery for all public endpoints, including contact and disabled historical trends",
    );

    const filters = await fetch(`${base}/api/v1/meta/filters?state=Maharashtra&district=Pune`)
      .then((r) => r.json());
    assert(filters.success && filters.data.districts.includes("Pune"), "live filters return selected-state districts");
    assert(filters.data.markets.includes("Pune Market"), "live filters return selected-district markets");
    const initialFilterRequest = upstreamRequests.at(-1)!;

    assert(
      filters.data.states.length === 36 &&
        expectedStatesAndUnionTerritories.every((state) => filters.data.states.includes(state)),
      "state selector contains all 28 States and 8 Union Territories",
    );

    // Exercise every official selector value against the AGMARKNET 2.0 master
    // directory. The fixture deliberately has market rows for only four states;
    // other states must return empty location lists rather than borrowed or
    // fabricated market data.
    for (const stateName of expectedStatesAndUnionTerritories) {
      const stateResponse = await fetch(
        `${base}/api/v1/meta/filters?state=${encodeURIComponent(stateName)}`,
      );
      const statePayload = await stateResponse.json();
      const expectedDistricts = [...new Set(
        sourceRecords
          .filter((record) => record.State === stateName)
          .map((record) => record.District),
      )].sort((left, right) => left.localeCompare(right));
      assert(
        stateResponse.status === 200 &&
          statePayload.success &&
          statePayload.data.states.includes(stateName),
        `state selector request succeeds for ${stateName}`,
      );
      assert(
        JSON.stringify(statePayload.data.districts) === JSON.stringify(expectedDistricts) &&
          statePayload.data.coverage.status === "complete",
        `district discovery is state-scoped and complete for ${stateName}`,
      );
    }
    assert(filters.data.coverage.status === "complete" && filters.meta.coverage.pagesScanned === 1, "filter responses expose their actual scanned coverage");
    assert(
      initialFilterRequest.pathname.endsWith("/daily-price-arrival/filters") &&
        filters.meta.source === "Government of India AGMARKNET 2.0",
      "state and mandi options come from the complete AGMARKNET 2.0 directory",
    );

    const filteredResponse = await fetch(
      `${base}/api/v1/prices?state=Maharashtra&district=Pune&market=Pune%20Market&commodity=Apple&date=2026-11-13&sort=modal_price_desc&limit=2`,
    );
    const filtered = await filteredResponse.json();
    const filteredRequest = upstreamRequests.at(-1)!;
    assert(filteredResponse.status === 200 && filtered.data[0]?.commodity === "Apple", "filtered live prices return government record");
    assert(filteredResponse.status === 200 && filtered.data[0]?.commodity === "Apple", "filtered live prices return government record");
    assert(filteredRequest.searchParams.get("filters[state.keyword]") === "Maharashtra", "prices pass state filter upstream");
    assert(filteredRequest.searchParams.get("filters[district.keyword]") === "Pune", "prices pass district exact-match filter upstream");
    assert(filteredRequest.searchParams.get("filters[market.keyword]") === "Pune Market", "prices pass market exact-match filter upstream");
    assert(filteredRequest.searchParams.get("filters[commodity.keyword]") === "Apple", "prices pass commodity exact-match filter upstream");
    assert(filteredRequest.searchParams.get("filters[arrival_date]") === "2026-11-13", "date filter is normalized upstream");
    assert(!filteredRequest.searchParams.has("sort[Modal_Price]"), "unsupported OGD modal-price sorting is not requested upstream");
    assert(!filteredRequest.searchParams.has("sort[order]"), "price sort does not send invalid sort[order] parameter");
    assert(!filteredRequest.searchParams.has("sort[Arrival_Date]"), "date sort is omitted because AGMARKNET Arrival_Date is not sortable");
    assert(filtered.meta.total === 2 && filtered.data.length === 1, "upstream totals are retained while duplicate daily records are removed");
    assert(filtered.meta.upstreamHasNext === false && filtered.meta.truncated === false, "price pagination distinguishes upstream completion from local boundary truncation");
    assert(filtered.meta.cacheStatus === "live" && filtered.meta.fetchedAt, "live source and fetch timestamp are returned");
    assert(
      filtered.meta.upstreamUpdatedAt === "2026-11-13T20:00:47.000Z" &&
        filtered.meta.upstreamUpdatedAt !== filtered.meta.fetchedAt,
      "upstream dataset update time is returned separately from the successful fetch time",
    );
    assert(filtered.data[0]?.source_unit === "Not provided by source", "missing source unit is not fabricated as Rs/Quintal");
    assert(!JSON.stringify(filtered).includes(apiKey), "price response never returns government key");
    assert(filteredResponse.headers.get("cache-control") === "no-store", "live response is not cacheable");

    const delhiResponse = await fetch(`${base}/api/v1/prices?state=Delhi&limit=5`);
    const delhiPayload = await delhiResponse.json();
    const delhiRequest = upstreamRequests.at(-1)!;
    assert(
      delhiResponse.status === 200 &&
        delhiPayload.data.some((record: any) => record.state === "NCT of Delhi"),
      "canonical Delhi selection returns OGD records published under NCT of Delhi",
    );
    assert(
      delhiRequest.searchParams.get("filters[state.keyword]") === "NCT of Delhi",
      "canonical Delhi filter is normalized to the exact OGD state spelling",
    );

    const firstPage = await fetch(`${base}/api/v1/prices?limit=2&offset=0`).then((r) => r.json());
    const secondPage = await fetch(`${base}/api/v1/prices?limit=2&offset=2`).then((r) => r.json());
    const nationalRequest = upstreamRequests.at(-2);
    assert(
      Boolean(nationalRequest &&
        !nationalRequest.searchParams.has("filters[state.keyword]") &&
        !nationalRequest.searchParams.has("filters[district.keyword]") &&
        !nationalRequest.searchParams.has("filters[market.keyword]")),
      "unfiltered national pages do not apply location filters",
    );
    assert(firstPage.meta.nextOffset === 2 && firstPage.meta.hasNext, "first live page advertises next upstream offset");
    assert(upstreamRequests.at(-1)?.searchParams.get("offset") === "2", "next-page request advances upstream offset");
    assert(secondPage.meta.offset === 2, "second-page response reflects upstream offset");
    assert(firstPage.data.length === 1 && secondPage.data.length === 2, "duplicate records within a page are removed");
    assert(secondPage.data.some((record: any) => record.commodity === "Guava" && record.min_price === null && record.modal_price === null), "missing prices stay null");

    const verifiedAndhraMarkets = [
      { market: "Chintapally APMC", commodity: "Gur(Jaggery)", grade: "FAQ" },
      { market: "Araku Valley APMC", commodity: "Turmeric", grade: "Grade Range-1" },
      { market: "Paderu APMC", commodity: "Groundnut", grade: "Grade Range-2" },
    ];
    for (const item of verifiedAndhraMarkets) {
      const query = new URLSearchParams({
        state: "Andhra Pradesh",
        district: "Alluri Sitharama Raju",
        market: item.market,
        commodity: item.commodity,
        limit: "100",
        offset: "0",
      });
      const marketResponse = await fetch(`${base}/api/v1/prices?${query}`);
      const marketPayload = await marketResponse.json();
      const sourceRequest = upstreamRequests.at(-1)!;
      assert(
        marketResponse.status === 200 &&
          marketPayload.meta.total === 1 &&
          marketPayload.data.length === 1 &&
          marketPayload.data[0]?.market === item.market &&
          marketPayload.data[0]?.commodity === item.commodity &&
          marketPayload.data[0]?.grade === item.grade,
        `${item.market} regression preserves the source observation`,
      );
      assert(
        sourceRequest.searchParams.get("filters[state.keyword]") === "Andhra Pradesh" &&
          sourceRequest.searchParams.get("filters[district.keyword]") === "Alluri Sitharama Raju" &&
          sourceRequest.searchParams.get("filters[market.keyword]") === item.market &&
          sourceRequest.searchParams.get("filters[commodity.keyword]") === item.commodity,
        `${item.market} regression sends exact state, district, market and commodity filters upstream`,
      );
    }

    const search = await fetch(`${base}/api/v1/commodities/search?q=%E0%A4%85%E0%A4%82%E0%A4%97%E0%A5%82%E0%A4%B0`)
      .then((r) => r.json());
    assert(search.success && search.data.length === 1 && search.data[0] === "Grapes", "Hindi commodity search returns an upstream commodity only");
    assert(search.meta.sourceDerived === true, "commodity search identifies source-derived suggestions");

    const comparison = await fetch(
      `${base}/api/v1/prices/compare?commodity=Apple&date=2026-11-13`,
    ).then((r) => r.json());
    const comparisonRequest = upstreamRequests.at(-1)!;
    assert(comparison.success && comparison.data[0]?.commodity === "Apple", "market comparison reads live government prices");
    assert(comparisonRequest.searchParams.get("filters[commodity.keyword]") === "Apple", "live comparison forwards commodity exact-match filter");
    assert(comparisonRequest.searchParams.get("filters[arrival_date]") === "2026-11-13", "live comparison forwards requested arrival date");
    assert(comparison.meta.source === "Government of India OGD / AGMARKNET", "live comparison identifies government source");
    assert(comparison.meta.arrivalDate === "2026-11-13" && comparison.meta.comparisonRule.includes("matching variety"), "comparison identifies observation date and matching requirements");
    const comparisonWithoutDate = await fetch(`${base}/api/v1/prices/compare?commodity=Apple`);
    assert(comparisonWithoutDate.status === 400, "comparison rejects requests without an observation date");

    const historicalTrend = await fetch(
      `${base}/api/v1/prices/trend?commodity=Apple&market=Pune%20Market`,
    );
    assert(historicalTrend.status === 410, "historical trends are explicitly disabled when no history is retained");

    const status = await fetch(`${base}/api/v1/sync-status`).then((r) => r.json());
    assert(status.data.mode === "on-demand" && !status.data.bulkSyncEnabled, "sync status confirms bulk sync is disabled");
    assert(status.data.schedulerEnabled === false, "sync status confirms no scheduler");
    assert(status.data.priceStorage === "disabled", "sync status confirms price storage is disabled");
    assert(status.data.lastFetchedAt === null && status.data.upstreamUpdatedAt === null, "sync status does not invent fetch or upstream update timestamps");
    assert(typeof status.data.timestamp === "string" && Number.isFinite(Date.parse(status.data.timestamp)), "sync status exposes a valid response timestamp");

    const invalid = await fetch(`${base}/api/v1/prices?offset=-1`);
    assert(invalid.status === 400, "invalid pagination is rejected");
    assert(!JSON.stringify(filtered).includes("api-key"), "upstream key parameter is not exposed in response");

    console.log(`\nSUMMARY: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exitCode = 1;
  } finally {
    await close(apiServer);
    await close(upstream);
  }
}

main().catch((error) => {
  console.error("Integration test failed:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
});
