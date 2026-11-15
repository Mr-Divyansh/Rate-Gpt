const BASE_URL = (process.env.RATE_GPT_BASE_URL || "https://rate-gpt.vercel.app").replace(/\/+$/, "");
const TIMEOUT_MS = 15_000;
let passed = 0;
let failed = 0;

function indiaTodayIsoDate(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function shiftIsoDate(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function check(condition: boolean, label: string): void {
  if (condition) {
    passed += 1;
    console.log(`PASS ${label}`);
  } else {
    failed += 1;
    console.error(`FAIL ${label}`);
  }
}

async function request(path: string): Promise<Response> {
  return fetch(new URL(path, BASE_URL), {
    headers: { Accept: "application/json, text/html" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

async function json(path: string): Promise<{ response: Response; body: any }> {
  const response = await request(path);
  const body = await response.json().catch(() => null);
  return { response, body };
}

async function main(): Promise<void> {
  console.log(`Rate-GPT production smoke checks: ${BASE_URL}`);

  const health = await json("/api/v1/health");
  check(health.response.status === 200, "health endpoint returns HTTP 200");
  check(health.body?.success === true && health.body?.data?.status === "ok", "health response has the documented success envelope");

  const sync = await json("/api/v1/sync-status");
  check(sync.response.status === 200 && sync.body?.success === true, "on-demand status endpoint is available");
  check(
    sync.body?.data?.mode === "on-demand" &&
      sync.body?.data?.priceStorage === "disabled" &&
      sync.body?.data?.schedulerEnabled === false,
    "production reports live-only mode without persistent price storage",
  );

  const filters = await json("/api/v1/meta/filters");
  check(filters.response.status === 200 && filters.body?.success === true, "government location catalogue endpoint is available");
  check(
    Array.isArray(filters.body?.data?.states) &&
      filters.body.data.states.length >= 36 &&
      filters.body?.meta?.coverage?.status === "catalogue",
    "state and UT selector exposes the full official administrative catalogue",
  );

  // State-scoped checks validate that location discovery and price records
  // describe the same live upstream scope without hard-coding a daily row count.
  const hpFilters = await json("/api/v1/meta/filters?state=Himachal%20Pradesh");
  check(
    hpFilters.response.status === 200 &&
      hpFilters.body?.success === true &&
      hpFilters.body?.data?.coverage?.status === "complete",
    "Himachal Pradesh live location discovery completes all upstream-reported pages",
  );
  check(
    Array.isArray(hpFilters.body?.data?.districts) &&
      Array.isArray(hpFilters.body?.data?.markets) &&
      Array.isArray(hpFilters.body?.data?.commodities) &&
      hpFilters.body.data.coverage.recordsScanned === hpFilters.body.data.coverage.total,
    "Himachal Pradesh filter options are derived from the complete reported source scope",
  );

  const hpPrices = await json("/api/v1/prices?state=Himachal%20Pradesh&limit=100");
  check(
    hpPrices.response.status === 200 &&
      hpPrices.body?.success === true &&
      Array.isArray(hpPrices.body?.data),
    "Himachal Pradesh live price endpoint returns a records array",
  );
  if (Array.isArray(hpPrices.body?.data)) {
    const hpDistricts = new Set(hpFilters.body?.data?.districts ?? []);
    const hpMarkets = new Set(hpFilters.body?.data?.markets ?? []);
    const hpCommodities = new Set(hpFilters.body?.data?.commodities ?? []);
    check(
      hpPrices.body.data.every((record: any) =>
        record.state === "Himachal Pradesh" &&
        hpDistricts.has(record.district) &&
        hpMarkets.has(record.market) &&
        hpCommodities.has(record.commodity)
      ),
      "Himachal Pradesh price records agree with the discovered district, market and crop options",
    );
    check(
      hpPrices.body?.meta?.cacheStatus === "live" &&
        Number.isInteger(hpPrices.body?.meta?.total) &&
        hpPrices.body.meta.total >= hpPrices.body.data.length &&
        hpPrices.body?.meta?.hasNext === (hpPrices.body.meta.nextOffset < hpPrices.body.meta.total),
      "Himachal Pradesh live pagination metadata is internally consistent",
    );
  }

  const priorReportDate = shiftIsoDate(indiaTodayIsoDate(), -2);
  const hpPriorDay = await json(
    `/api/v1/prices?state=Himachal%20Pradesh&date=${encodeURIComponent(priorReportDate)}&limit=100`,
  );
  check(
    hpPriorDay.response.status === 200 &&
      hpPriorDay.body?.success === true &&
      Array.isArray(hpPriorDay.body?.data),
    "OGD accepts an exact historical arrival-date query",
  );
  if (hpPriorDay.body?.data?.length) {
    check(
      hpPriorDay.body.data.every((record: any) =>
        record.state === "Himachal Pradesh" && record.arrival_date === priorReportDate
      ),
      "historical date results contain only the requested state and arrival date",
    );
  } else {
    console.log(`INFO OGD returned no Himachal Pradesh rows for ${priorReportDate}; the current-daily resource does not expose a historical observation for that date.`);
  }

  const hpPotatoPrices = await json("/api/v1/prices?state=Himachal%20Pradesh&commodity=Potato&limit=100");
  check(
    hpPotatoPrices.response.status === 200 &&
      hpPotatoPrices.body?.success === true &&
      Array.isArray(hpPotatoPrices.body?.data) &&
      hpPotatoPrices.body?.meta?.source === "Government of India OGD / AGMARKNET",
    "Himachal Pradesh crop search uses the verified live OGD price resource",
  );
  check(
    hpPotatoPrices.body?.meta?.cacheStatus === "live" &&
      hpPotatoPrices.body?.data?.every((record: any) =>
        record.state === "Himachal Pradesh" &&
        record.commodity === "Potato" &&
        typeof record.source_unit === "string" &&
        record.source_unit.length > 0
      ),
    "live crop observations preserve state, commodity and an explicit or unknown source unit",
  );

  const prices = await json("/api/v1/prices?limit=5");
  check(prices.response.status === 200 && prices.body?.success === true, "live government prices endpoint returns HTTP 200");
  check(Array.isArray(prices.body?.data), "live prices response contains a records array");
  check(prices.body?.meta?.cacheStatus === "live", "price response identifies live fetch mode");
  check(
    typeof prices.body?.meta?.fetchedAt === "string" &&
      !Number.isNaN(Date.parse(prices.body.meta.fetchedAt)),
    "price response includes a valid API fetch timestamp",
  );

  if (Array.isArray(prices.body?.data)) {
    for (const [index, record] of prices.body.data.entries()) {
      check(
        typeof record.state === "string" &&
          typeof record.district === "string" &&
          typeof record.market === "string" &&
          typeof record.commodity === "string" &&
          /^\d{4}-\d{2}-\d{2}$/.test(record.arrival_date),
        `price record ${index + 1} has required location, crop and normalized arrival date fields`,
      );
      check(
        ["min_price", "max_price", "modal_price"].every((key) =>
          record[key] === null || (typeof record[key] === "number" && Number.isFinite(record[key]) && record[key] >= 0)
        ),
        `price record ${index + 1} contains only valid numeric or null price values`,
      );
      check(
        typeof record.source_unit === "string" && record.source_unit.length > 0,
        `price record ${index + 1} declares its source unit`,
      );
    }
  }

  const page = await request("/mandi-prices.html");
  const html = await page.text();
  check(page.status === 200 && /<title[^>]*>Rate-GPT<\/title>/i.test(html), "public mandi prices page is served");
  check(page.headers.has("content-security-policy"), "production page sends Content-Security-Policy");
  check(page.headers.get("x-content-type-options") === "nosniff", "production page sends X-Content-Type-Options: nosniff");
  check(page.headers.has("strict-transport-security"), "production page sends HSTS");

  console.log(`\nProduction smoke checks: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error("Production smoke checks could not complete:", error);
  process.exitCode = 1;
});
