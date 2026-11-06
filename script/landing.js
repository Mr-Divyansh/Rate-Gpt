const numberFormat = new Intl.NumberFormat("en-IN");
const formatMoney = (value) =>
  value === null || value === undefined || value === ""
    ? "—"
    : `₹${numberFormat.format(Number(value))}`;

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

async function requestJson(path, signal) {
  const response = await fetch(path, {
    headers: { Accept: "application/json" },
    signal,
  });
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      response.ok
        ? "The server returned an unexpected response."
        : `The server returned ${response.status}.`,
    );
  }

  const payload = await response.json();
  if (!response.ok || !payload?.success) {
    throw new Error(
      payload?.error?.message || `The request failed (${response.status}).`,
    );
  }

  return payload;
}

function updateServiceStatus(isAvailable, message) {
  const status = document.querySelector("#backendStatus");
  const sourceDot = document.querySelector("#sourceDot");
  const sourceStatus = document.querySelector("#sourceStatus");

  status.textContent = isAvailable ? "Database online" : "Unavailable";
  status.classList.toggle("is-online", isAvailable);
  status.classList.toggle("is-error", !isAvailable);
  status.classList.remove("is-loading");

  sourceDot.classList.toggle("is-error", !isAvailable);
  sourceStatus.textContent = message;
}

async function loadHealth() {
  try {
    const payload = await requestJson("/api/v1/health");
    const { stats, upstreamSource, status } = payload.data;
    const available = status === "healthy";

    document.querySelector("#totalRecords").textContent = numberFormat.format(
      stats.totalRecords,
    );
    document.querySelector("#totalMarkets").textContent = numberFormat.format(
      stats.mandisCovered,
    );
    document.querySelector("#totalCrops").textContent = numberFormat.format(
      stats.commoditiesTracked,
    );
    document.querySelector("#totalStates").textContent = numberFormat.format(
      stats.statesCovered,
    );
    document.querySelector("#latestDate").textContent = formatDate(
      stats.latestArrivalDate,
    );
    document.querySelector("#upstreamNote").textContent =
      upstreamSource.apiKeyConfigured
        ? "An OGD API key is configured. Data freshness still depends on the last successful sync."
        : "OGD sync is not configured in this environment. Saved backend records are shown as returned; this page does not generate prices.";

    updateServiceStatus(
      available,
      available
        ? `Stored backend records · latest arrival ${formatDate(stats.latestArrivalDate)}`
        : "The market data service is currently unavailable.",
    );

    if (!available) {
      throw new Error("The market data service is currently unavailable.");
    }
  } catch (error) {
    updateServiceStatus(false, "Could not verify the market data service.");
    document.querySelector("#upstreamNote").textContent =
      error instanceof Error
        ? error.message
        : "Could not load market data status.";
  }
}

function setSelectOptions(select, values) {
  const placeholder = select.options[0];
  select.replaceChildren(placeholder);

  for (const value of values) {
    select.add(new Option(value, value));
  }
}

async function loadFilters() {
  try {
    const payload = await requestJson("/api/v1/meta/filters");
    setSelectOptions(
      document.querySelector("#stateFilter"),
      payload.data.states || [],
    );
    setSelectOptions(
      document.querySelector("#commodityFilter"),
      payload.data.commodities || [],
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load filters.";
    document.querySelector("#recordsError").textContent =
      `Filters could not be loaded: ${message}`;
    document.querySelector("#recordsError").hidden = false;
  }
}

function createCell(label, value, className = "") {
  const cell = document.createElement("td");
  cell.dataset.label = label;
  cell.textContent = value ?? "—";
  if (className) cell.className = className;
  return cell;
}

function renderRecords(records) {
  const rows = document.querySelector("#priceRows");
  rows.replaceChildren();

  if (records.length === 0) {
    const row = document.createElement("tr");
    const cell = createCell(
      "",
      "No stored records match these filters. Try another search.",
      "table-placeholder",
    );
    cell.colSpan = 7;
    row.append(cell);
    rows.append(row);
    return;
  }

  for (const record of records) {
    const row = document.createElement("tr");
    row.append(
      createCell("Commodity", record.commodity),
      createCell("State", record.state),
      createCell("District", record.district),
      createCell("Market", record.market),
      createCell(
        "Min / Max",
        `${formatMoney(record.min_price)} / ${formatMoney(record.max_price)}`,
        "optional-column",
      ),
      createCell("Modal price", formatMoney(record.modal_price), "price-cell"),
      createCell("Arrival date", formatDate(record.arrival_date)),
    );
    rows.append(row);
  }
}

let activeRecordsRequest;
async function loadRecords() {
  activeRecordsRequest?.abort();
  activeRecordsRequest = new AbortController();
  const { signal } = activeRecordsRequest;
  const errorMessage = document.querySelector("#recordsError");
  const summary = document.querySelector("#resultSummary");
  const refresh = document.querySelector("#refreshButton");
  const query = new URLSearchParams({ limit: "8" });
  const search = document.querySelector("#searchInput").value.trim();
  const state = document.querySelector("#stateFilter").value;
  const commodity = document.querySelector("#commodityFilter").value;
  const sort = document.querySelector("#sortFilter").value;

  if (search) query.set("search", search);
  if (state) query.set("state", state);
  if (commodity) query.set("commodity", commodity);
  if (sort) query.set("sort", sort);

  errorMessage.hidden = true;
  refresh.disabled = true;
  summary.textContent = "Loading stored records…";

  try {
    const payload = await requestJson(`/api/v1/prices?${query}`, signal);
    if (signal.aborted) return;

    const records = Array.isArray(payload.data) ? payload.data : [];
    const total = Number(payload.meta?.total ?? records.length);
    renderRecords(records);
    summary.textContent = `${numberFormat.format(total)} matching stored record${total === 1 ? "" : "s"}`;
  } catch (error) {
    if (signal.aborted) return;

    const message =
      error instanceof Error ? error.message : "Could not load stored records.";
    summary.textContent = "Stored records could not be loaded.";
    errorMessage.textContent = `Unable to load mandi prices: ${message}`;
    errorMessage.hidden = false;
    renderRecords([]);
  } finally {
    if (!signal.aborted) refresh.disabled = false;
  }
}

document.querySelector("#recordFilters").addEventListener("submit", (event) => {
  event.preventDefault();
  loadRecords();
});

for (const id of ["stateFilter", "commodityFilter", "sortFilter"]) {
  document.querySelector(`#${id}`).addEventListener("change", loadRecords);
}

document.querySelector("#refreshButton").addEventListener("click", () => {
  loadHealth();
  loadRecords();
});

loadHealth();
loadFilters();
loadRecords();
