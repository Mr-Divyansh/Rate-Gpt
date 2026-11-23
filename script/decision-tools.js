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

// API contract: MandiRecord uses snake_case fields. Accept only explicit
// rupee-per-quintal units; never infer a unit from the price value.
function isRupeesPerQuintal(unit) {
  const normalized = String(unit || "").toLowerCase().replace(/\s+/g, "");
  const rupees = /₹|rs\.?|inr|rupee/.test(normalized);
  const quintal = /quintal|qtl|(^|[^a-z])qt([^a-z]|$)/.test(normalized);
  return rupees && quintal;
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
  const net = gross - costs;
  netResult.textContent = money(net);
  grossResult.textContent = "Gross amount " + money(gross) + " − entered costs " + money(costs) +
    (net < 0 ? " · Costs exceed gross revenue." : "");
}

function selectRecord(record) {
  if (!isRupeesPerQuintal(record.source_unit)) {
    statusNode.textContent = "This record uses “" + (record.source_unit || "an unspecified unit") +
      "”. The calculator requires a source unit explicitly reported as ₹ per quintal.";
    return;
  }
  priceInput.value = String(record.modal_price);
  costInput.value = "0";
  updateCalculator();
  document.querySelector("#calculatorTitle").scrollIntoView({ behavior: "smooth", block: "center" });
}

function updateMarketEstimates() {
  const quantity = Number(quantityInput.value);
  rowsNode.querySelectorAll(".market-cost").forEach((input) => {
    const index = Number(input.dataset.index);
    const record = comparedMarkets[index];
    const target = document.querySelector("#market-net-" + index);
    const costs = Number(input.value);
    if (!record || !isRupeesPerQuintal(record.source_unit) ||
        !Number.isFinite(quantity) || quantity <= 0 || !validNumber(costs)) {
      target.textContent = "Not comparable";
      return;
    }
    target.textContent = money(quantity * record.modal_price - costs);
  });
}

function renderComparison(records, meta, commodity, isPartial) {
  const latestByMarket = new Map();
  for (const record of records) {
    if (record.modal_price === null || record.modal_price === undefined) continue;
    const key = [record.market, record.source_unit].join("|");
    const previous = latestByMarket.get(key);
    if (!previous || String(record.arrival_date) > String(previous.arrival_date)) {
      latestByMarket.set(key, record);
    }
  }
  comparedMarkets = [...latestByMarket.values()].sort((a, b) => {
    if (a.source_unit !== b.source_unit) return String(a.source_unit).localeCompare(String(b.source_unit));
    return b.modal_price - a.modal_price;
  });
  rowsNode.replaceChildren();

  for (const [index, record] of comparedMarkets.entries()) {
    const tr = document.createElement("tr");
    const calculatorAllowed = isRupeesPerQuintal(record.source_unit);
    const market = escapeHtml(record.market);
    const district = escapeHtml(record.district);
    const state = escapeHtml(record.state);
    const date = escapeHtml(record.arrival_date);
    const unit = escapeHtml(record.source_unit || "Not provided by source");
    tr.innerHTML =
      "<td><strong>" + market + "</strong><small>" + district + ", " + state + "</small></td>" +
      "<td>" + date + "</td>" +
      "<td><strong>" + money(record.modal_price) + "</strong><small>" + unit + "</small></td>" +
      '<td><label class="sr-only" for="market-cost-' + index + '">Costs for ' + market +
      '</label><input class="market-cost" id="market-cost-' + index +
      '" type="number" min="0" step="0.01" value="0" data-index="' + index +
      '" aria-label="Transport and handling cost for ' + market + ' in rupees"></td>' +
      '<td><strong id="market-net-' + index + '">—</strong><button class="use-record" type="button" data-index="' +
      index + '"' + (calculatorAllowed ? "" : " disabled") + ">Use in calculator</button></td>";
    rowsNode.append(tr);
  }

  rowsNode.querySelectorAll(".market-cost").forEach((input) => input.addEventListener("input", updateMarketEstimates));
  rowsNode.querySelectorAll(".use-record").forEach((button) => button.addEventListener("click", () => {
    selectRecord(comparedMarkets[Number(button.dataset.index)]);
  }));
  resultsPanel.hidden = false;

  const fetchedAt = meta?.fetchedAt ? new Date(meta.fetchedAt).toLocaleString() : "not supplied";
  sourceSummary.textContent = "Source: " + (meta?.source || "Government of India OGD / AGMARKNET") +
    " · fetched: " + fetchedAt + " · records scanned: " + records.length;

  if (!comparedMarkets.length) {
    noteNode.textContent = "No records with a reported modal price were returned for " + commodity + ". Try another crop or state.";
  } else {
    const distinctUnits = new Set(comparedMarkets.map((record) => record.source_unit));
    noteNode.textContent = distinctUnits.size > 1
      ? "Records contain different source-reported units. They are shown separately; do not compare their price values directly."
      : "Showing the latest returned observation per mandi for " + commodity +
        ". Select “Use in calculator” only when the source unit is explicitly ₹ per quintal.";
  }
  if (isPartial) {
    noteNode.textContent += " The source pagination boundary was reached; this is a partial comparison, not a complete state-wide ranking.";
  }
  updateMarketEstimates();
}

