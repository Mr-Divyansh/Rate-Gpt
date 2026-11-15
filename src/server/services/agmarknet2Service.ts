import {
  GovernmentApiError,
  isFutureArrivalDate,
  normalizeArrivalDate,
  parsePrice,
  normalizeCommoditySearch,
  type LiveQueryOptions,
  type MandiRecord,
} from "./mandiDataService.js";

const DEFAULT_BASE_URL = "https://api.agmarknet.gov.in/v1";
const REQUEST_TIMEOUT_MS = 12_000;
const CATALOG_TTL_MS = 15 * 60 * 1_000;
const MAX_PAGE_SIZE = 100;
const MAX_OFFSET = 1_000_000;
const SOURCE_NAME = "Government of India AGMARKNET 2.0";
const FRESHNESS_STATUS =
  "Government-published daily market data; not guaranteed real-time trading prices.";

type AgmarknetState = { state_id: number; state_name: string };
type AgmarknetDistrict = { id: number; state_id: number; district_name: string };
type AgmarknetMarket = {
  id: number;
  state_id: number;
  district_id: number;
  mkt_name: string;
};
type AgmarknetCommodity = { cmdt_id: number; cmdt_name: string; cmdt_group_id?: number };
type AgmarknetCatalog = {
  state_data: AgmarknetState[];
  district_data: AgmarknetDistrict[];
  market_data: AgmarknetMarket[];
  cmdt_data: AgmarknetCommodity[];
};

type FilterOptions = {
  source: string;
  states: string[];
  districts: string[];
  markets: string[];
  commodities: string[];
  coverage: {
    status: "catalogue" | "complete";
    pagesScanned: number;
    recordsScanned: number;
    total: number | null;
    maxOffset: number;
    message: string;
  };
  cache: {
    status: "temporary-cache";
    ttlMs: number;
    storedAt: string;
    appliesTo: string;
  };
};

let catalogCache: {
  value: AgmarknetCatalog;
  storedAt: string;
  expiresAt: number;
} | null = null;

const CACHE_SCOPE =
  "AGMARKNET state, district, mandi and commodity directory only. Price records are fetched live and are not cached.";

export function resetAgmarknetCatalogCache(): void {
  catalogCache = null;
}

function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase("en-IN");
}

function indiaTodayIsoDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}


function apiBaseUrl(): string {
  const raw = process.env.AGMARKNET_API_BASE_URL || DEFAULT_BASE_URL;
  try {
    const url = new URL(raw);
    const localTestEndpoint =
      process.env.NODE_ENV === "test" &&
      url.protocol === "http:" &&
      (url.hostname === "127.0.0.1" || url.hostname === "localhost");
    if ((!localTestEndpoint && url.protocol !== "https:") || url.username || url.password || url.search || url.hash) {
      throw new Error("invalid");
    }
    return url.toString().replace(/\/+$/, "");
  } catch {
    throw new GovernmentApiError("AGMARKNET 2.0 endpoint configuration is invalid.", 503);
  }
}

