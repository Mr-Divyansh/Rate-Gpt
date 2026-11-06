const $ = (selector) => document.querySelector(selector);
const PAGE_SIZE = 50;
const numberFormat = new Intl.NumberFormat("en-IN");
const money = (value) =>
  value === null || value === undefined || value === ""
    ? "—"
    : `₹${numberFormat.format(Number(value))}`;
const displayDate = (value) => {
  if (!value) return "—";
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};
const state = {
  offset: 0,
  total: 0,
  hasNext: false,
  filters: { states: [], districts: [], markets: [], commodities: [] },
  health: null,
  loading: false,
};
const params = () => ({
  state: $("#stateFilter").value,
  district: $("#districtFilter").value,
  market: $("#marketFilter").value,
  commodity: $("#commodityFilter").value,
  date: $("#dateFilter").value,
  search: $("#searchInput").value.trim(),
  sort: $("#sortFilter").value,
  limit: PAGE_SIZE,
  offset: state.offset,
});
function setOptions(select, values, placeholder, selected = "") {
  select.replaceChildren(new Option(placeholder, ""));
  for (const value of values || []) select.add(new Option(value, value));
  select.value = selected && values?.includes(selected) ? selected : "";
}
function showMessage(message, type = "") {
  const el = $("#stateMessage");
  el.textContent = message;
  el.className = `state-message ${type}`;
  el.hidden = false;
  $("#tableWrap").hidden = true;
}
function fillTable(records) {
  const tbody = $("#priceRows");
  tbody.replaceChildren();
  for (const record of records) {
    const row = document.createElement("tr");
    const cells = [
      [record.commodity, ""],
      [record.state, ""],
      [record.district, ""],
      [record.market, ""],
      [displayDate(record.arrival_date), "date"],
      [money(record.min_price), "price"],
      [money(record.max_price), "price"],
      [money(record.modal_price), "price-modal"],
    ];
    for (const [value, className] of cells) {
      const td = document.createElement("td");
      td.textContent = value ?? "—";
      if (className) td.className = className;
      row.append(td);
    }
    tbody.append(row);
  }
  $("#stateMessage").hidden = true;
  $("#tableWrap").hidden = false;
}
async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { Accept: "application/json", ...(options.headers || {}) },
    ...options,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success)
    throw new Error(
      payload?.error?.message || `Request failed (${response.status})`,
    );
  return payload;
}
async function loadHealth() {
  try {
    const payload = await requestJson("/api/v1/health");
    state.health = payload.data;
    const stats = payload.data.stats || {};
    $("#totalRecords").textContent = numberFormat.format(
      stats.totalRecords || 0,
    );
    $("#totalMarkets").textContent = numberFormat.format(
      stats.mandisCovered || 0,
    );
    $("#totalCrops").textContent = numberFormat.format(
      stats.commoditiesTracked || 0,
    );
    $("#totalStates").textContent = numberFormat.format(
      stats.statesCovered || 0,
    );
    $("#latestDate").textContent = displayDate(stats.latestArrivalDate);
    const sync = stats.lastSync;
    $("#lastUpdated").textContent = sync?.completed_at
      ? `Last sync attempt: ${new Date(sync.completed_at).toLocaleString("en-IN")}`
      : "No completed sync attempt recorded";
    $("#freshnessDot").classList.toggle(
      "good",
      Boolean(sync?.status === "SUCCESS"),
    );
    $("#freshnessDot").classList.toggle(
      "bad",
      Boolean(sync && ["FAILED", "NOT_CONFIGURED"].includes(sync.status)),
    );
  } catch (error) {
    $("#lastUpdated").textContent = "Backend status unavailable";
    $("#freshnessDot").classList.add("bad");
  }
}
async function loadFilters() {
  const payload = await requestJson("/api/v1/meta/filters");
  state.filters = payload.data || state.filters;
  setOptions($("#stateFilter"), state.filters.states, "All states");
  setOptions($("#districtFilter"), state.filters.districts, "All districts");
  setOptions($("#marketFilter"), state.filters.markets, "All markets");
  setOptions($("#commodityFilter"), state.filters.commodities, "All crops");
  updateCascadeControls();
}
function updateCascadeControls() {
  const hasState = Boolean($("#stateFilter").value);
  const hasDistrict = Boolean($("#districtFilter").value);
  $("#districtFilter").disabled = !hasState;
  $("#marketFilter").disabled = !hasDistrict;
}
async function updateCascadingFilters() {
  const stateValue = $("#stateFilter").value;
  const districtValue = $("#districtFilter").value;
  try {
    const query = new URLSearchParams();
    if (stateValue) query.set("state", stateValue);
    if (districtValue) query.set("district", districtValue);
    const payload = await requestJson(`/api/v1/meta/filters?${query}`);
    const data = payload.data || {};
    const previousDistrict = districtValue;
    const previousMarket = $("#marketFilter").value;
    setOptions(
      $("#districtFilter"),
      data.districts || [],
      "All districts",
      previousDistrict,
    );
    setOptions(
      $("#marketFilter"),
      data.markets || [],
      "All markets",
      previousMarket,
    );
    updateCascadeControls();
  } catch (error) {
    updateCascadeControls();
  }
}
async function loadPrices() {
  if (state.loading) return;
  state.loading = true;
  $("#applyFilters").disabled = true;
  $("#refreshButton").disabled = true;
  showMessage("Loading government-reported records…");
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params()))
    if (value !== "" && value !== undefined && value !== null)
      query.set(key, String(value));
  try {
    const payload = await requestJson(`/api/v1/prices?${query}`);
    const records = Array.isArray(payload.data) ? payload.data : [];
    const meta = payload.meta || {};
    state.total = Number(meta.total ?? records.length);
    state.hasNext = Boolean(meta.hasNext);
    fillTable(records);
    const first = state.total === 0 ? 0 : state.offset + 1;
    const last = state.offset + records.length;
    $("#resultSummary").textContent =
      `${numberFormat.format(state.total)} matching record${state.total === 1 ? "" : "s"}`;
    $("#pageSummary").textContent = state.total
      ? `Showing ${numberFormat.format(first)}–${numberFormat.format(last)} of ${numberFormat.format(state.total)}`
      : "No records to display";
    $("#prevPage").disabled = state.offset === 0;
    $("#nextPage").disabled = !state.hasNext && last >= state.total;
    if (records.length === 0)
      showMessage(
        "No records match these filters. Try changing your search or resetting the filters.",
        "empty",
      );
  } catch (error) {
    showMessage(
      `Unable to load mandi prices: ${error.message}. Check that the backend is running and configured.`,
      "error",
    );
    $("#resultSummary").textContent = "Records could not be loaded";
    $("#pageSummary").textContent = "Unavailable";
    $("#prevPage").disabled = true;
    $("#nextPage").disabled = true;
  } finally {
    state.loading = false;
    $("#applyFilters").disabled = false;
    $("#refreshButton").disabled = false;
  }
}
function applyFilters() {
  state.offset = 0;
  loadPrices();
}
$("#stateFilter").addEventListener("change", async () => {
  setOptions($("#districtFilter"), [], "All districts");
  setOptions($("#marketFilter"), [], "All markets");
  await updateCascadingFilters();
  applyFilters();
});
$("#districtFilter").addEventListener("change", async () => {
  setOptions($("#marketFilter"), [], "All markets");
  await updateCascadingFilters();
  applyFilters();
});
$("#marketFilter").addEventListener("change", applyFilters);
$("#commodityFilter").addEventListener("change", applyFilters);
$("#dateFilter").addEventListener("change", applyFilters);
$("#sortFilter").addEventListener("change", applyFilters);
$("#applyFilters").addEventListener("click", applyFilters);
$("#searchInput").addEventListener("keydown", (event) => {
  if (event.key === "Enter") applyFilters();
});
$("#resetFilters").addEventListener("click", async () => {
  $("#searchInput").value = "";
  $("#dateFilter").value = "";
  $("#stateFilter").value = "";
  $("#sortFilter").value = "date_desc";
  setOptions($("#districtFilter"), state.filters.districts, "All districts");
  setOptions($("#marketFilter"), state.filters.markets, "All markets");
  setOptions($("#commodityFilter"), state.filters.commodities, "All crops");
  updateCascadeControls();
  applyFilters();
});
$("#refreshButton").addEventListener("click", async () => {
  await loadHealth();
  await loadPrices();
});
$("#prevPage").addEventListener("click", () => {
  state.offset = Math.max(0, state.offset - PAGE_SIZE);
  loadPrices();
});
$("#nextPage").addEventListener("click", () => {
  if (state.hasNext || state.offset + PAGE_SIZE < state.total) {
    state.offset += PAGE_SIZE;
    loadPrices();
  }
});
const menuButton = $("#menuToggle");
const nav = $("#mainNav");
menuButton?.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(open));
});
async function init() {
  try {
    await Promise.all([loadHealth(), loadFilters()]);
  } catch (error) {
    showMessage(
      `Could not load filter metadata: ${error.message}. The API may be unavailable or the database may not be initialized.`,
      "error",
    );
  }
  await loadPrices();
}
init();