async function fetchAllPages(state, commodity) {
  const pageSize = 100;
  const maxPages = 5;
  const allRecords = [];
  let meta = {};
  let offset = 0;
  let partial = false;
  let pagesFetched = 0;

  for (let page = 0; page < maxPages; page += 1) {
    const params = new URLSearchParams({
      state, commodity, limit: String(pageSize), offset: String(offset), sort: "date_desc",
    });
    const response = await fetch(API_BASE + "/prices?" + params, {
      headers: { Accept: "application/json" },
    });
    const payload = await response.json();
    if (!response.ok || payload.success !== true || !Array.isArray(payload.data)) {
      throw new Error(payload.error?.message || "The government price service could not return records.");
    }
    allRecords.push(...payload.data);
    pagesFetched += 1;
    meta = payload.meta || {};
    if (!meta.hasNext) {
      partial = Boolean(meta.truncated || meta.upstreamHasNext);
      return { records: allRecords, meta, partial, pagesFetched };
    }
    if (!Number.isInteger(meta.nextOffset) || meta.nextOffset <= offset) {
      partial = true;
      break;
    }
    offset = meta.nextOffset;
    if (page === maxPages - 1) partial = true;
  }
  return { records: allRecords, meta, partial, pagesFetched };
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
    const result = await fetchAllPages(state, commodity);
    renderComparison(result.records, result.meta, commodity, result.partial);
    statusNode.textContent = result.records.length
      ? "Loaded " + result.records.length + " records from " +
        (Math.ceil(result.records.length / 100) || 1) + " source page(s)." +
        (result.partial ? " More records may exist; this comparison is limited to the first 500 records." : "")
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
for (const input of [quantityInput, priceInput, costInput]) {
  input.addEventListener("input", updateCalculator);
}
quantityInput.addEventListener("input", updateMarketEstimates);


const assistantForm = document.querySelector("#assistantForm");
const assistantQuestion = document.querySelector("#assistantQuestion");
const assistantAnswer = document.querySelector("#assistantAnswer");

function answerFromCurrentEvidence(question) {
  if (!comparedMarkets.length) {
    return "Search for a crop first. I can only answer from mandi records currently loaded on this page.";
  }
  const quantity = Number(quantityInput.value);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return "Enter a valid quantity in quintals before comparing estimated net proceeds.";
  }
  const comparable = comparedMarkets
    .map((record, index) => {
      const costInputForMarket = rowsNode.querySelector('.market-cost[data-index="' + index + '"]');
      const costs = Number(costInputForMarket?.value ?? 0);
      if (!isRupeesPerQuintal(record.source_unit) || !validNumber(costs)) return null;
      return {
        record,
        costs,
        gross: quantity * record.modal_price,
        net: quantity * record.modal_price - costs,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.net - a.net);

  if (!comparable.length) {
    return "No loaded record has a verified ₹ per quintal unit and valid cost input. I cannot compare these units safely.";
  }
  const q = question.toLowerCase();
  if (!/(best|highest|top|which|net|profit|compare|why|कौन|सबसे|बेहतर|ज़्यादा|ज्यादा|मुनाफ़ा|लाभ)/i.test(q)) {
    return "I can answer which comparable mandi has the highest estimated net proceeds and explain the inputs. I cannot answer forecasts, guaranteed sale prices or unsupported crop advice.";
  }
  const best = comparable[0];
  const tied = comparable.filter((item) => item.net === best.net);
  const record = best.record;
  const title = tied.length > 1 ? "The highest estimated net proceeds are tied across " + tied.length + " mandis." :
    "Among the loaded comparable records, " + record.market + " has the highest estimated net proceeds.";
  return title + " Calculation: " + quantity + " quintal × " + money(record.modal_price) +
    " per quintal = " + money(best.gross) + " gross; entered market costs = " + money(best.costs) +
    "; estimated net = " + money(best.net) + ". Source arrival date: " + record.arrival_date +
    ". This is based on a government-reported observation, not a live offer. It covers only the records loaded here and excludes costs or quality deductions you have not entered.";
}

if (assistantForm) {
  assistantForm.addEventListener("submit", (event) => {
    event.preventDefault();
    assistantAnswer.textContent = answerFromCurrentEvidence(assistantQuestion.value.trim());
  });
}