async function requestJson(
  path: string,
  init: RequestInit = {},
  fetcher: typeof fetch = fetch,
): Promise<Record<string, unknown>> {
  const headers = new Headers({
    Accept: "application/json",
    Origin: "https://agmarknet.gov.in",
    Referer: "https://agmarknet.gov.in/",
    "User-Agent": "RateGPT/1.0 (https://rate-gpt.vercel.app; public mandi price discovery)",
  });
  new Headers(init.headers).forEach((value, key) => headers.set(key, value));

  let response: Response;
  try {
    response = await fetcher(`${apiBaseUrl()}${path}`, {
      ...init,
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof GovernmentApiError) throw error;
    throw new GovernmentApiError("AGMARKNET 2.0 could not be reached.", 503);
  }

  if (!response.ok) {
    const status = response.status === 429 || response.status >= 500 ? 503 : 502;
    throw new GovernmentApiError(
      `AGMARKNET 2.0 rejected the request (HTTP ${response.status}).`,
      status,
      response.status,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new GovernmentApiError("AGMARKNET 2.0 returned invalid JSON.", 502);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new GovernmentApiError("AGMARKNET 2.0 returned an invalid response.", 502);
  }
  return payload as Record<string, unknown>;
}

function readArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

async function getCatalog(fetcher: typeof fetch = fetch): Promise<AgmarknetCatalog> {
  if (catalogCache && catalogCache.expiresAt > Date.now()) return catalogCache.value;
  const payload = await requestJson("/daily-price-arrival/filters", {}, fetcher);
  const data = payload.data && typeof payload.data === "object"
    ? payload.data as Record<string, unknown>
    : null;
  if ((payload.status !== true && payload.success !== true) || !data) {
    throw new GovernmentApiError("AGMARKNET 2.0 location catalogue is unavailable.", 502);
  }

  const states = readArray<AgmarknetState>(data.state_data);
  const districts = readArray<AgmarknetDistrict>(data.district_data);
  const markets = readArray<AgmarknetMarket>(data.market_data);
  const commodities = readArray<AgmarknetCommodity>(data.cmdt_data);
  if (!states.length || !districts.length || !markets.length || !commodities.length) {
    throw new GovernmentApiError("AGMARKNET 2.0 returned an incomplete location catalogue.", 502);
  }

  const value: AgmarknetCatalog = {
    state_data: states.filter((row) => Number.isInteger(row.state_id) && row.state_id > 0 && row.state_id < 100_000 && typeof row.state_name === "string"),
    district_data: districts.filter((row) => Number.isInteger(row.id) && Number.isInteger(row.state_id) && typeof row.district_name === "string"),
    market_data: markets.filter((row) => Number.isInteger(row.id) && Number.isInteger(row.state_id) && Number.isInteger(row.district_id) && typeof row.mkt_name === "string"),
    cmdt_data: commodities.filter((row) => Number.isInteger(row.cmdt_id) && row.cmdt_id > 0 && row.cmdt_id < 100_000 && typeof row.cmdt_name === "string"),
  };
  if (!value.state_data.length || !value.market_data.length || !value.cmdt_data.length) {
    throw new GovernmentApiError("AGMARKNET 2.0 returned no usable catalogue entries.", 502);
  }

  catalogCache = {
    value,
    storedAt: new Date().toISOString(),
    expiresAt: Date.now() + CATALOG_TTL_MS,
  };
  return value;
}

export async function fetchAgmarknet2Filters(
  options: { state?: string; district?: string; market?: string } = {},
  fetcher: typeof fetch = fetch,
): Promise<FilterOptions> {
  const catalog = await getCatalog(fetcher);
  const stateRow = options.state
    ? catalog.state_data.find((row) => normalizeName(row.state_name) === normalizeName(options.state!))
    : undefined;
  if (options.state && !stateRow) {
    return {
      source: SOURCE_NAME,
      states: catalog.state_data.map((row) => row.state_name).sort(),
      districts: [],
      markets: [],
      commodities: catalog.cmdt_data.map((row) => row.cmdt_name).sort(),
      coverage: {
        status: "complete",
        pagesScanned: 1,
        recordsScanned: 0,
        total: 0,
        maxOffset: MAX_OFFSET,
        message: "The selected state is not present in the current AGMARKNET 2.0 administrative catalogue.",
      },
      cache: {
        status: "temporary-cache",
        ttlMs: CATALOG_TTL_MS,
        storedAt: catalogCache!.storedAt,
        appliesTo: CACHE_SCOPE,
      },
    };
  }

  const districts = stateRow
    ? catalog.district_data.filter((row) => row.state_id === stateRow.state_id)
    : [];
  const districtRow = options.district
    ? districts.find((row) => normalizeName(row.district_name) === normalizeName(options.district!))
    : undefined;
  const markets = stateRow
    ? catalog.market_data.filter((row) =>
        row.state_id === stateRow.state_id &&
        (!options.district || row.district_id === districtRow?.id) &&
        (!options.market || normalizeName(row.mkt_name) === normalizeName(options.market)),
      )
    : [];
  const districtNames = districts.map((row) => row.district_name).sort();
  const marketNames = markets.map((row) => row.mkt_name).sort();
  const storedAt = catalogCache!.storedAt;

  return {
    source: SOURCE_NAME,
    states: catalog.state_data.map((row) => row.state_name).sort(),
    districts: districtNames,
    markets: marketNames,
    commodities: catalog.cmdt_data.map((row) => row.cmdt_name).sort(),
    coverage: {
      status: stateRow ? "complete" : "catalogue",
      pagesScanned: 1,
      recordsScanned: stateRow ? markets.length : 0,
      total: stateRow ? markets.length : null,
      maxOffset: MAX_OFFSET,
      message: stateRow
        ? "Complete AGMARKNET 2.0 administrative mandi directory for this state. Price availability depends on each market's daily report."
        : "State and union-territory names are an administrative selector; mandi availability is determined by the AGMARKNET 2.0 directory and daily reports.",
    },
    cache: {
      status: "temporary-cache",
      ttlMs: CATALOG_TTL_MS,
      storedAt,
      appliesTo: CACHE_SCOPE,
    },
  };
}

function recordNumber(value: unknown): number | null {
  return parsePrice(value);
}

type MonthlyCommodityReport = {
  success?: boolean;
  message?: string;
  columns?: Array<{ key?: string; title?: string }>;
  markets?: Array<{
    marketName?: string;
    dates?: Array<{
      arrivalDate?: string;
      data?: Array<Record<string, unknown>>;
    }>;
  }>;
  data?: MonthlyCommodityReport;
};

type CommodityLoadResult = {
  records: MandiRecord[];
  partial: boolean;
  failedMonths: string[];
  unmatchedMarkets: string[];
};

function reportFromPayload(payload: Record<string, unknown>): MonthlyCommodityReport {
  if (Array.isArray(payload.markets) || Array.isArray(payload.columns)) {
    return payload as MonthlyCommodityReport;
  }
  if (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) {
    return payload.data as MonthlyCommodityReport;
  }
  return payload as MonthlyCommodityReport;
}

function sourceUnitFromColumns(columns: MonthlyCommodityReport["columns"]): string {
  const modalColumn = columns?.find((column) => column.key === "modalPrice");
  const priceColumn = modalColumn ?? columns?.find((column) => /price/i.test(column.key ?? ""));
  const title = priceColumn?.title ?? "";
  const unit = title.match(/\\(([^)]+)\\)/)?.[1]?.trim();
  return unit || "Not provided by source";
}

function canonicalMarketName(value: string): string {
  return normalizeName(value).replace(/[^a-z0-9]/g, "").replace(/apmc$/, "");
}

function monthParts(isoDate: string): { year: number; month: number; key: string } {
  const [year, month] = isoDate.split("-").map(Number);
  return { year, month, key: `${year}-${String(month).padStart(2, "0")}` };
}

function previousMonth(year: number, month: number): { year: number; month: number; key: string } {
  const date = new Date(Date.UTC(year, month - 2, 1));
  const nextYear = date.getUTCFullYear();
  const nextMonth = date.getUTCMonth() + 1;
  return { year: nextYear, month: nextMonth, key: `${nextYear}-${String(nextMonth).padStart(2, "0")}` };
}

function latestObservationRecords(records: MandiRecord[]): MandiRecord[] {
  const latest = new Map<string, MandiRecord>();
  for (const record of records) {
    const key = [
      record.state, record.district, record.market, record.commodity,
      record.variety ?? "", record.source_unit,
    ].join("|").toLocaleLowerCase();
    const existing = latest.get(key);
    if (!existing || record.arrival_date > existing.arrival_date) latest.set(key, record);
  }
  return [...latest.values()];
}

async function loadCommodityRecords(
  options: LiveQueryOptions,
  fetcher: typeof fetch,
): Promise<CommodityLoadResult> {
  if (!options.state) {
    throw new GovernmentApiError("A state is required for the AGMARKNET commodity report.", 400);
  }
  if (!options.commodity) {
    throw new GovernmentApiError("Select a government-listed commodity to load its market report.", 400);
  }
  const requestedDate = options.arrivalDate ? normalizeArrivalDate(options.arrivalDate) : null;
  if (options.arrivalDate && !requestedDate) {
    throw new GovernmentApiError("Arrival date is invalid.", 400);
  }
  if (requestedDate && isFutureArrivalDate(requestedDate)) {
    throw new GovernmentApiError("Future arrival dates are not available. Choose today or an earlier date.", 400);
  }

  const catalog = await getCatalog(fetcher);
  const stateRow = catalog.state_data.find((row) => normalizeName(row.state_name) === normalizeName(options.state!));
  if (!stateRow) throw new GovernmentApiError("The selected state is not available in AGMARKNET 2.0.", 404);
  const commodityRow = catalog.cmdt_data.find((row) => normalizeName(row.cmdt_name) === normalizeName(options.commodity!));
  if (!commodityRow) throw new GovernmentApiError("The selected commodity is not available in the AGMARKNET 2.0 catalogue.", 404);

  const districtById = new Map(catalog.district_data.map((row) => [row.id, row.district_name]));
  const registeredMarkets = catalog.market_data.filter((row) =>
    row.state_id === stateRow.state_id &&
    (!options.district || normalizeName(districtById.get(row.district_id) ?? "") === normalizeName(options.district)) &&
    (!options.market || normalizeName(row.mkt_name) === normalizeName(options.market)),
  );
  if (!registeredMarkets.length) {
    return { records: [], partial: false, failedMonths: [], unmatchedMarkets: [] };
  }

  const anchor = requestedDate ?? indiaTodayIsoDate();
  const currentMonth = monthParts(anchor);
  const months = [currentMonth];
  if (!requestedDate && Number(anchor.slice(8, 10)) <= 10) {
    months.push(previousMonth(currentMonth.year, currentMonth.month));
  }

  const districtForMarket = (marketName: string): string | null => {
    const candidates = registeredMarkets.filter(
      (row) => canonicalMarketName(row.mkt_name) === canonicalMarketName(marketName),
    );
    return candidates.length === 1 ? districtById.get(candidates[0]!.district_id) ?? null : null;
  };

  const settled = await Promise.allSettled(months.map(async (month) => {
    const params = new URLSearchParams({
      year: String(month.year),
      month: String(month.month),
      stateId: String(stateRow.state_id),
      commodityId: String(commodityRow.cmdt_id),
      includeExcel: "false",
    });
    const payload = await requestJson(
      `/prices-and-arrivals/date-wise/specific-commodity?${params.toString()}`,
      {},
      fetcher,
    );
    const report = reportFromPayload(payload);
    if (report.success !== true || !Array.isArray(report.markets)) {
      throw new GovernmentApiError("AGMARKNET 2.0 returned an invalid monthly commodity report.", 502);
    }

    const sourceUnit = sourceUnitFromColumns(report.columns);
    const records: MandiRecord[] = [];
    const unmatchedMarkets: string[] = [];
    for (const market of report.markets) {
      const marketName = typeof market.marketName === "string" ? market.marketName.trim() : "";
      if (!marketName) continue;
      const district = districtForMarket(marketName);
      if (!district) {
        unmatchedMarkets.push(marketName);
        continue;
      }
      for (const day of market.dates ?? []) {
        const arrivalDate = normalizeArrivalDate(day.arrivalDate) ?? "";
        if (!arrivalDate || (requestedDate && arrivalDate !== requestedDate)) continue;
        for (const row of day.data ?? []) {
          const minPrice = parsePrice(row.minimumPrice);
          const maxPrice = parsePrice(row.maximumPrice);
          const modalPrice = parsePrice(row.modalPrice);
          if (minPrice === null && maxPrice === null && modalPrice === null) continue;
          const variety = typeof row.variety === "string" && row.variety.trim() ? row.variety.trim() : null;
          const id = [
            stateRow.state_name, district, marketName, commodityRow.cmdt_name,
            variety ?? "", arrivalDate, sourceUnit,
          ].join("|").toLocaleLowerCase();
          records.push({
            id,
            state: stateRow.state_name,
            district,
            market: marketName,
            commodity: commodityRow.cmdt_name,
            variety,
            grade: null,
            arrival_date: arrivalDate,
            min_price: minPrice,
            max_price: maxPrice,
            modal_price: modalPrice,
            source_unit: sourceUnit,
          });
        }
      }
    }
    return { records, unmatchedMarkets };
  }));

  const successful = settled.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
  const failedMonths = settled.flatMap((result, index) => result.status === "rejected" ? [months[index]!.key] : []);
  if (!successful.length) {
    const first = settled.find((result) => result.status === "rejected");
    throw first && first.status === "rejected"
      ? first.reason
      : new GovernmentApiError("AGMARKNET 2.0 monthly commodity reports are unavailable.", 502);
  }

  const allRecords = successful.flatMap((result) => result.records);
  const filtered = allRecords.filter((record) =>
    (!options.district || normalizeName(record.district) === normalizeName(options.district)) &&
    (!options.market || normalizeName(record.market) === normalizeName(options.market)) &&
    (!options.search || normalizeName(record.commodity).includes(normalizeName(normalizeCommoditySearch(options.search)))),
  );
  const records = requestedDate
    ? [...new Map(filtered.map((record) => [record.id, record])).values()]
    : latestObservationRecords(filtered);
  return {
    records,
    partial: failedMonths.length > 0 || successful.some((result) => result.unmatchedMarkets.length > 0),
    failedMonths,
    unmatchedMarkets: [...new Set(successful.flatMap((result) => result.unmatchedMarkets))],
  };
}

function sortRecords(records: MandiRecord[], sort?: string): void {
  records.sort((left, right) => {
    if (sort === "date_asc") return left.arrival_date.localeCompare(right.arrival_date);
    if (sort === "date_desc" || !sort) return right.arrival_date.localeCompare(left.arrival_date);
    if (sort === "modal_price_asc" || sort === "modal_price_desc") {
      const a = left.modal_price;
      const b = right.modal_price;
      if (a === null && b === null) return 0;
      if (a === null) return 1;
      if (b === null) return -1;
      return sort === "modal_price_asc" ? a - b : b - a;
    }
    if (sort === "market_asc") return left.market.localeCompare(right.market);
    if (sort === "market_desc") return right.market.localeCompare(left.market);
    if (sort === "commodity_asc") return left.commodity.localeCompare(right.commodity);
    if (sort === "commodity_desc") return right.commodity.localeCompare(left.commodity);
    return right.arrival_date.localeCompare(left.arrival_date);
  });
}

function pageCommodityRecords(
  records: MandiRecord[],
  options: LiveQueryOptions,
  details: CommodityLoadResult,
) {
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
    throw new GovernmentApiError("Page size is outside the supported range.", 400);
  }
  if (!Number.isInteger(offset) || offset < 0 || offset > MAX_OFFSET) {
    throw new GovernmentApiError("Page offset is outside the supported range.", 400);
  }
  sortRecords(records, options.sort);
  const page = records.slice(offset, offset + limit);
  const nextOffset = offset + page.length;
  const hasNext = nextOffset < records.length;
  return {
    records: page,
    meta: {
      limit, offset, nextOffset, total: records.length, hasNext,
      upstreamHasNext: hasNext, truncated: false as const,
      source: SOURCE_NAME, fetchedAt: new Date().toISOString(),
      upstreamUpdatedAt: null, cacheStatus: "live" as const,
      freshnessStatus: details.partial
        ? "Some government report months or market-name matches were unavailable; only verified observations are shown."
        : "Latest available government-reported observation for this commodity in the selected calendar month.",
      partial: details.partial,
      failedMonths: details.failedMonths,
      unmatchedMarkets: details.unmatchedMarkets,
    },
  };
}

