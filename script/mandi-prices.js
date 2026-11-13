const PAGE_SIZE = 50;
const numberFormat = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});
const state = {
  filters: { states: [], districts: [], markets: [], commodities: [] },
  selectedLocation: { state: "", district: "" },
  selectedMandi: null,
  records: [],
  meta: { limit: PAGE_SIZE, offset: 0, total: 0, hasNext: false },
  sort: "date_desc",
  loading: false,
  requestController: null,
  nextScheduledAt: null,
  schedulerEnabled: false,
  countdownMs: 0,
  syncStatusReceivedAt: 0,
};

const byId = (id) => document.getElementById(id);

async function requestJson(path, options = {}) {
  const response = await fetch(path, {
    headers: { Accept: "application/json", ...options.headers },
    ...options,
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

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

async function fetchFilters(location = {}) {
  const query = new URLSearchParams();
  if (location.state) query.set("state", location.state);
  if (location.district) query.set("district", location.district);
  const queryString = query.toString();
  const suffix = queryString ? `?${queryString}` : "";
  const payload = await requestJson(`/api/v1/meta/filters${suffix}`);
  const data = payload.data;
  if (
    !data ||
    !isStringArray(data.states) ||
    !isStringArray(data.districts) ||
    !isStringArray(data.markets) ||
    !isStringArray(data.commodities)
  ) {
    throw new Error("The market filters response has an invalid format.");
  }
  return data;
}

function fillSelect(select, values, placeholder, selectedValue = "") {
  select.replaceChildren(new Option(placeholder, ""));
  for (const value of values) select.add(new Option(value, value));
  select.value = values.includes(selectedValue) ? selectedValue : "";
}

function updateLocationLabels() {
  const { state: selectedState, district } = state.selectedLocation;
  const locationName = [district, selectedState].filter(Boolean).join(", ");
  const selectedMandi = state.selectedMandi;
  byId("selectedLocation").textContent = selectedMandi
    ? [selectedMandi.market, district, selectedState].filter(Boolean).join(", ")
    : locationName || "Choose a mandi";
  byId("locationHint").textContent = selectedMandi
    ? "Prices below are restricted to this mandi."
    : locationName
      ? "Choose one mandi in this location to view its crop prices."
      : "Choose a location or select from the available mandi records.";
}

function renderMandiSelection() {
  const grid = byId("mandiGrid");
  grid.replaceChildren();
  const markets = state.filters.markets;
  if (!state.selectedLocation.state || !state.selectedLocation.district) {
    byId("mandiHelp").textContent =
      "Choose a state and district to load available mandis.";
    const prompt = document.createElement("p");
    prompt.className = "mandi-empty";
    prompt.textContent =
      "Choose a state and district before selecting a mandi.";
    grid.append(prompt);
    return;
  }
  byId("mandiHelp").textContent = markets.length
    ? `${numberFormat.format(markets.length)} mandi${markets.length === 1 ? "" : "s"} with stored price records`
    : "No mandis with stored records match this location.";

  if (markets.length === 0) {
    const empty = document.createElement("p");
    empty.className = "mandi-empty";
    empty.textContent = "No market locations are available for this filter.";
    grid.append(empty);
    return;
  }

  for (const market of markets) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "mandi-card";
    card.setAttribute(
      "aria-pressed",
      String(state.selectedMandi?.market === market),
    );
    if (state.selectedMandi?.market === market) card.classList.add("selected");

    const icon = document.createElement("span");
    icon.className = "mandi-card-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "⌖";

    const content = document.createElement("span");
    content.className = "mandi-card-content";
    const name = document.createElement("strong");
    name.textContent = market;
    const location = document.createElement("small");
    location.textContent =
      [state.selectedLocation.district, state.selectedLocation.state]
        .filter(Boolean)
        .join(" · ") || "Market in available records";
    content.append(name, location);

    const check = document.createElement("span");
    check.className = "selected-check";
    check.setAttribute("aria-hidden", "true");
    check.textContent = "✓";
    card.append(icon, content, check);
    card.addEventListener("click", () => selectMandi(market));
    grid.append(card);
  }
}

function formatPrice(value) {
  if (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "")
  ) {
    return "—";
  }
  const price = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(price) || price < 0) return "—";
  return `₹${numberFormat.format(price)}`;
}

function formatArrivalDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return "—";
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return "—";
  }
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function appendCell(row, value, className = "") {
  const cell = document.createElement("td");
  cell.textContent = value;
  if (className) cell.className = className;
  row.append(cell);
  return cell;
}

