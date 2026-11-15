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
const REPORT_LOOKBACK_DAYS = 4;
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

function shiftIsoDate(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

function apiBaseUrl(): string {
  const raw = process.env.AGMARKNET_API_BASE_URL || DEFAULT_BASE_URL;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
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

function reportRows(
  payload: Record<string, unknown>,
  reportDate: string,
  catalog: AgmarknetCatalog,
): MandiRecord[] {
  const states = readArray<Record<string, unknown>>(payload.states);
  const districtByMarketId = new Map(catalog.market_data.map((market) => [
    market.id,
    catalog.district_data.find((district) => district.id === market.district_id)?.district_name ?? "",
  ]));

  const records: MandiRecord[] = [];
  for (const state of states) {
    const stateName = typeof state.stateName === "string" ? state.stateName.trim() : "";
    for (const market of readArray<Record<string, unknown>>(state.markets)) {
      const marketId = Number(market.marketId);
      const marketName = typeof market.marketName === "string" ? market.marketName.trim() : "";
      const district = districtByMarketId.get(marketId) ?? "";
      if (!stateName || !marketName || !district) continue;

      for (const commodity of readArray<Record<string, unknown>>(market.commodities)) {
        const commodityName = typeof commodity.commodityName === "string"
          ? commodity.commodityName.trim()
          : "";
        if (!commodityName) continue;

        for (const row of readArray<Record<string, unknown>>(commodity.data)) {
          const arrivalDate = normalizeArrivalDate(row.arrivalDate) ?? reportDate;
          const minPrice = recordNumber(row.minimumPrice);
          const maxPrice = recordNumber(row.maximumPrice);
          const modalPrice = recordNumber(row.modalPrice);
          if (minPrice === null && maxPrice === null && modalPrice === null) continue;
          const sourceUnit = typeof row.unitOfPrice === "string" && row.unitOfPrice.trim()
            ? row.unitOfPrice.trim()
            : "Not provided by source";
          const variety = typeof row.variety === "string" && row.variety.trim() ? row.variety.trim() : null;
          const grade = typeof row.grade === "string" && row.grade.trim() ? row.grade.trim() : null;
          const id = [
            stateName, district, marketName, commodityName, variety ?? "", grade ?? "", arrivalDate, sourceUnit,
          ].join("|").toLocaleLowerCase();
          records.push({
            id,
            state: stateName,
            district,
            market: marketName,
            commodity: commodityName,
            variety,
            grade,
            arrival_date: arrivalDate,
            min_price: minPrice,
            max_price: maxPrice,
            modal_price: modalPrice,
            source_unit: sourceUnit,
          });
        }
      }
    }
  }
  return records;
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

function sortRecords(records: MandiRecord[], sort?: string): void {
  records.sort((left, right) => {
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

export async function fetchAgmarknet2Prices(
  options: LiveQueryOptions,
  fetcher: typeof fetch = fetch,
): Promise<{
  records: MandiRecord[];
  meta: {
    limit: number;
    offset: number;
    nextOffset: number;
    total: number;
    hasNext: boolean;
    upstreamHasNext: boolean;
    truncated: false;
    source: string;
    fetchedAt: string;
    upstreamUpdatedAt: null;
    cacheStatus: "live";
    freshnessStatus: string;
    partial: boolean;
    failedDates: string[];
  };
}> {
  if (!options.state) {
    throw new GovernmentApiError("A state is required for the AGMARKNET 2.0 market report.", 400);
  }
  if (options.arrivalDate) {
    const requested = normalizeArrivalDate(options.arrivalDate);
    if (!requested) throw new GovernmentApiError("Arrival date is invalid.", 400);
    if (isFutureArrivalDate(requested)) {
      throw new GovernmentApiError("Future arrival dates are not available. Choose today or an earlier date.", 400);
    }
  }

  const catalog = await getCatalog(fetcher);
  const stateRow = catalog.state_data.find((row) => normalizeName(row.state_name) === normalizeName(options.state!));
  if (!stateRow) {
    throw new GovernmentApiError("The selected state is not available in AGMARKNET 2.0.", 404);
  }
  const districtRow = options.district
    ? catalog.district_data.find((row) =>
        row.state_id === stateRow.state_id &&
        normalizeName(row.district_name) === normalizeName(options.district!),
      )
    : undefined;
  const marketRows = catalog.market_data.filter((row) =>
    row.state_id === stateRow.state_id &&
    (!options.district || row.district_id === districtRow?.id) &&
    (!options.market || normalizeName(row.mkt_name) === normalizeName(options.market)),
  );
  if (!marketRows.length) {
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;
    return {
      records: [],
      meta: {
        limit, offset, nextOffset: offset, total: 0,
        hasNext: false, upstreamHasNext: false, truncated: false,
        source: SOURCE_NAME, fetchedAt: new Date().toISOString(),
        upstreamUpdatedAt: null, cacheStatus: "live",
        freshnessStatus: FRESHNESS_STATUS, partial: false, failedDates: [],
      },
    };
  }

  const today = indiaTodayIsoDate();
  const dates = options.arrivalDate
    ? [normalizeArrivalDate(options.arrivalDate)!]
    : Array.from({ length: REPORT_LOOKBACK_DAYS }, (_, index) => shiftIsoDate(today, -index));
  const marketIds = marketRows.map((row) => row.id);
  const settled = await Promise.allSettled(dates.map(async (date) => {
    const payload = await requestJson(
      "/prices-and-arrivals/market-report/daily",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          marketIds,
          stateIds: [stateRow.state_id],
          includeExcel: false,
        }),
      },
      fetcher,
    );
    const payloadStates = readArray(payload.states);
    if (!payloadStates.length && payload.success === false) {
      throw new GovernmentApiError("AGMARKNET 2.0 returned an unsuccessful daily report.", 502);
    }
    return reportRows(payload, date, catalog);
  }));

  const successful = settled.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  const failedDates = settled.flatMap((result, index) => result.status === "rejected" ? [dates[index]!] : []);
  if (settled.every((result) => result.status === "rejected")) {
    const first = settled.find((result) => result.status === "rejected");
    throw first && first.status === "rejected"
      ? first.reason
      : new GovernmentApiError("AGMARKNET 2.0 daily reports are unavailable.", 502);
  }

  const unique = new Map<string, MandiRecord>();
  for (const record of successful) {
    if (normalizeName(record.state) !== normalizeName(options.state)) continue;
    if (options.district && normalizeName(record.district) !== normalizeName(options.district)) continue;
    if (options.market && normalizeName(record.market) !== normalizeName(options.market)) continue;
    if (options.commodity && normalizeName(record.commodity) !== normalizeName(options.commodity)) continue;
    if (options.search && !normalizeName(record.commodity).includes(normalizeName(normalizeCommoditySearch(options.search)))) continue;
    unique.set(record.id, record);
  }
  const records = [...unique.values()];
  sortRecords(records, options.sort);

  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
    throw new GovernmentApiError("Page size is outside the supported range.", 400);
  }
  if (!Number.isInteger(offset) || offset < 0 || offset > MAX_OFFSET) {
    throw new GovernmentApiError("Page offset is outside the supported range.", 400);
  }
  const page = records.slice(offset, offset + limit);
  const nextOffset = offset + page.length;
  const hasNext = nextOffset < records.length;

  return {
    records: page,
    meta: {
      limit,
      offset,
      nextOffset,
      total: records.length,
      hasNext,
      upstreamHasNext: hasNext,
      truncated: false,
      source: SOURCE_NAME,
      fetchedAt: new Date().toISOString(),
      upstreamUpdatedAt: null,
      cacheStatus: "live",
      freshnessStatus: failedDates.length
        ? `Government-published daily market data; some requested dates could not be fetched (${failedDates.join(", ")}).`
        : FRESHNESS_STATUS,
      partial: failedDates.length > 0,
      failedDates,
    },
  };
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
