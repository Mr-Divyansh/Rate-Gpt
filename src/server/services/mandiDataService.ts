const RESOURCE_ID =
  process.env.DATA_GOV_RESOURCE_ID || "9ef84268-d588-465a-a308-a864a43d0070";
const DEFAULT_BASE_URL = "https://api.data.gov.in/resource";
const MAX_PAGE_SIZE = 100;
const MAX_OFFSET = 1_000_000;
const REQUEST_TIMEOUT_MS = 8_000;
const MAX_ATTEMPTS = 3;

const FRUIT_NAMES = [
  { english: "Apple", hindi: "सेब" },
  { english: "Banana", hindi: "केला" },
  { english: "Mango", hindi: "आम" },
  { english: "Guava", hindi: "अमरूद" },
  { english: "Pomegranate", hindi: "अनार" },
  { english: "Orange", hindi: "संतरा" },
  { english: "Grapes", hindi: "अंगूर" },
  { english: "Papaya", hindi: "पपीता" },
];

const HINDI_CROP_NAMES: Record<string, string> = {
  गेहूँ: "wheat",
  गेहूं: "wheat",
  धान: "paddy",
  चावल: "rice",
  मक्का: "maize",
  बाजरा: "bajra",
  ज्वार: "jowar",
  जौ: "barley",
  रागी: "ragi",
  सरसों: "mustard",
  सोयाबीन: "soybean",
  मूंगफली: "groundnut",
  सूरजमुखी: "sunflower",
  चना: "gram",
  अरहर: "arhar",
  तूर: "tur",
  मूंग: "moong",
  उड़द: "urad",
  मसूर: "lentil",
  कपास: "cotton",
  गन्ना: "sugarcane",
  जूट: "jute",
  प्याज: "onion",
  आलू: "potato",
  टमाटर: "tomato",
  लहसुन: "garlic",
  अदरक: "ginger",
  फूलगोभी: "cauliflower",
  पत्तागोभी: "cabbage",
  बैंगन: "brinjal",
  भिंडी: "bhindi",
  मटर: "peas",
  गाजर: "carrot",
  मूली: "radish",
  पालक: "spinach",
  खीरा: "cucumber",
  कद्दू: "pumpkin",
  करेला: "bitter gourd",
  लौकी: "bottle gourd",
  "हरी मिर्च": "green chilli",
  "शिमला मिर्च": "capsicum",
  नींबू: "lemon",
  धनिया: "coriander",
  हल्दी: "turmeric",
  मशरूम: "mushroom",
};

const STATES_AND_UTS = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

export interface LiveQueryOptions {
  state?: string;
  district?: string;
  market?: string;
  commodity?: string;
  arrivalDate?: string;
  search?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}

export interface MandiRecord {
  id: string;
  state: string;
  district: string;
  market: string;
  commodity: string;
  variety: string | null;
  grade: string | null;
  arrival_date: string;
  min_price: number | null;
  max_price: number | null;
  modal_price: number | null;
  source_unit: string;
}

export class GovernmentApiError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number,
    readonly upstreamStatus?: number,
  ) {
    super(message);
    this.name = "GovernmentApiError";
  }
}

export interface RawMandiInput {
  sourceRecordId: string | null;
  state: string;
  district: string;
  market: string;
  commodity: string;
  variety: string | null;
  grade: string | null;
  arrivalDate: string;
  minPrice: number | null;
  maxPrice: number | null;
  modalPrice: number | null;
  sourceUnit: string;
}