function renderEmptyMessage(message) {
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.colSpan = 6;
  cell.className = "empty-state";
  cell.textContent = message;
  row.append(cell);
  byId("priceTableBody").replaceChildren(row);

  const empty = document.createElement("p");
  empty.className = "empty-state";
  empty.textContent = message;
  byId("mobilePriceList").replaceChildren(empty);
}

function validPriceValue(value) {
  if (value === null || value === undefined) return true;
  if (typeof value !== "number" && typeof value !== "string") return false;
  if (typeof value === "string" && value.trim() === "") return false;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0;
}

function isPriceRecord(record) {
  return (
    record !== null &&
    typeof record === "object" &&
    typeof record.commodity === "string" &&
    typeof record.market === "string" &&
    validPriceValue(record.min_price) &&
    validPriceValue(record.max_price) &&
    validPriceValue(record.modal_price)
  );
}

function renderPriceTable() {
  const body = byId("priceTableBody");
  const mobileList = byId("mobilePriceList");
  body.replaceChildren();
  mobileList.replaceChildren();

  if (state.loading) {
    renderEmptyMessage("Loading mandi prices…");
    byId("priceMessage").textContent = "Loading stored price records…";
    byId("resultCount").textContent = "Loading…";
    byId("showingText").textContent = "";
    byId("loadMore").hidden = true;
    return;
  }
  if (!state.selectedMandi) {
    renderEmptyMessage("Select one mandi to view available price records.");
    byId("priceMessage").textContent = "Select a mandi to load prices.";
    byId("resultCount").textContent = "0 records";
    byId("showingText").textContent = "";
    byId("loadMore").hidden = true;
    return;
  }
  if (state.records.length === 0) {
    renderEmptyMessage("No stored prices match this mandi and crop search.");
    byId("priceMessage").textContent = "No matching records.";
  } else {
    for (const record of state.records) {
      const row = document.createElement("tr");
      const cropCell = document.createElement("td");
      const crop = document.createElement("div");
      crop.className = "crop-name";
      const name = document.createElement("strong");
      name.textContent =
        typeof record.commodity === "string" ? record.commodity : "—";
      crop.append(name);
      if (typeof record.variety === "string" && record.variety.trim()) {
        const variety = document.createElement("small");
        variety.textContent = record.variety;
        crop.append(variety);
      }
      cropCell.append(crop);
      row.append(cropCell);
      appendCell(
        row,
        typeof record.market === "string" ? record.market : "—",
        "mandi-name",
      );
      appendCell(row, formatArrivalDate(record.arrival_date));
      appendCell(row, formatPrice(record.min_price), "price-value");
      appendCell(row, formatPrice(record.max_price), "price-value");
      appendCell(row, formatPrice(record.modal_price), "modal-price");
      body.append(row);

      const card = document.createElement("article");
      card.className = "mobile-price-card";
      const title = document.createElement("strong");
      title.textContent =
        typeof record.commodity === "string" ? record.commodity : "—";
      const details = document.createElement("p");
      details.textContent = `${typeof record.market === "string" ? record.market : "—"} · ${formatArrivalDate(record.arrival_date)}`;
      const prices = document.createElement("div");
      prices.className = "mobile-price-values";
      for (const [label, value] of [
        ["Minimum", formatPrice(record.min_price)],
        ["Maximum", formatPrice(record.max_price)],
        ["Modal", formatPrice(record.modal_price)],
      ]) {
        const item = document.createElement("div");
        const itemLabel = document.createElement("span");
        itemLabel.textContent = label;
        const amount = document.createElement("strong");
        amount.textContent = value;
        item.append(itemLabel, amount);
        prices.append(item);
      }
      card.append(title, details, prices);
      mobileList.append(card);
    }
    byId("priceMessage").textContent = "Showing prices returned by the market data service.";
  }

  byId("resultCount").textContent =
    `${numberFormat.format(state.meta.total)} price record${state.meta.total === 1 ? "" : "s"}`;
  byId("showingText").textContent = state.records.length
    ? `Showing ${numberFormat.format(state.records.length)} of ${numberFormat.format(state.meta.total)} records`
    : "Showing 0 records";
  byId("loadMore").hidden = !state.meta.hasNext;
  byId("loadMore").disabled = state.loading;
}

