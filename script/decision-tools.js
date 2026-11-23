const API_BASE = document.querySelector('meta[name="api-base"]')?.content || "/api/v1";
const form = document.querySelector("#decisionSearch");
const stateInput = document.querySelector("#stateInput");
const cropInput = document.querySelector("#cropInput");
const searchButton = document.querySelector("#searchButton");
const statusNode = document.querySelector("#searchStatus");
const errorNode = document.querySelector("#searchError");
const resultsPanel = document.querySelector("#resultsPanel");
const rowsNode = document.querySelector("#comparisonRows");
const noteNode = document.querySelector("#decisionNote");
const sourceSummary = document.querySelector("#sourceSummary");
const quantityInput = document.querySelector("#quantityInput");
const priceInput = document.querySelector("#priceInput");
const costInput = document.querySelector("#costInput");
const netResult = document.querySelector("#netResult");
const grossResult = document.querySelector("#grossResult");
let comparedMarkets = [];

const money = (value) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 2,
}).format(value);
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));
const validNumber = (value) => Number.isFinite(value) && value >= 0;

function isRupeesPerQuintal(unit) {
  const normalized = String(unit || "").toLowerCase().replace(/\s+/g, "");
  return /₹|rs\.?|inr|rupee/.test(normalized) && /quintal|qtl|\bqt\b/.test(normalized);
}

function updateCalculator() {
  const quantity = Number(quantityInput.value);
  const price = Number(priceInput.value);
  const costs = Number(costInput.value);
  if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price) || price < 0 || !validNumber(costs)) {
    netResult.textContent = "—";
    grossResult.textContent = "Enter a valid quantity, price and cost.";
    return;
  }
  const gross = quantity * price;
  netResult.textContent = money(gross - costs);
  grossResult.textContent = `Gross amount ${money(gross)} − entered costs ${money(costs)}`;
}

function selectRecord(record) {
  if (!isRupeesPerQuintal(record.source_unit)) {
    statusNode.textContent = `Selected record unit is “${record.source_unit}”. The quintal calculator needs a source unit explicitly reported as ₹ per quintal.`;
    return;
  }
  priceInput.value = String(record.modal_price);
  costInput.value = "0";
  updateCalculator();
  document.querySelector("#calculatorTitle").scrollIntoView({ behavior: "smooth", block: "center" });
}

function renderComparison(records, meta, commodity) {
  const latestByMarket = new Map();
  for (const record of records) {
    if (record.modal_price === null || record.modal_price === undefined) continue;
    const key = [record.market, record.source_unit].join("|");
    const previous = latestByMarket.get(key);
    if (!previous || record.arrival_date > previous.arrival_date) latestByMarket.set(key, record);
  }
  comparedMarkets = [...latestByMarket.values()].sort((a, b) => {
    if (a.source_unit !== b.source_unit) return a.source_unit.localeCompare(b.source_unit);
    return b.modal_price - a.modal_price;
  });
  rowsNode.replaceChildren();
  for (const [index, record] of comparedMarkets.entries()) {
    const tr = document.createElement("tr");
    const calculatorAllowed = isRupeesPerQuintal(record.source_unit);
    tr.innerHTML = `
      <td><strong>${escapeHtml(record.market)}</strong><small>${escapeHtml(record.district)}, ${escapeHtml(record.state)}</small></td>
      <td>${escapeHtml(record.arrival_date)}</td>
      <td><strong>${money(record.modal_price)}</strong><small>${escapeHtml(record.source_unit)}</small></td>
      <td><label class="sr-only" for="market-cost-${index}">Costs for ${escapeHtml(record.market)}</label><input class="market-cost" id="market-cost-${index}" type="number" min="0" step="0.01" value="0" data-index="${index}" aria-label="Transport and handling cost for ${escapeHtml(record.market)} in rupees"></td>
      <td><strong id="market-net-${index}">—</strong><button class="use-record" type="button" data-index="${index}" ${calculatorAllowed ? "" : "disabled"}>Use in calculator</button></td>`;
    rowsNode.append(tr);
  }
  rowsNode.querySelectorAll(".market-cost").forEach((input) => input.addEventListener("input", updateMarketEstimates));
  rowsNode.querySelectorAll(".use-record").forEach((button) => button.addEventListener("click", () => selectRecord(comparedMarkets[Number(button.dataset.index)])));
  resultsPanel.hidden = false;
  const fetchedAt = meta?.fetchedAt ? new Date(meta.fetchedAt).toLocaleString() : "not supplied";
  sourceSummary.textContent = `Source: ${meta?.source || "Government of India OGD / AGMARKNET"} · fetched: ${fetchedAt} · records returned: ${records.length}`;
  if (!comparedMarkets.length) {
    noteNode.textContent = `No records with a reported modal price were returned for ${commodity}. Try another crop or state.`;
  } else {
    const distinctUnits = new Set(comparedMarkets.map((record) => record.source_unit));
    noteNode.textContent = distinctUnits.size > 1
      ? "Records contain different source-reported units. They are shown separately; do not compare their price values directly."
      : `Showing the latest returned observation per mandi for ${commodity}. Select “Use in calculator” only when the source unit is explicitly ₹ per quintal.`;
  }
  updateMarketEstimates();
}

function updateMarketEstimates() {
  const quantity = Number(quantityInput.value);
  rowsNode.querySelectorAll(".market-cost").forEach((input) => {
    const index = Number(input.dataset.index);
    const record = comparedMarkets[index];
    const target = document.querySelector(`#market-net-${index}`);
    const costs = Number(input.value);
    if (!record || !isRupeesPerQuintal(record.source_unit) || !Number.isFinite(quantity) || quantity <= 0 || !validNumber(costs)) {
      target.textContent = "Not comparable";
      return;
    }
    target.textContent = money(quantity * record.modal_price - costs);
  });
}

async function search() {
  const state = stateInput.value.trim();
  const commodity = cropInput.value.trim();
  errorNode.hidden = true;
  resultsPanel.hidden = true;
  if (!state || !commodity) {
    errorNode.textContent = "Enter both a state and crop name.";
    errorNode.hidden = false;
    return;
  }
  searchButton.disabled = true;
  statusNode.textContent = "Fetching government-reported records…";
  try {
    const params = new URLSearchParams({ state, commodity, limit: "100", offset: "0", sort: "date_desc" });
    const response = await fetch(`${API_BASE}/prices?${params}`, { headers: { Accept: "application/json" } });
    const payload = await response.json();
    if (!response.ok || payload.success !== true || !Array.isArray(payload.data)) {
      throw new Error(payload.error?.message || "The government price service could not return records.");
    }
    const records = payload.data;
    renderComparison(records, payload.meta || {}, commodity);
    statusNode.textContent = records.length
      ? `Loaded ${records.length} records from the first source page. ${payload.meta?.hasNext ? "More source pages exist; this comparison is limited to the returned page." : "No additional source page was reported."}`
      : "The government source returned no records for this selection.";
  } catch (error) {
    errorNode.textContent = error instanceof Error ? error.message : "Unexpected error while loading records.";
    errorNode.hidden = false;
    statusNode.textContent = "Comparison could not be loaded.";
  } finally {
    searchButton.disabled = false;
  }
}

form.addEventListener("submit", (event) => { event.preventDefault(); void search(); });
for (const input of [quantityInput, priceInput, costInput]) input.addEventListener("input", updateCalculator);
quantityInput.addEventListener("input", updateMarketEstimates);