export function normalizeArrivalDate(
  rawDate: unknown,
): string | null {
  if (typeof rawDate !== "string" || !rawDate.trim()) return null;
  const trimmed = rawDate.trim();
  const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    return validIsoDate(Number(dmyMatch[3]), Number(dmyMatch[2]), Number(dmyMatch[1]));
  }
  const ymdMatch = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (ymdMatch) {
    return validIsoDate(Number(ymdMatch[1]), Number(ymdMatch[2]), Number(ymdMatch[3]));
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

export function parseReportedTotal(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const normalized = String(value).trim().replace(/,/g, "");
  if (!/^\d+$/.test(normalized)) return null;
  const total = Number(normalized);
  return Number.isSafeInteger(total) && total >= 0 ? total : null;
}

function validIsoDate(year: number, month: number, day: number): string | null {
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parsePrice(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const normalized = String(value).replace(/,/g, "").trim();
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return null;
  const price = Number(normalized);
  return Number.isFinite(price) ? price : null;
}

export function mapUpstreamRecord(raw: unknown): RawMandiInput | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const field = (lower: string, upper: string) => record[lower] ?? record[upper];
  const state = String(field("state", "State") ?? "").trim();
  const district = String(field("district", "District") ?? "").trim();
  const market = String(field("market", "Market") ?? "").trim();
  const commodity = String(field("commodity", "Commodity") ?? "").trim();
  const arrivalDate = normalizeArrivalDate(
    field("arrival_date", "Arrival_Date") ?? record.date,
  );
  if (!state || !district || !market || !commodity || !arrivalDate) return null;

  return {
    sourceRecordId: String(record.id ?? record._id ?? "").trim() || null,
    state,
    district,
    market,
    commodity,
    variety: String(field("variety", "Variety") ?? "").trim() || null,
    grade: String(field("grade", "Grade") ?? "").trim() || null,
    arrivalDate,
    minPrice: parsePrice(field("min_price", "Min_Price")),
    maxPrice: parsePrice(field("max_price", "Max_Price")),
    modalPrice: parsePrice(field("modal_price", "Modal_Price")),
    sourceUnit: "Rs/Quintal",
  };
}

export function parsePageInteger(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value).trim();
  if (!/^\d+$/.test(normalized)) return null;
  const number = Number(normalized);
  return Number.isSafeInteger(number) ? number : null;
}

function getApiKey(): string {
  const apiKey = process.env.DATA_GOV_API_KEY?.trim();
  if (
    !apiKey ||
    apiKey === "your_data_gov_in_api_key_here" ||
    apiKey === "MY_DATA_GOV_API_KEY"
  ) {
    throw new GovernmentApiError(
      "Government price service is not configured.",
      503,
    );
  }
  return apiKey;
}

function buildUrl(options: LiveQueryOptions, apiKey: string): URL {
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
    throw new GovernmentApiError("Page size is outside the supported range.", 400);
  }
  if (!Number.isInteger(offset) || offset < 0 || offset > MAX_OFFSET) {
    throw new GovernmentApiError("Page offset is outside the supported range.", 400);
  }

  const baseUrl = process.env.DATA_GOV_API_BASE_URL || DEFAULT_BASE_URL;
  let url: URL;
  try {
    url = new URL(`${baseUrl.replace(/\/+$/, "")}/${RESOURCE_ID}`);
  } catch {
    throw new GovernmentApiError("Government API endpoint is invalid.", 503);
  }
  if (url.protocol !== "https:" && process.env.NODE_ENV === "production") {
    throw new GovernmentApiError("Government API must use HTTPS.", 503);
  }

  url.searchParams.set("api-key", apiKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  // Text filters use exact-match keyword subfields in the OGD index.
  if (options.state) url.searchParams.set("filters[state.keyword]", options.state);
  if (options.district) url.searchParams.set("filters[district.keyword]", options.district);
  if (options.market) url.searchParams.set("filters[market.keyword]", options.market);
  if (options.commodity) url.searchParams.set("filters[commodity.keyword]", options.commodity);
  if (options.arrivalDate) {
    const isoDate = normalizeArrivalDate(options.arrivalDate);
    if (!isoDate) throw new GovernmentApiError("Arrival date is invalid.", 400);
    url.searchParams.set("filters[arrival_date]", isoDate);
  }
  if (options.search) url.searchParams.set("q", normalizeCommoditySearch(options.search));
  const sort = upstreamSort(options.sort);
  if (sort) {
    // OGD uses one sort[field]=direction parameter. Sending sort[order]
    // is interpreted as a field name and causes an Elasticsearch field_sort error.
    url.searchParams.set(`sort[${sort.field}]`, sort.order);
  }
  return url;
}

function upstreamSort(sort?: string): { field: string; order: string } | null {
  const map: Record<string, { field: string; order: string }> = {
    modal_price_asc: { field: "Modal_Price", order: "asc" },
    modal_price_desc: { field: "Modal_Price", order: "desc" },
    market_asc: { field: "Market", order: "asc" },
    market_desc: { field: "Market", order: "desc" },
    commodity_asc: { field: "Commodity", order: "asc" },
    commodity_desc: { field: "Commodity", order: "desc" },
    // Arrival_Date is not sortable in the current AGMARKNET OGD index mapping.
    // Leave date sorting to the upstream default; do not send a query that fails.
  };
  return sort ? map[sort] ?? null : null;
}