function showError(message) {
  const error = byId("priceError");
  error.textContent = message || "";
  error.hidden = !message;
  if (message) byId("priceMessage").textContent = "Price request failed.";
}

function updatePriceControls() {
  const enabled = Boolean(state.selectedMandi) && !state.loading;
  byId("cropSearch").disabled = !enabled;
  byId("sortFilter").disabled = !enabled;
  byId("clearFilters").disabled = !state.selectedMandi || state.loading;
  byId("loadMore").disabled = state.loading;
}

async function fetchPrices({ append = false } = {}) {
  if (!state.selectedMandi) {
    state.records = [];
    state.meta = { limit: PAGE_SIZE, offset: 0, total: 0, hasNext: false };
    renderPriceTable();
    return;
  }
  state.requestController?.abort();
  const controller = new AbortController();
  state.requestController = controller;
  if (!append) {
    state.records = [];
    state.meta.offset = 0;
  }
  state.loading = true;
  showError("");
  updatePriceControls();
  renderPriceTable();

  const query = new URLSearchParams({
    state: state.selectedLocation.state,
    district: state.selectedLocation.district,
    market: state.selectedMandi.market,
    limit: String(PAGE_SIZE),
    offset: String(state.meta.offset),
    sort: state.sort,
  });
  const search = byId("cropSearch").value.trim();
  if (search) query.set("search", search);

  try {
    const payload = await requestJson(`/api/v1/prices?${query}`, {
      signal: controller.signal,
    });
    if (
      !Array.isArray(payload.data) ||
      !payload.data.every(isPriceRecord)
    ) {
      throw new Error("The mandi prices response did not contain a record list.");
    }
    const meta = payload.meta;
    if (
      !meta ||
      !Number.isInteger(meta.limit) ||
      meta.limit < 1 ||
      !Number.isInteger(meta.offset) ||
      meta.offset < 0 ||
      !Number.isInteger(meta.total) ||
      meta.total < 0 ||
      typeof meta.hasNext !== "boolean"
    ) {
      throw new Error("The mandi prices response has invalid pagination data.");
    }
    state.records = append ? [...state.records, ...payload.data] : payload.data;
    state.meta = {
      limit: Number.isInteger(meta.limit) ? meta.limit : PAGE_SIZE,
      offset: Number.isInteger(meta.offset) ? meta.offset : 0,
      total: meta.total,
      hasNext: meta.hasNext,
    };
  } catch (error) {
    if (controller.signal.aborted) return;
    showError(
      error instanceof Error ? error.message : "Unable to load mandi prices.",
    );
    if (!append) {
      state.records = [];
      state.meta = { limit: PAGE_SIZE, offset: 0, total: 0, hasNext: false };
    }
  } finally {
    if (state.requestController === controller) {
      state.loading = false;
      updatePriceControls();
      renderPriceTable();
    }
  }
}

function selectMandi(market) {
  state.selectedMandi = { market };
  renderMandiSelection();
  updateLocationLabels();
  fetchPrices();
}

function fillLocationDialog(data, selectedState = "", selectedDistrict = "") {
  const stateSelect = byId("stateSelect");
  const districtSelect = byId("districtSelect");
  fillSelect(stateSelect, data.states, "Select a state", selectedState);
  fillSelect(districtSelect, data.districts, "Select a district", selectedDistrict);
  stateSelect.disabled = data.states.length === 0;
  districtSelect.disabled = !stateSelect.value || data.districts.length === 0;
  byId("applyLocation").disabled =
    !stateSelect.value || !districtSelect.value;
}

async function initMandiSelection() {
  const data = await fetchFilters();
  state.filters = data;
  fillLocationDialog(data);
  renderMandiSelection();

  byId("stateSelect").addEventListener("change", async (event) => {
    const selectedState = event.currentTarget.value;
    byId("districtSelect").disabled = true;
    byId("applyLocation").disabled = true;
    try {
      const updatedFilters = await fetchFilters({ state: selectedState });
      fillLocationDialog(updatedFilters, selectedState);
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Unable to load districts.",
      );
    }
  });

  byId("districtSelect").addEventListener("change", (event) => {
    byId("applyLocation").disabled =
      !byId("stateSelect").value || !event.currentTarget.value;
  });

  byId("applyLocation").addEventListener("click", async () => {
    const selectedState = byId("stateSelect").value;
    const selectedDistrict = byId("districtSelect").value;
    if (!selectedState || !selectedDistrict) return;
    try {
      state.filters = await fetchFilters({
        state: selectedState,
        district: selectedDistrict,
      });
      state.selectedLocation = {
        state: selectedState,
        district: selectedDistrict,
      };
      state.selectedMandi = null;
      state.records = [];
      renderMandiSelection();
      updateLocationLabels();
      updatePriceControls();
      renderPriceTable();
      byId("locationDialog").close();
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Unable to load mandis.",
      );
    }
  });
}

