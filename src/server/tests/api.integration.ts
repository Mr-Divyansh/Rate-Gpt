import http from "http";
import type { AddressInfo } from "net";
import { createApiApp } from "../../../server.ts";

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
];

const upstreamRequests: URL[] = [];
const upstream = http.createServer((req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  upstreamRequests.push(url);
  const filters = ["State", "District", "Market", "Commodity", "Arrival_Date"];
  let records = sourceRecords.filter((record) =>
    filters.every((field) => {
      const filter = url.searchParams.get(`filters[${field}]`);
      return !filter || String(record[field as keyof typeof record] ?? "") === filter;
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
    total: "1,003",
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
  process.env.NODE_ENV = "test";
  const app = createApiApp();
  const apiServer = http.createServer(app);
  const apiAddress = await listen(apiServer);
  const base = `http://127.0.0.1:${apiAddress.port}`;

  try {
    console.log("\nRate-GPT live API integration tests");

    const health = await fetch(`${base}/api/v1/health`).then((r) => r.json());
    assert(health.success && health.data.priceStorage === "disabled", "health reports disabled price storage");
    assert(health.data.upstreamSource.apiKeyConfigured === true, "health reports key presence without revealing key");
    assert(!JSON.stringify(health).includes(apiKey), "health never returns government key");

    const filters = await fetch(`${base}/api/v1/meta/filters?state=Maharashtra&district=Pune`)
      .then((r) => r.json());
    assert(filters.success && filters.data.districts.includes("Pune"), "live filters return selected-state districts");
    assert(filters.data.markets.includes("Pune Market"), "live filters return selected-district markets");
    const filterRequest = upstreamRequests.at(-1)!;
    assert(filterRequest.searchParams.get("filters[State]") === "Maharashtra", "state is sent as upstream filter");
    assert(filterRequest.searchParams.get("filters[District]") === "Pune", "district is sent as upstream filter");

    const filteredResponse = await fetch(
      `${base}/api/v1/prices?state=Maharashtra&district=Pune&market=Pune%20Market&commodity=Apple&date=2026-11-13&sort=modal_price_desc&limit=2`,
    );
    const filtered = await filteredResponse.json();
    const filteredRequest = upstreamRequests.at(-1)!;
    assert(filteredResponse.status === 200 && filtered.data[0]?.commodity === "Apple", "filtered live prices return government record");
    assert(filteredRequest.searchParams.get("filters[State]") === "Maharashtra", "prices pass state filter upstream");
    assert(filteredRequest.searchParams.get("filters[District]") === "Pune", "prices pass district filter upstream");
    assert(filteredRequest.searchParams.get("filters[Market]") === "Pune Market", "prices pass market filter upstream");
    assert(filteredRequest.searchParams.get("filters[Commodity]") === "Apple", "prices pass commodity filter upstream");
    assert(filteredRequest.searchParams.get("filters[Arrival_Date]") === "13/11/2026", "date filter is normalized upstream");
    assert(filteredRequest.searchParams.get("sort[fields]") === "Modal_Price", "price sort is sent upstream");
    assert(filtered.meta.total === 1003, "comma-separated upstream total is parsed");
    assert(filtered.meta.cacheStatus === "live" && filtered.meta.fetchedAt, "live source and fetch timestamp are returned");
    assert(!JSON.stringify(filtered).includes(apiKey), "price response never returns government key");
    assert(filteredResponse.headers.get("cache-control") === "no-store", "live response is not cacheable");

    const firstPage = await fetch(`${base}/api/v1/prices?limit=2&offset=0`).then((r) => r.json());
    const secondPage = await fetch(`${base}/api/v1/prices?limit=2&offset=2`).then((r) => r.json());
    assert(firstPage.meta.nextOffset === 2 && firstPage.meta.hasNext, "first live page advertises next upstream offset");
    assert(upstreamRequests.at(-1)?.searchParams.get("offset") === "2", "next-page request advances upstream offset");
    assert(secondPage.meta.offset === 2, "second-page response reflects upstream offset");
    assert(firstPage.data.length === 1 && secondPage.data.length === 2, "duplicate records within a page are removed");
    assert(secondPage.data.some((record: any) => record.commodity === "Guava" && record.min_price === null && record.modal_price === null), "missing prices stay null");

    const search = await fetch(`${base}/api/v1/commodities/search?q=%E0%A4%85%E0%A4%82%E0%A4%97%E0%A5%82%E0%A4%B0`)
      .then((r) => r.json());
    assert(search.success && search.data.includes("Grapes"), "Hindi fruit search discovers the English fruit suggestion");

    const status = await fetch(`${base}/api/v1/sync-status`).then((r) => r.json());
    assert(status.data.mode === "on-demand" && !status.data.bulkSyncEnabled, "sync status confirms bulk sync is disabled");
    assert(status.data.schedulerEnabled === false, "sync status confirms no scheduler");

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
