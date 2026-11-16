/* Shared API access + remembered location. Endpoints are unchanged from the original build. */

const FILTER_CACHE_TTL_MS = 15 * 60 * 1000;
const FILTER_CACHE_PREFIX = "rategpt.filters.v1:";

function readFilterCache(key) {
  try {
    const raw = localStorage.getItem(FILTER_CACHE_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!entry || !entry.data || !Number.isFinite(entry.savedAt)) return null;
    return entry;
  } catch {
    return null;
  }
}

function writeFilterCache(key, data) {
  try {
    localStorage.setItem(
      FILTER_CACHE_PREFIX + key,
      JSON.stringify({ data, savedAt: Date.now() }),
    );
  } catch {
    // Storage can be unavailable or full; network loading remains functional.
  }
}

function validateFilters(data) {
  if (
    !data ||
    !Array.isArray(data.states) || !data.states.every((item) => typeof item === "string") ||
    !Array.isArray(data.districts) || !data.districts.every((item) => typeof item === "string") ||
    !Array.isArray(data.markets) || !data.markets.every((item) => typeof item === "string") ||
    !data.coverage ||
    !["catalogue", "complete", "partial"].includes(data.coverage.status) ||
    !Number.isInteger(data.coverage.pagesScanned) ||
    !Number.isInteger(data.coverage.recordsScanned) ||
    !Number.isInteger(data.coverage.maxOffset) ||
    data.coverage.maxOffset < 0 ||
    (data.coverage.total !== null &&
      (!Number.isInteger(data.coverage.total) || data.coverage.total < 0))
  ) {
    throw new Error("The market filters response has an invalid format.");
  }
  return data;
}

async function fetchFiltersFromNetwork(query, cacheKey) {
  const suffix = query.toString() ? `?${query}` : "";
  const { data } = await requestJson(`/api/v1/meta/filters${suffix}`);
  const validated = validateFilters(data);
  writeFilterCache(cacheKey, validated);
  return validated;
}

const filterRefreshes = new Map();

export async function requestJson(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { Accept: "application/json", ...options.headers },
  });
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      response.ok
        ? "The server returned an unexpected response."
        : `The server returned HTTP ${response.status}.`,
    );
  }
  const payload = await response.json();
  if (!response.ok || payload?.success !== true) {
    throw new Error(
      payload?.error?.message || `The request failed (HTTP ${response.status}).`,
    );
  }
  return payload;
}

export async function fetchFilters({ state = "", district = "" } = {}) {
  const query = new URLSearchParams();
  if (state) query.set("state", state);
  if (district) query.set("district", district);
  const cacheKey = query.toString() || "all";
  const cached = readFilterCache(cacheKey);

  if (cached) {
    const isFresh = Date.now() - cached.savedAt < FILTER_CACHE_TTL_MS;
    if (!isFresh && !filterRefreshes.has(cacheKey)) {
      const refresh = fetchFiltersFromNetwork(query, cacheKey)
        .catch(() => null)
        .finally(() => filterRefreshes.delete(cacheKey));
      filterRefreshes.set(cacheKey, refresh);
    }
    return validateFilters(cached.data);
  }

  if (filterRefreshes.has(cacheKey)) return filterRefreshes.get(cacheKey);
  const request = fetchFiltersFromNetwork(query, cacheKey)
    .finally(() => filterRefreshes.delete(cacheKey));
  filterRefreshes.set(cacheKey, request);
  return request;
}

function validPrice(value) {
  if (value === null || value === undefined) return true;
  if (typeof value !== "number" && typeof value !== "string") return false;
  if (typeof value === "string" && value.trim() === "") return false;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0;
}

export function isPriceRecord(record) {
  if (
    record === null ||
    typeof record !== "object" ||
    typeof record.commodity !== "string" ||
    !record.commodity.trim() ||
    typeof record.market !== "string" ||
    !record.market.trim() ||
    typeof record.state !== "string" ||
    !record.state.trim() ||
    typeof record.district !== "string" ||
    !record.district.trim() ||
    typeof record.arrival_date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(record.arrival_date) ||
    typeof record.source_unit !== "string" ||
    !record.source_unit.trim() ||
    (record.variety !== null && record.variety !== undefined && typeof record.variety !== "string") ||
    (record.grade !== null && record.grade !== undefined && typeof record.grade !== "string")
  ) {
    return false;
  }

  const prices = [record.min_price, record.max_price, record.modal_price];
  return prices.every(validPrice);
}

export async function fetchPrices(params, { signal } = {}) {
  const payload = await requestJson(`/api/v1/prices?${new URLSearchParams(params)}`, { signal });
  if (!Array.isArray(payload.data) || !payload.data.every(isPriceRecord)) {
    throw new Error("The market data service returned invalid price records.");
  }
  const updatedAt = payload.meta?.upstreamUpdatedAt;
  if (
    updatedAt !== null &&
    updatedAt !== undefined &&
    (typeof updatedAt !== "string" || Number.isNaN(Date.parse(updatedAt)))
  ) {
    throw new Error("The market data service returned an invalid source update timestamp.");
  }
  return payload;
}

export async function fetchSyncStatus() {
  const { data } = await requestJson("/api/v1/sync-status");
  if (!data || typeof data.freshnessStatus !== "string") {
    throw new Error("The sync status response has an invalid format.");
  }
  return data;
}

/* ---- remembered location (per device) ---- */
const LOCATION_KEY = "rategpt.location";
const RECENT_KEY = "rategpt.recent";

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage may be blocked */
  }
}

export const loadLocation = () => {
  const saved = readJson(LOCATION_KEY, null);
  return saved && typeof saved.state === "string" ? saved : null;
};
export const saveLocation = (location) => writeJson(LOCATION_KEY, location);
export const loadRecent = () => {
  const list = readJson(RECENT_KEY, []);
  return Array.isArray(list)
    ? list.filter((r) => r && r.state && r.district && r.market).slice(0, 3)
    : [];
};
export function pushRecent(entry) {
  const next = [
    entry,
    ...loadRecent().filter(
      (r) => !(r.state === entry.state && r.district === entry.district && r.market === entry.market),
    ),
  ].slice(0, 3);
  writeJson(RECENT_KEY, next);
}