function formatCountdown(milliseconds) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return `${hours}h ${minutes}m ${remainder}s`;
}

function updateNextSyncLabel() {
  const label = byId("nextSyncAt");
  if (!state.schedulerEnabled || !state.nextScheduledAt) {
    label.textContent = "Not configured in this environment";
    return;
  }
  const remaining =
    state.countdownMs - (performance.now() - state.syncStatusReceivedAt);
  label.textContent = `${formatCountdown(remaining)} · ${new Date(state.nextScheduledAt).toLocaleString()}`;
}

async function updateSyncStatus() {
  try {
    const payload = await requestJson("/api/v1/sync-status");
    const data = payload.data;
    if (
      !data ||
      typeof data.freshnessStatus !== "string" ||
      typeof data.schedulerEnabled !== "boolean" ||
      typeof data.nextScheduledAt !== "string" ||
      !Number.isFinite(new Date(data.nextScheduledAt).getTime()) ||
      !Number.isFinite(data.countdownMs) ||
      data.countdownMs < 0
    ) {
      throw new Error("The sync status response has an invalid format.");
    }
    state.schedulerEnabled = data.schedulerEnabled;
    state.nextScheduledAt = data.nextScheduledAt;
    state.countdownMs = data.countdownMs;
    state.syncStatusReceivedAt = performance.now();
    byId("syncFreshness").textContent = data.freshnessStatus;
    byId("updatedAt").textContent = data.lastSuccessfulSync?.completed_at
      ? new Date(data.lastSuccessfulSync.completed_at).toLocaleString("en-IN")
      : "No successful sync recorded";
    updateNextSyncLabel();
  } catch (error) {
    console.error("[Mandi prices] Unable to load sync status:", error);
    byId("syncFreshness").textContent = "Sync status unavailable";
    byId("updatedAt").textContent = "Unavailable";
    byId("nextSyncAt").textContent = "Unavailable";
  }
}

async function showLocationDialog() {
  if (state.filters.states.length === 0) {
    try {
      state.filters = await fetchFilters();
      fillLocationDialog(state.filters);
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : "Unable to load location options.",
      );
      return;
    }
  }
  const dialog = byId("locationDialog");
  if (typeof dialog.showModal === "function") dialog.showModal();
}

document.addEventListener("DOMContentLoaded", async () => {
  byId("locationAction").addEventListener("click", showLocationDialog);
  byId("changeLocationLink").addEventListener("click", showLocationDialog);
  byId("sortFilter").addEventListener("change", (event) => {
    state.sort = event.currentTarget.value;
    state.meta.offset = 0;
    fetchPrices();
  });
  byId("clearFilters").addEventListener("click", () => {
    byId("cropSearch").value = "";
    byId("sortFilter").value = "date_desc";
    state.sort = "date_desc";
    state.meta.offset = 0;
    fetchPrices();
  });
  byId("loadMore").addEventListener("click", () => {
    state.meta.offset += state.meta.limit;
    fetchPrices({ append: true });
  });

  let searchTimer;
  byId("cropSearch").addEventListener("input", () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      state.meta.offset = 0;
      fetchPrices();
    }, 250);
  });
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      if (!byId("cropSearch").disabled) byId("cropSearch").focus();
    }
  });

  try {
    await initMandiSelection();
  } catch (error) {
    console.error("[Mandi prices] Unable to load mandi filters:", error);
    showError(
      error instanceof Error ? error.message : "Unable to load mandi locations.",
    );
    byId("mandiHelp").textContent = "Mandi locations could not be loaded.";
    const empty = document.createElement("p");
    empty.className = "mandi-empty";
    empty.textContent =
      "Market locations are unavailable. Please try again later.";
    byId("mandiGrid").replaceChildren(empty);
  }

  updateLocationLabels();
  renderPriceTable();
  await updateSyncStatus();
  window.setInterval(updateNextSyncLabel, 1000);
  window.setInterval(updateSyncStatus, 60_000);
  if (window.lucide) window.lucide.createIcons();
});
