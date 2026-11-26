/** Deterministic service checks. No network calls and no database setup. */
import {
  fetchLivePrices,
  fetchLiveFilters,
  GovernmentApiError,
  isFutureArrivalDate,
  mapUpstreamRecord,
  normalizeArrivalDate,
  parseUpstreamUpdatedAt,
  parsePrice,
  parseReportedTotal,
  normalizeCommoditySearch,
  searchLiveCommodities,
} from "../services/mandiDataService.js";
import {
  createCsvFilename,
  fetchAllMatchingRecords,
  recordsToCsv,
} from "../../../script/csv-export.js";
import {
  buildPreviousObservationIndex,
  calculatePriceDelta,
} from "../../../script/price-comparison.js";
import {
  attachImageFallback,
  CROP_IMAGE_FALLBACK,
} from "../../../script/crop-image-fallback.js";

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

  class FakeImage extends EventTarget {
    dataset: Record<string, string> = {};
    src = "";
    hidden = false;
  }
  const cropImage = new FakeImage();
  cropImage.src = "/Images/Vegetables/vegetables/tomato.webp";
  attachImageFallback(cropImage);
  check(
    cropImage.src === "/Images/Vegetables/vegetables/tomato.webp",
    "working crop image sources are preserved",
  );
  cropImage.dispatchEvent(new Event("error"));
  check(cropImage.src === CROP_IMAGE_FALLBACK, "broken crop images use the shared fallback");
  cropImage.dispatchEvent(new Event("error"));
  check(cropImage.hidden, "a broken fallback image is hidden instead of showing a broken icon");

  check(normalizeArrivalDate("13/11/2026") === "2026-11-13", "DD/MM/YYYY dates are normalized");
  check(normalizeArrivalDate("2026-11-13") === "2026-11-13", "ISO dates are preserved");
  check(normalizeArrivalDate("2026-11-13T23:30:00+05:30") === "2026-11-13", "timezone-offset ISO timestamps keep the local calendar day");
  check(normalizeArrivalDate("31/02/2026") === null, "impossible dates are rejected");
  check(parsePrice("1,234.50") === 1234.5, "formatted numeric prices are parsed");
  check(parsePrice("") === null && parsePrice("-1") === null, "missing and negative prices are not fabricated");
  check(parseReportedTotal("1,003") === 1003 && parseReportedTotal("bad") === null, "upstream totals are validated");
  check(
    parseUpstreamUpdatedAt(1_794_600_047) === "2026-11-13T20:00:47.000Z" &&
      parseUpstreamUpdatedAt("not-a-date") === null,
    "upstream dataset update metadata is normalized without inventing timestamps",
  );
  check(!isFutureArrivalDate("2026-11-14", new Date("2026-11-14T12:00:00Z")), "today in India is selectable");
  check(isFutureArrivalDate("2026-11-15", new Date("2026-11-14T12:00:00Z")), "future arrival dates are rejected");
  check(normalizeCommoditySearch("अंगू") === "Grapes", "partial Hindi crop search maps to the source commodity");

  const mapped = mapUpstreamRecord({ ...upstreamRecord, Min_Price: null, Max_Price: "", Modal_Price: null });
  check(mapped?.arrivalDate === "2026-11-13", "OGD arrival dates are mapped exactly");
  check(mapped?.minPrice === null && mapped?.maxPrice === null && mapped?.modalPrice === null, "missing source prices remain null");
  check(mapped?.sourceUnit === "Not provided by source", "missing upstream unit is not fabricated as Rs/Quintal");
  check(
    mapUpstreamRecord({ ...upstreamRecord, Unit: "Rs/Number" })?.sourceUnit === "Rs/Number",
    "an explicit upstream price unit is preserved",
  );
  check(mapUpstreamRecord({ Commodity: "Apple" }) === null, "incomplete source records are rejected");

  let filtersUrl: URL | undefined;
  const filtered = await fetchLivePrices({
    state: "Maharashtra",
    district: "Pune",
    market: "Pune Market",
    commodity: "Apple",
    limit: 5,
    sort: "date_desc",
  }, async (input) => {
    filtersUrl = new URL(String(input));
    return responseFor([upstreamRecord], input);
  });
  check(filtersUrl?.searchParams.get("filters[state.keyword]") === "Maharashtra", "state filter uses the OGD field id");
  check(filtersUrl?.searchParams.get("filters[district]") === "Pune", "district filter uses the published OGD field id");
  check(filtersUrl?.searchParams.get("filters[market]") === "Pune Market", "market filter uses the published OGD field id");
  check(filtersUrl?.searchParams.get("filters[commodity]") === "Apple", "commodity filter uses the published OGD field id");
  check(!filtersUrl?.searchParams.has("filters[arrival_date]"), "unsupported arrival-date filter is never sent to OGD");
  check(!JSON.stringify(filtered).includes("deterministic-test-key"), "government credentials never enter responses");
  check(filtered.meta.hasNext === false && filtered.meta.upstreamHasNext === false, "pagination metadata separates available pages from upstream coverage");

  const verifiedAndhraMarkets = [
    {
      market: "Chintapally APMC",
      commodity: "Gur(Jaggery)",
      variety: "Other",
      grade: "FAQ",
      price: 5_110,
    },
    {
      market: "Araku Valley APMC",
      commodity: "Turmeric",
      variety: "Finger",
      grade: "Grade Range-1",
      price: 17_920,
    },
    {
      market: "Paderu APMC",
      commodity: "Groundnut",
      variety: "Local",
      grade: "Grade Range-2",
      price: 7_300,
    },
  ];
  for (const observation of verifiedAndhraMarkets) {
    let requestUrl: URL | undefined;
    const result = await fetchLivePrices({
      state: "Andhra Pradesh",
      district: "Alluri Sitharama Raju",
      market: observation.market,
      limit: 100,
      offset: 0,
    }, async (input) => {
      requestUrl = new URL(String(input));
      return new Response(JSON.stringify({
        title: "Current Daily Price of Various Commodities from Various Markets (Mandi)",
        updated: 1_794_600_047,
        total: "1",
        limit: "100",
        offset: "0",
        records: [{
          state: "Andhra Pradesh",
          district: "Alluri Sitharama Raju",
          market: observation.market,
          commodity: observation.commodity,
          variety: observation.variety,
          grade: observation.grade,
          arrival_date: "13/11/2026",
          min_price: observation.price,
          max_price: observation.price,
          modal_price: observation.price,
        }],
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    const record = result.records[0];
    check(
      requestUrl?.searchParams.get("filters[state.keyword]") === "Andhra Pradesh" &&
        requestUrl.searchParams.get("filters[district]") === "Alluri Sitharama Raju" &&
        requestUrl.searchParams.get("filters[market]") === observation.market,
      `${observation.market} regression preserves exact government location filters`,
    );
    check(
      result.meta.total === 1 &&
        result.meta.nextOffset === 1 &&
        !result.meta.upstreamHasNext &&
        result.records.length === 1 &&
        record?.market === observation.market &&
        record.commodity === observation.commodity &&
        record.variety === observation.variety &&
        record.grade === observation.grade &&
        record.arrival_date === "2026-11-13" &&
        record.modal_price === observation.price,
      `${observation.market} upstream observation is retained with date, variety, grade, and source price`,
    );
    check(
      result.meta.upstreamUpdatedAt === "2026-11-13T20:00:47.000Z" &&
        result.meta.fetchedAt !== result.meta.upstreamUpdatedAt,
      `${observation.market} dataset update and API fetch timestamps remain distinct`,
    );
  }

  const rawPage = [
    { ...upstreamRecord, id: "duplicate", Arrival_Date: "12/11/2026" },
    { ...upstreamRecord, id: "duplicate", Arrival_Date: "12/11/2026" },
    { ...upstreamRecord, id: "newer", Commodity: "Mango", Arrival_Date: "13/11/2026", Modal_Price: null },
  ];
  const page = await fetchLivePrices({ limit: 3, sort: "date_desc" }, async (input) => responseFor(rawPage, input));
  check(page.records.length === 2 && page.meta.nextOffset === 3, "duplicate source records are removed without corrupting pagination");
  check(page.records[0]?.arrival_date === "2026-11-13", "date ordering is applied to the displayed live page");
  check(page.records.some((record) => record.modal_price === null), "partial price records remain available with null values");

  let priceSortUrl: URL | undefined;
  const priceSorted = await fetchLivePrices({ limit: 2, sort: "modal_price_asc" }, async (input) => {
    priceSortUrl = new URL(String(input));
    return responseFor([
      { ...upstreamRecord, id: "higher-price", Modal_Price: "2,100" },
      { ...upstreamRecord, id: "lower-price", Modal_Price: "1,100" },
    ], input);
  });
  check(
    !priceSortUrl?.searchParams.has("sort[Modal_Price]") &&
      priceSorted.records[0]?.modal_price === 1_100 &&
      priceSorted.records[1]?.modal_price === 2_100,
    "modal-price sorting is applied within the page without requesting unsupported OGD sorting",
  );

  try {
    await fetchLivePrices({ limit: 1 }, async () =>
      new Response(JSON.stringify({
        error: {
          root_cause: [{
            reason: "No mapping found for [Modal_Price] in index [private_upstream_index]",
          }],
        },
      }), { status: 200, headers: { "Content-Type": "application/json" } }),
    );
    check(false, "malformed upstream payload fails safely");
  } catch (error) {
    check(
      error instanceof GovernmentApiError &&
        error.httpStatus === 502 &&
        !error.message.includes("private_upstream_index") &&
        !error.message.includes("No mapping found"),
      "upstream query internals are not exposed in malformed-response errors",
    );
  }

  let retries = 0;
  const retried = await fetchLivePrices({ limit: 1 }, async (input) => {
    retries += 1;
    if (retries < 3) return new Response("slow down", { status: 429 });
    return responseFor([upstreamRecord], input);
  });
  check(retries === 3 && retried.records.length === 1, "transient upstream rate limits use bounded retries");
  let exhaustedRetries = 0;
  try {
    await fetchLivePrices({ limit: 1 }, async () => {
      exhaustedRetries += 1;
      return new Response("slow down", { status: 429 });
    });
    check(false, "exhausted upstream retries fail explicitly");
  } catch (error) {
    check(
      exhaustedRetries === 3 &&
        error instanceof GovernmentApiError &&
        error.httpStatus === 503,
      "retry exhaustion returns a safe upstream rate-limit error",
    );
  }

  // Fetch resolves as soon as headers arrive. The same deadline must also
  // cover a response body that stalls while JSON is being read.
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  let bodyTimeoutAttempts = 0;
  let bodyTimeoutGuard: ReturnType<typeof setTimeout> | undefined;
  globalThis.setTimeout = ((...args: any[]) => {
    const [handler, timeoutMs, ...rest] = args;
    if (timeoutMs === 6_000) {
      bodyTimeoutAttempts += 1;
      return originalSetTimeout(handler, 0, ...rest);
    }
    return originalSetTimeout(handler, timeoutMs, ...rest);
  }) as typeof globalThis.setTimeout;
  try {
    const stalledBodyRequest = fetchLivePrices({ limit: 1 }, async (_input, init) => {
      const signal = init?.signal as AbortSignal;
      return {
        ok: true,
        status: 200,
        headers: new Headers({ "Content-Type": "application/json" }),
        body: null,
        json: () => new Promise((_resolve, reject) => {
          if (signal.aborted) {
            reject(new DOMException("The operation was aborted.", "AbortError"));
            return;
          }
          signal.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          }, { once: true });
        }),
      } as Response;
    });
    const guard = new Promise<never>((_resolve, reject) => {
      bodyTimeoutGuard = originalSetTimeout(
        () => reject(new Error("Response body timeout was not enforced.")),
        1_500,
      );
    });
    try {
      await Promise.race([stalledBodyRequest, guard]);
      check(false, "upstream request deadline covers stalled response-body parsing");
    } catch (error) {
      check(
        error instanceof GovernmentApiError &&
          error.httpStatus === 504 &&
          bodyTimeoutAttempts === 3,
        "upstream request deadline covers stalled response-body parsing and bounded retries",
      );
    }
  } finally {
    if (bodyTimeoutGuard) originalClearTimeout(bodyTimeoutGuard);
    globalThis.setTimeout = originalSetTimeout;
  }

  let searchedUrl: URL | undefined;
  const commodities = await searchLiveCommodities("अंगूर", 10, async (input) => {
    searchedUrl = new URL(String(input));
    return responseFor([{ ...upstreamRecord, id: "grapes", Commodity: "Grapes" }], input);
  });
  check(searchedUrl?.searchParams.get("q") === "Grapes", "Hindi commodity search is translated before the upstream request");
  check(commodities.length === 1 && commodities[0] === "Grapes", "commodity suggestions are limited to upstream records");

  let commoditySearchPages = 0;
  const paginatedCommodities = await searchLiveCommodities("a", 10, async (input) => {
    commoditySearchPages += 1;
    const offset = Number(new URL(String(input)).searchParams.get("offset"));
    const rows = offset === 0
      ? Array.from({ length: 100 }, (_, index) => ({
          ...upstreamRecord, id: `apple-${index}`, Commodity: "Apple",
        }))
      : [{ ...upstreamRecord, id: "mango-last-page", Commodity: "Mango" }];
    return responseFor(rows, input, "101");
  });
  check(
    commoditySearchPages === 2 &&
      paginatedCommodities.includes("Apple") &&
      paginatedCommodities.includes("Mango"),
    "commodity suggestions paginate past repeated first-page matches",
  );

  const discoveryRecords = Array.from({ length: 1_205 }, (_, index) => ({
    ...upstreamRecord,
    id: `discovery-${index}`,
    State: "Discovery State",
    District: `District ${index}`,
    Market: `Market ${index}`,
  }));
  discoveryRecords.push({ ...discoveryRecords[10], id: discoveryRecords[10]!.id });
  let discoveryRequests = 0;
  const discovered = await fetchLiveFilters({ state: "Discovery State" }, async (input) => {
    discoveryRequests += 1;
    const url = new URL(String(input));
    const offset = Number(url.searchParams.get("offset"));
    const limit = Number(url.searchParams.get("limit"));
    return responseFor(
      discoveryRecords.slice(offset, offset + limit),
      input,
      String(discoveryRecords.length),
    );
  });
  check(discoveryRequests === 13, "filter discovery paginates beyond 1,000 upstream records");
  check(discovered.markets.length === 1_205, "filter discovery deduplicates values across pages");
  check(
    discovered.coverage.status === "complete" &&
      discovered.coverage.total === 1_206 &&
      discovered.coverage.maxOffset === 1_000_000,
    "filter discovery reports complete coverage and its supported offset boundary",
  );
  check(
    discovered.cache.status === "temporary-cache" &&
      discovered.cache.storedAt !== null &&
      discovered.cache.ttlMs === 60_000,
    "newly discovered filter metadata reports its active temporary cache",
  );
  let cachedDiscoveryRequests = 0;
  const cachedDiscovery = await fetchLiveFilters({ state: "Discovery State" }, async (input) => {
    cachedDiscoveryRequests += 1;
    return responseFor([], input, "0");
  });
  check(
    cachedDiscoveryRequests === 0 &&
      cachedDiscovery.cache.status === "temporary-cache" &&
      cachedDiscovery.cache.storedAt === discovered.cache.storedAt,
    "cached filter metadata is reused and reports its stored timestamp",
  );

  const largeDiscoveryTotal = 10_001;
  let largeDiscoveryRequests = 0;
  const largeDiscovery = await fetchLiveFilters({ state: "Beyond Prior Page Bound" }, async (input) => {
    largeDiscoveryRequests += 1;
    const url = new URL(String(input));
    const offset = Number(url.searchParams.get("offset"));
    const limit = Number(url.searchParams.get("limit"));
    const count = Math.min(limit, largeDiscoveryTotal - offset);
    const records = Array.from({ length: count }, (_, index) => {
      const recordIndex = offset + index;
      return {
        ...upstreamRecord,
        id: `large-discovery-${recordIndex}`,
        State: "Beyond Prior Page Bound",
        District: `District ${recordIndex}`,
        Market: `Market ${recordIndex}`,
      };
    });
    return responseFor(records, input, String(largeDiscoveryTotal));
  });
  check(
    largeDiscoveryRequests === 101 &&
      largeDiscovery.coverage.pagesScanned === 101 &&
      largeDiscovery.coverage.recordsScanned === largeDiscoveryTotal,
    "filter discovery continues past 100 pages without an arbitrary short stop",
  );
  check(
    largeDiscovery.coverage.status === "complete" &&
      largeDiscovery.coverage.total === largeDiscoveryTotal &&
      largeDiscovery.markets.length === largeDiscoveryTotal,
    "large filter discovery completes only after all upstream-reported records are scanned",
  );

  let missingTotalRequests = 0;
  const missingTotals = await fetchLiveFilters({ state: "No Total State" }, async (input) => {
    missingTotalRequests += 1;
    const url = new URL(String(input));
    const offset = Number(url.searchParams.get("offset"));
    const rows = offset === 0
      ? Array.from({ length: 100 }, (_, index) => ({
          ...upstreamRecord, id: `missing-total-${index}`, State: "No Total State",
          District: "District", Market: `Market ${index}`,
        }))
      : [{
          ...upstreamRecord, id: "missing-total-last", State: "No Total State",
          District: "District", Market: "Last Market",
        }];
    const payload = JSON.parse(await responseFor(rows, input).text()) as Record<string, unknown>;
    delete payload.total;
    return new Response(JSON.stringify(payload), { status: 200 });
  });
  check(missingTotalRequests === 2, "filter discovery reads through a short final page when total is missing");
  check(missingTotals.coverage.status === "complete", "short final page marks unknown-total discovery complete");

  try {
    await fetchLiveFilters({ state: "No Progress State" }, async (input) =>
      responseFor([], input, "1"),
    );
    check(false, "filter discovery rejects a non-advancing upstream page");
  } catch (error) {
    check(
      error instanceof GovernmentApiError && error.httpStatus === 502,
      "filter discovery fails explicitly when upstream pagination stops advancing",
    );
  }

  try {
    await fetchLiveFilters({ state: "Changing Total State" }, async (input) => {
      const offset = Number(new URL(String(input)).searchParams.get("offset"));
      return responseFor(
        [{ ...upstreamRecord, id: `changing-${offset}`, State: "Changing Total State" }],
        input,
        offset === 0 ? "2" : "3",
      );
    });
    check(false, "inconsistent totals during discovery fail explicitly");
  } catch (error) {
    check(
      error instanceof GovernmentApiError && error.httpStatus === 502,
      "inconsistent upstream totals are rejected",
    );
  }

  const boundary = await fetchLivePrices(
    { limit: 100, offset: 1_000_000 },
    async (input) => responseFor(
      Array.from({ length: 100 }, (_, index) => ({
        ...upstreamRecord, id: `boundary-${index}`,
      })),
      input,
      "1000200",
    ),
  );
  check(
    boundary.meta.truncated && boundary.meta.upstreamHasNext && !boundary.meta.hasNext,
    "pagination boundary is reported instead of claiming complete coverage",
  );

  const csvRecord = {
    ...page.records[0]!,
    state: 'State, "North"',
    market: "Market\nSecond line",
    min_price: null,
    max_price: -1,
    modal_price: 0,
  };
  const csv = recordsToCsv([csvRecord]);
  check(csv.startsWith("\uFEFF") && csv.includes('"State, ""North"""'), "CSV includes a UTF-8 BOM and escapes quotes and commas");
  check(csv.split("\r\n")[0]?.includes('"Variety","Grade","Arrival date"') && csv.includes('"FAQ"'), "CSV includes source variety and grade fields");
  check(csv.includes('"Market\nSecond line"'), "CSV preserves escaped multiline fields");
  check(csv.includes(',"","","0",'), "CSV leaves missing or invalid prices blank and preserves a valid zero");
  check(recordsToCsv([{ ...csvRecord, market: "=HYPERLINK(\"bad\")" }]).includes(`"'=HYPERLINK(""bad"")"`), "CSV neutralizes spreadsheet formula injection");
  check(createCsvFilename("Pune Market", "2026-11-14") === "Pune-Market-prices-2026-11-14.csv", "CSV filename includes market and export date");

  const exportedParams: Record<string, string>[] = [];
  const emptyExport = await fetchAllMatchingRecords({
    params: { state: "Maharashtra", district: "Pune", market: "Pune Market" },
    fetchPage: async () => ({
      data: [],
      meta: {
        offset: 0,
        limit: 100,
        nextOffset: 0,
        total: 0,
        hasNext: false,
        upstreamHasNext: false,
        truncated: false,
      },
    }),
  });
  check(
    emptyExport.records.length === 0 && emptyExport.pages === 1,
    "CSV export accepts a valid empty first page",
  );

  const exported = await fetchAllMatchingRecords({
    params: { state: "Maharashtra", district: "Pune", market: "Pune Market", search: "Apple", date: "2026-11-13" },
    fetchPage: async (params: Record<string, string>) => {
      exportedParams.push(params);
      const offset = Number(params.offset);
      const data = offset === 0
        ? [{ ...page.records[0]!, id: "csv-1" }, { ...page.records[0]!, id: "csv-1" }]
        : [{ ...page.records[0]!, id: "csv-2" }];
      return {
        data,
        meta: {
          offset,
          limit: 100,
          nextOffset: offset + data.length,
          total: 3,
          hasNext: offset === 0,
          upstreamHasNext: offset === 0,
          truncated: false,
        },
      };
    },
  });
  check(exported.records.length === 2 && exported.pages === 2, "CSV export fetches all pages and deduplicates repeated records");
  check(
    exportedParams.every((params) =>
      params.state === "Maharashtra" &&
      params.district === "Pune" &&
      params.market === "Pune Market" &&
      params.search === "Apple" &&
      params.date === "2026-11-13",
    ),
    "CSV export preserves the selected location, crop, and date filters on every page",
  );

  const nationalRecords = Array.from({ length: 5_001 }, (_, index) => ({
    ...page.records[0]!,
    id: `national-${index}`,
  }));
  const nationalExport = await fetchAllMatchingRecords({
    params: {},
    fetchPage: async (params: Record<string, string>) => {
      const offset = Number(params.offset);
      const data = nationalRecords.slice(offset, offset + 100);
      const nextOffset = offset + data.length;
      return {
        data,
        meta: {
          offset,
          limit: 100,
          nextOffset,
          total: nationalRecords.length,
          hasNext: nextOffset < nationalRecords.length,
          upstreamHasNext: nextOffset < nationalRecords.length,
          truncated: false,
        },
      };
    },
  });
  check(
    nationalExport.records.length === 5_001 && nationalExport.pages === 51,
    "CSV export supports national result sets beyond the former 5,000-record cap",
  );

  for (const [name, fetchPage] of [
    ["failed upstream request", async () => { throw new Error("upstream unavailable"); }],
    ["missing upstream page", async () => ({ data: [], meta: { offset: 0, limit: 100, total: 0, hasNext: false } })],
  ] as const) {
    try {
      await fetchAllMatchingRecords({ params: {}, fetchPage });
      check(false, `CSV export rejects ${name}`);
    } catch {
      check(true, `CSV export rejects ${name}`);
    }
  }

  const cancelledExport = new AbortController();
  cancelledExport.abort();
  try {
    await fetchAllMatchingRecords({
      params: {},
      signal: cancelledExport.signal,
      fetchPage: async () => { throw new Error("must not request a page"); },
    });
    check(false, "CSV export honors cancellation before a page request");
  } catch {
    check(true, "CSV export honors cancellation before a page request");
  }

  try {
    await fetchAllMatchingRecords({
      params: {},
      maxRecords: 1,
      fetchPage: async () => ({
        data: [{ ...page.records[0]!, id: "cap-1" }, { ...page.records[0]!, id: "cap-2" }],
        meta: {
          offset: 0, limit: 100, nextOffset: 2, total: 2, hasNext: false,
          upstreamHasNext: false, truncated: false,
        },
      }),
    });
    check(false, "CSV export rejects records over its memory bound");
  } catch {
    check(true, "CSV export rejects records over its memory bound");
  }

  const previous = {
    ...upstreamRecord,
    state: "Maharashtra",
    district: "Pune",
    market: "Pune Market",
    commodity: "Apple",
    variety: "Red",
    grade: "FAQ",
    arrival_date: "2026-11-10",
    modal_price: 1_000,
    source_unit: "Rs/Quintal",
  };
  const latest = { ...previous, id: "latest", arrival_date: "2026-11-14", modal_price: 1_200 };
  const mismatches = [
    { ...previous, id: "other-market", market: "Other Market", arrival_date: "2026-11-13" },
    { ...previous, id: "other-crop", commodity: "Mango", arrival_date: "2026-11-13" },
    { ...previous, id: "other-variety", variety: "Green", arrival_date: "2026-11-13" },
    { ...previous, id: "other-grade", grade: "Grade Range-1", arrival_date: "2026-11-13" },
    { ...previous, id: "other-unit", source_unit: "Rs/Kg", arrival_date: "2026-11-13" },
  ];
  const findPrevious = buildPreviousObservationIndex([previous, latest, ...mismatches]);
  check(findPrevious(latest) === previous, "comparison uses the most recent strictly earlier matching observation");
  check(findPrevious(previous) === null, "comparison does not use a record with no earlier observation");
  check(
    buildPreviousObservationIndex([
      latest,
      { ...latest, id: "same-date", modal_price: 1_100 },
      { ...latest, id: "future", arrival_date: "2026-11-15" },
    ])(latest) === null,
    "same-date and future observations are not used as prior records",
  );
  check(
    calculatePriceDelta(1_200, 1_000)?.difference === 200 &&
      calculatePriceDelta(1_200, 1_000)?.percentage === 20,
    "valid price changes and percentage calculations are accurate",
  );
  check(
    calculatePriceDelta(0, 0)?.percentage === null &&
      calculatePriceDelta("bad", 10) === null &&
      calculatePriceDelta(-1, 10) === null &&
      calculatePriceDelta(null, 10) === null,
    "zero, malformed, negative, and missing comparison prices are handled safely",
  );
  const missingPreviousPrice = { ...previous, modal_price: null };
  const partialComparison = buildPreviousObservationIndex([
    missingPreviousPrice,
    latest,
  ]);
  check(
    partialComparison(latest) === missingPreviousPrice &&
      calculatePriceDelta(latest.modal_price, partialComparison(latest)?.modal_price) === null,
    "partial source records do not produce a price difference",
  );
  check(
    buildPreviousObservationIndex([
      previous,
      { ...previous, id: "duplicate-prior-date" },
      latest,
    ])(latest) === null,
    "ambiguous same-date observations do not produce a misleading comparison",
  );

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
