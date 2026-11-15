import {
  GovernmentApiError,
  normalizeCommoditySearch,
} from "./mandiDataService.js";
const DEFAULT_BASE_URL = "https://api.agmarknet.gov.in/v1";
const REQUEST_TIMEOUT_MS = 12_000;
const CATALOG_TTL_MS = 15 * 60 * 1_000;
const MAX_OFFSET = 1_000_000;
const SOURCE_NAME = "Government of India AGMARKNET 2.0";

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

// The public UI uses current Indian state/UT names, while the AGMARKNET
// administrative master still contains several legacy/source spellings.
const STATE_NAME_ALIASES: Record<string, string[]> = {
  "andaman and nicobar islands": ["andaman and nicobar"],
  "chhattisgarh": ["chattisgarh"],
  "dadra and nagar haveli and daman and diu": [
    "dadra and nagar haveli",
    "daman and diu",
  ],
  "delhi": ["nct of delhi"],
  "kerala": ["keralam"],
  "puducherry": ["pondicherry"],
};

function findStateRows(catalog: AgmarknetCatalog, selectedState: string): AgmarknetState[] {
  const normalized = normalizeName(selectedState);
  const acceptedNames = new Set([normalized, ...(STATE_NAME_ALIASES[normalized] ?? [])]);
  return catalog.state_data.filter((row) => acceptedNames.has(normalizeName(row.state_name)));
}

// Normalize canonical UI state names to the spelling used by the live OGD
// price resource. The combined Dadra and Nagar Haveli and Daman and Diu UT
// intentionally has no single OGD state value.
export function normalizeAgmarknetStateName(value: string): string {
  const aliases = STATE_NAME_ALIASES[normalizeName(value)];
  return aliases?.length === 1 ? aliases[0] : value;
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
  const stateRows = options.state
    ? findStateRows(catalog, options.state)
    : [];
  if (options.state && !stateRows.length) {
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

  const stateIds = new Set(stateRows.map((row) => row.state_id));
  const districts = stateRows.length
    ? catalog.district_data.filter((row) => stateIds.has(row.state_id))
    : [];
  const districtRows = options.district
    ? districts.filter((row) => normalizeName(row.district_name) === normalizeName(options.district!))
    : [];
  const districtIds = new Set(districtRows.map((row) => row.id));
  const markets = stateRows.length
    ? catalog.market_data.filter((row) =>
        stateIds.has(row.state_id) &&
        (!options.district || districtIds.has(row.district_id)) &&
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
      status: stateRows.length ? "complete" : "catalogue",
      pagesScanned: 1,
      recordsScanned: stateRows.length ? markets.length : 0,
      total: stateRows.length ? markets.length : null,
      maxOffset: MAX_OFFSET,
      message: stateRows.length
        ? "Complete AGMARKNET 2.0 administrative mandi directory for the selected state/UT. Price availability depends on each market's daily report."
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