export function normalizeCommoditySearch(query: string): string {
  const normalized = query.trim().toLocaleLowerCase();
  const fruit = FRUIT_NAMES.find(
    ({ english, hindi }) =>
      normalized === english.toLocaleLowerCase() || normalized === hindi,
  );
  if (fruit) return fruit.english;
  const hindiCrop = Object.entries(HINDI_CROP_NAMES).find(
    ([hindi]) => normalized === hindi,
  );
  return hindiCrop?.[1] ?? query.trim();
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

export function isFutureArrivalDate(rawDate: unknown, now = new Date()): boolean {
  const normalized = normalizeArrivalDate(rawDate);
  return normalized !== null && normalized > indiaTodayIsoDate(now);
}

export async function fetchLivePrices(
  options: LiveQueryOptions = {},
  fetcher: typeof fetch = fetch,
): Promise<{
  records: MandiRecord[];
  meta: {
    limit: number;
    offset: number;
    nextOffset: number;
    total: number | null;
    hasNext: boolean;
    source: string;
    fetchedAt: string;
    cacheStatus: "live";
    freshnessStatus: string;
  };
}> {
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;
  if (options.arrivalDate) {
    const requestedDate = normalizeArrivalDate(options.arrivalDate);
    if (!requestedDate) throw new GovernmentApiError("Arrival date is invalid.", 400);
    if (isFutureArrivalDate(requestedDate)) {
      throw new GovernmentApiError("Future arrival dates are not available. Choose today or an earlier date.", 400);
    }
  }
  const url = buildUrl(options, getApiKey());
  const payload = await requestGovernmentPage(url, fetcher);
  // data.gov.in normally returns { records: [...] }. Some upstream error
  // responses still use HTTP 200 and contain an error/message object instead.
  const rawRecords = Array.isArray(payload.records)
    ? payload.records
    : Array.isArray((payload.data as Record<string, unknown> | undefined)?.records)
      ? ((payload.data as Record<string, unknown>).records as unknown[])
      : Array.isArray(payload.data)
        ? payload.data as unknown[]
        : null;
  if (!rawRecords) {
    const upstreamMessage = [payload.message, payload.error, payload.detail]
      .find((value) => typeof value === "string" && value.trim());
    const safeMessage = typeof upstreamMessage === "string"
      ? upstreamMessage.replace(/((?:api[-_ ]?key|token)\s*[:=]\s*)\S+/gi, "$1[redacted]").slice(0, 240)
      : "";
    const normalizedMessage = safeMessage.toLocaleLowerCase();
    if (/api.?key|unauthori[sz]ed|forbidden|credential/.test(normalizedMessage)) {
      throw new GovernmentApiError("Government data API rejected its configured key. Check DATA_GOV_API_KEY in the server environment.", 503);
    }
    if (/rate.?limit|too many requests|quota/.test(normalizedMessage)) {
      throw new GovernmentApiError("Government data API rate limit or quota reached. Please retry later.", 503);
    }
    throw new GovernmentApiError(
      safeMessage
        ? `Government API did not return a records array: ${safeMessage}`
        : "Government API response did not contain a records array. Check the upstream resource, API key, and response format.",
      502,
    );
  }
  if (rawRecords.length > limit) {
    throw new GovernmentApiError("Government API exceeded the requested page size.", 502);
  }

  const upstreamOffset =
    payload.offset === undefined ? offset : parsePageInteger(payload.offset);
  const upstreamLimit =
    payload.limit === undefined ? limit : parsePageInteger(payload.limit);
  if (upstreamOffset !== offset || upstreamLimit === null || upstreamLimit < 1) {
    throw new GovernmentApiError("Government API returned invalid pagination data.", 502);
  }
  if (upstreamLimit !== limit) {
    throw new GovernmentApiError("Government API returned an unexpected page size.", 502);
  }

  const total =
    payload.total === undefined ? null : parseReportedTotal(payload.total);
  if (payload.total !== undefined && total === null) {
    throw new GovernmentApiError("Government API returned an invalid result total.", 502);
  }
  const rawCount = rawRecords.length;
  if (total !== null && offset + rawCount > total) {
    throw new GovernmentApiError("Government API returned inconsistent pagination totals.", 502);
  }

  const seen = new Set<string>();
  const records: MandiRecord[] = [];
  for (const raw of rawRecords) {
    const mapped = mapUpstreamRecord(raw);
    if (!mapped) continue;
    // Never display a neighbouring arrival date if the upstream index ignores
    // or loosely applies its date filter. A date selection is an exact match.
    if (options.arrivalDate && mapped.arrivalDate !== normalizeArrivalDate(options.arrivalDate)) continue;
    const key = mapped.sourceRecordId
      ? `id:${mapped.sourceRecordId}`
      : [
          mapped.state,
          mapped.district,
          mapped.market,
          mapped.commodity,
          mapped.variety ?? "",
          mapped.grade ?? "",
          mapped.arrivalDate,
        ].join("|").toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    records.push({
      id: mapped.sourceRecordId ?? key,
      state: mapped.state,
      district: mapped.district,
      market: mapped.market,
      commodity: mapped.commodity,
      variety: mapped.variety,
      grade: mapped.grade,
      arrival_date: mapped.arrivalDate,
      min_price: mapped.minPrice,
      max_price: mapped.maxPrice,
      modal_price: mapped.modalPrice,
      source_unit: mapped.sourceUnit,
    });
  }

  // The OGD index does not support Arrival_Date sorting. Sort the validated
  // records in this response page so the UI never labels an arbitrary upstream
  // order as "latest". Pagination still follows the upstream raw offset; this
  // is intentionally a per-page ordering, not a fabricated global ranking.
  sortLivePage(records, options.sort);

  const nextOffset = offset + rawCount;
  return {
    records,
    meta: {
      limit,
      offset,
      nextOffset,
      total,
      hasNext: total === null ? rawCount === limit : nextOffset < total,
      source: "Government of India OGD / AGMARKNET",
      fetchedAt: new Date().toISOString(),
      cacheStatus: "live",
      freshnessStatus:
        "Government-published daily market data; not guaranteed real-time trading prices.",
    },
  };
}

function sortLivePage(records: MandiRecord[], sort?: string): void {
  const stringOrder = (left: string, right: string) =>
    left.localeCompare(right, "en", { sensitivity: "base" });
  const priceOrder = (left: number | null, right: number | null, descending: boolean) => {
    if (left === null && right === null) return 0;
    if (left === null) return 1;
    if (right === null) return -1;
    return descending ? right - left : left - right;
  };

  switch (sort) {
    case "date_asc":
      records.sort((left, right) => stringOrder(left.arrival_date, right.arrival_date));
      break;
    case "date_desc":
      records.sort((left, right) => stringOrder(right.arrival_date, left.arrival_date));
      break;
    case "modal_price_asc":
      records.sort((left, right) => priceOrder(left.modal_price, right.modal_price, false));
      break;
    case "modal_price_desc":
      records.sort((left, right) => priceOrder(left.modal_price, right.modal_price, true));
      break;
    case "market_asc":
      records.sort((left, right) => stringOrder(left.market, right.market));
      break;
    case "market_desc":
      records.sort((left, right) => stringOrder(right.market, left.market));
      break;
    case "commodity_asc":
      records.sort((left, right) => stringOrder(left.commodity, right.commodity));
      break;
    case "commodity_desc":
      records.sort((left, right) => stringOrder(right.commodity, left.commodity));
      break;
    default:
      break;
  }
}

async function requestGovernmentPage(
  url: URL,
  fetcher: typeof fetch,
): Promise<Record<string, unknown>> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetcher(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "RateGPT-Mandi-Client/1.0",
        },
        signal: controller.signal,
      });
    } catch (error) {
      if (attempt < MAX_ATTEMPTS) {
        await delay(200 * attempt);
        continue;
      }
      if (controller.signal.aborted) {
        throw new GovernmentApiError("Government API request timed out.", 504);
      }
      throw new GovernmentApiError("Government API could not be reached.", 503);
    } finally {
      clearTimeout(timeout);
    }

    if (response.status === 429 || response.status >= 500) {
      if (attempt < MAX_ATTEMPTS) {
        const retryAfter = Number(response.headers.get("retry-after"));
        await delay(Number.isFinite(retryAfter) ? Math.min(retryAfter * 1000, 1000) : 200 * attempt);
        continue;
      }
      throw new GovernmentApiError(
        response.status === 429
          ? "Government API rate limit reached. Please try again shortly."
          : "Government API is temporarily unavailable.",
        response.status === 429 ? 503 : 502,
        response.status,
      );
    }
    if (!response.ok) {
      throw new GovernmentApiError(
        "Government API rejected the price request.",
        502,
        response.status,
      );
    }
    try {
      const payload: unknown = await response.json();
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw new Error("Invalid JSON object");
      }
      return payload as Record<string, unknown>;
    } catch {
      throw new GovernmentApiError("Government API returned invalid JSON.", 502);
    }
  }
  throw new GovernmentApiError("Government API could not be reached.", 503);
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