export async function fetchAgmarknet2Prices(
  options: LiveQueryOptions,
  fetcher: typeof fetch = fetch,
) {
  const details = await loadCommodityRecords(options, fetcher);
  return pageCommodityRecords(details.records, options, details);
}

export async function fetchAgmarknet2PricesForSearch(
  options: LiveQueryOptions,
  fetcher: typeof fetch = fetch,
) {
  const candidates = options.commodity
    ? [options.commodity]
    : await searchAgmarknet2Commodities(options.search ?? "", 5, fetcher);
  if (!candidates.length) {
    return pageCommodityRecords([], options, {
      records: [], partial: false, failedMonths: [], unmatchedMarkets: [],
    });
  }

  const combined = new Map<string, MandiRecord>();
  const failedMonths = new Set<string>();
  const unmatchedMarkets = new Set<string>();
  let partial = false;
  let succeeded = 0;
  let firstError: unknown;

  for (const commodity of candidates) {
    try {
      const details = await loadCommodityRecords({ ...options, commodity }, fetcher);
      succeeded += 1;
      partial ||= details.partial;
      details.failedMonths.forEach((month) => failedMonths.add(month));
      details.unmatchedMarkets.forEach((market) => unmatchedMarkets.add(market));
      details.records.forEach((record) => combined.set(record.id, record));
    } catch (error) {
      firstError ??= error;
      partial = true;
    }
  }
  if (succeeded === 0 && firstError) throw firstError;
  const records = [...combined.values()];
  return pageCommodityRecords(records, options, {
    records,
    partial,
    failedMonths: [...failedMonths],
    unmatchedMarkets: [...unmatchedMarkets],
  });
}

export async function searchAgmarknet2Commodities(
  query: string,
  limit = 10,
  fetcher: typeof fetch = fetch,
): Promise<string[]> {
  const catalog = await getCatalog(fetcher);
  const normalized = normalizeName(normalizeCommoditySearch(query));
  const boundedLimit = Math.min(Math.max(Math.trunc(limit) || 10, 1), 50);
  return [...new Set(catalog.cmdt_data
    .map((row) => row.cmdt_name.trim())
    .filter((name) => normalizeName(name).includes(normalized)))]
    .sort((a, b) => a.localeCompare(b))
    .slice(0, boundedLimit);
}
