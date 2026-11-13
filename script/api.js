/* Shared API access + remembered location. Endpoints are unchanged from the original build. */

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

const isStringArray = (value) =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

export async function fetchFilters({ state = "", district = "" } = {}) {
  const query = new URLSearchParams();
  if (state) query.set("state", state);
  if (district) query.set("district", district);
  const suffix = query.toString() ? `?${query}` : "";
  const { data } = await requestJson(`/api/v1/meta/filters${suffix}`);
  if (
    !data ||
    !isStringArray(data.states) ||
    !isStringArray(data.districts) ||
    !isStringArray(data.markets)
  ) {
    throw new Error("The market filters response has an invalid format.");
  }
  return data;
}

function validPrice(value) {
  if (value === null || value === undefined) return true;
  if (typeof value !== "number" && typeof value !== "string") return false;
  if (typeof value === "string" && value.trim() === "") return false;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0;
}

export function isPriceRecord(record) {
  return (
    record !== null &&
    typeof record === "object" &&
    typeof record.commodity === "string" &&
    typeof record.market === "string" &&
    validPrice(record.min_price) &&
    validPrice(record.max_price) &&
    validPrice(record.modal_price)
  );
}

export async function fetchPrices(params, { signal } = {}) {
  const payload = await requestJson(`/api/v1/prices?${new URLSearchParams(params)}`, { signal });
  if (!Array.isArray(payload.data) || !payload.data.every(isPriceRecord)) {
    throw new Error("The market data service returned invalid price records.");
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