type LiveFilterMetadata = {
  states: string[];
  districts: string[];
  markets: string[];
  commodities: string[];
};

// Filter metadata is small and short-lived. Cache only dropdown options in
// process memory; mandi price records are never cached or written to the DB.
const FILTER_CACHE_TTL_MS = 60_000;
const FILTER_CACHE_MAX_ENTRIES = 64;
const FILTER_PAGE_LIMIT = 10;
const liveFilterCache = new Map<string, { expiresAt: number; value: LiveFilterMetadata }>();
const liveFilterInFlight = new Map<string, Promise<LiveFilterMetadata>>();

function filterCacheKey(options: { state?: string; district?: string; market?: string }): string {
  return JSON.stringify([
    options.state?.trim() ?? "",
    options.district?.trim() ?? "",
    options.market?.trim() ?? "",
  ]);
}

export async function fetchLiveFilters(options: {
  state?: string;
  district?: string;
  market?: string;
} = {}): Promise<LiveFilterMetadata> {
  if (!options.state && !options.district && !options.market) {
    return {
      states: STATES_AND_UTS,
      districts: [],
      markets: [],
      commodities: [],
    };
  }

  const key = filterCacheKey(options);
  const now = Date.now();
  const cached = liveFilterCache.get(key);
  if (cached && cached.expiresAt > now) return cached.value;
  if (cached) liveFilterCache.delete(key);

  const pending = liveFilterInFlight.get(key);
  if (pending) return pending;

  const request = (async (): Promise<LiveFilterMetadata> => {
    const records: MandiRecord[] = [];
    const seen = new Set<string>();

    // Discover up to ten live pages (1,000 upstream rows) for dependent selectors.
    // This improves district/market coverage while keeping requests bounded;
    // the returned options are still explicitly partial, not a nationwide catalogue.
    for (let page = 0; page < FILTER_PAGE_LIMIT; page += 1) {
      const result = await fetchLivePrices({
        ...options,
        limit: MAX_PAGE_SIZE,
        offset: page * MAX_PAGE_SIZE,
      });
      for (const record of result.records) {
        const recordKey = [record.state, record.district, record.market, record.commodity]
          .join("|").toLocaleLowerCase();
        if (!seen.has(recordKey)) {
          seen.add(recordKey);
          records.push(record);
        }
      }
      // `records` may be smaller than a full upstream page after invalid rows
      // and duplicates are removed. Only upstream pagination can safely tell
      // us that there are no more records to inspect.
      if (!result.meta.hasNext) break;
    }

    const value: LiveFilterMetadata = {
      states: uniqueSorted([...STATES_AND_UTS, ...records.map((record) => record.state)]),
      districts: uniqueSorted(records.map((record) => record.district)),
      markets: uniqueSorted(records.map((record) => record.market)),
      commodities: uniqueSorted(records.map((record) => record.commodity)),
    };

    // LRU-like bounded insertion: never allow an unbounded process cache.
    if (liveFilterCache.size >= FILTER_CACHE_MAX_ENTRIES) {
      const oldestKey = liveFilterCache.keys().next().value;
      if (oldestKey) liveFilterCache.delete(oldestKey);
    }
    liveFilterCache.set(key, { value, expiresAt: Date.now() + FILTER_CACHE_TTL_MS });
    return value;
  })();

  liveFilterInFlight.set(key, request);
  try {
    return await request;
  } finally {
    liveFilterInFlight.delete(key);
  }
}

export async function searchLiveCommodities(
  query: string,
  limit = 10,
  fetcher: typeof fetch = fetch,
): Promise<string[]> {
  const normalizedQuery = normalizeCommoditySearch(query);
  const { records } = await fetchLivePrices({
    search: normalizedQuery,
    limit: MAX_PAGE_SIZE,
    offset: 0,
    sort: "commodity_asc",
  }, fetcher);
  const matches = records
    .map((record) => record.commodity)
    .filter((commodity) => commodity.toLocaleLowerCase().includes(normalizedQuery.toLocaleLowerCase()));
  // Suggestions must be observed upstream commodities, never a hand-written
  // crop catalogue that could imply unsupported price coverage.
  return uniqueSorted(matches).slice(0, Math.min(limit, 50));
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}
