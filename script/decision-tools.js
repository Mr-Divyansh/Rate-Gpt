import { getLocale, t } from "./i18n.js";
import { calculateNetProceeds, isRupeesPerQuintal } from "./decision-tools-core.js";
const API_BASE = document.querySelector('meta[name="api-base"]')?.content || "/api/v1";
const form = document.querySelector("#decisionSearch");
const stateInput = document.querySelector("#stateInput");
const cropInput = document.querySelector("#cropInput");
const districtInput = document.querySelector("#districtInput");
const marketInput = document.querySelector("#marketInput");
const searchButton = document.querySelector("#searchButton");
const statusNode = document.querySelector("#searchStatus");
const errorNode = document.querySelector("#searchError");
const resultsPanel = document.querySelector("#resultsPanel");
const rowsNode = document.querySelector("#comparisonRows");
const noteNode = document.querySelector("#decisionNote");
const sourceSummary = document.querySelector("#sourceSummary");
const quantityInput = document.querySelector("#quantityInput");
const priceInput = document.querySelector("#priceInput");
const transportCostInput = document.querySelector("#transportCostInput");
const handlingCostInput = document.querySelector("#handlingCostInput");
const costInput = document.querySelector("#costInput");
const netResult = document.querySelector("#netResult");
const grossResult = document.querySelector("#grossResult");
const breakEvenResult = document.querySelector("#breakEvenResult");
let comparedMarkets = [];

const money = (value) => new Intl.NumberFormat(getLocale(), {
  style: "currency", currency: "INR", maximumFractionDigits: 2,
}).format(value);
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));
const validNumber = (value) => Number.isFinite(value) && value >= 0;

function updateCalculator() {
  const quantity = Number(quantityInput.value);
  const price = Number(priceInput.value);
  const transport = Number(transportCostInput.value);
  const handling = Number(handlingCostInput.value);
  const other = Number(costInput.value);
  const estimate = calculateNetProceeds({
    quantity, modalPrice: price, transportCost: transport, handlingCost: handling, otherCosts: other,
  });
  if (!estimate) {
    netResult.textContent = "—";
    grossResult.textContent = t("decision.invalidCalc");
    breakEvenResult.textContent = "";
    return;
  }
  netResult.textContent = money(estimate.net);
  grossResult.textContent = "Gross " + money(estimate.gross) + " − transport " + money(transport) +
    " − loading/unloading " + money(handling) + " − other costs " + money(other);
  breakEvenResult.textContent = t("decision.breakEven", { price: money(estimate.breakEvenPrice) }) +
    (estimate.net < 0 ? " " + (getLocale() === "hi-IN" ? "दर्ज खर्च सकल रकम से अधिक है।" : "Entered costs exceed gross revenue.") : "");
}

function selectRecord(record) {
  if (!isRupeesPerQuintal(record.source_unit)) {
    statusNode.textContent = t("decision.unitRequired", { unit: record.source_unit || (getLocale() === "hi-IN" ? "अज्ञात इकाई" : "an unspecified unit") });
    return;
  }
  priceInput.value = String(record.modal_price);
  transportCostInput.value = "0";
  handlingCostInput.value = "0";
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
    const estimate = calculateNetProceeds({ quantity, modalPrice: record.modal_price, otherCosts: costs });
    target.textContent = estimate ? money(estimate.net) : "Not comparable";
  });
}

function renderComparison(records, meta, commodity, isPartial) {
  const latestByMarket = new Map();
  for (const record of records) {
    if (record.modal_price === null || record.modal_price === undefined) continue;
    const key = [record.state, record.district, record.market, record.source_unit].join("|");
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
    noteNode.textContent = t("decision.noRecords");
  } else {
    const distinctUnits = new Set(comparedMarkets.map((record) => record.source_unit));
    noteNode.textContent = distinctUnits.size > 1
      ? (getLocale() === "hi-IN" ? "रिकॉर्ड में स्रोत की अलग-अलग इकाइयाँ हैं। इन्हें अलग दिखाया गया है; इनके भावों की सीधी तुलना न करें।" : "Records contain different source-reported units. They are shown separately; do not compare their price values directly.")
      : (getLocale() === "hi-IN" ? commodity + " के लिए हर मंडी का मिला हुआ सबसे नया रिकॉर्ड दिख रहा है। कैलकुलेटर में वही रिकॉर्ड चुनें जिसकी इकाई स्पष्ट रूप से ₹ प्रति क्विंटल है।" : "Showing the latest returned observation per mandi for " + commodity + ". Select “Use in calculator” only when the source unit is explicitly ₹ per quintal.");
  }
  if (isPartial) {
    noteNode.textContent += " The source pagination boundary was reached; this is a partial comparison, not a complete state-wide ranking.";
  }
  updateMarketEstimates();
}

async function fetchAllPages(state, commodity, district, market) {
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
    if (district) params.set("district", district);
    if (market) params.set("market", market);
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
  const district = districtInput.value.trim();
  const market = marketInput.value.trim();
  errorNode.hidden = true;
  resultsPanel.hidden = true;
  if (!state || !commodity) {
    errorNode.textContent = t("decision.enterBoth");
    errorNode.hidden = false;
    return;
  }

  searchButton.disabled = true;
  statusNode.textContent = t("decision.fetching");
  try {
    const result = await fetchAllPages(state, commodity, district, market);
    renderComparison(result.records, result.meta, commodity, result.partial);
    statusNode.textContent = result.records.length
      ? "Loaded " + result.records.length + " records from " +
        result.pagesFetched + " source page(s)." +
        (result.partial ? " More records may exist; this comparison is limited to the first 500 records." : "")
      : "The government source returned no records for this selection.";
  } catch (error) {
    errorNode.textContent = error instanceof Error ? error.message : "Unexpected error while loading records.";
    errorNode.hidden = false;
    statusNode.textContent = t("decision.failed");
  } finally {
    searchButton.disabled = false;
  }
}

form.addEventListener("submit", (event) => { event.preventDefault(); void search(); });
for (const input of [quantityInput, priceInput, transportCostInput, handlingCostInput, costInput]) {
  input.addEventListener("input", updateCalculator);
}
quantityInput.addEventListener("input", updateMarketEstimates);


const assistantForm = document.querySelector("#assistantForm");
const assistantQuestion = document.querySelector("#assistantQuestion");
const assistantAnswer = document.querySelector("#assistantAnswer");

function answerFromCurrentEvidence(question) {
  if (!comparedMarkets.length) {
    return t("decision.assistantNeedSearch");
  }
  const quantity = Number(quantityInput.value);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return t("decision.assistantNeedQuantity");
  }
  const comparable = comparedMarkets
    .map((record, index) => {
      const costInputForMarket = rowsNode.querySelector('.market-cost[data-index="' + index + '"]');
      const costs = Number(costInputForMarket?.value ?? 0);
      if (!isRupeesPerQuintal(record.source_unit) || !validNumber(costs)) return null;
      return {
        record,
        costs,
        ...calculateNetProceeds({ quantity, modalPrice: record.modal_price, otherCosts: costs }),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.net - a.net);

  if (!comparable.length) {
    return t("decision.noComparable");
  }
  const q = question.toLowerCase();
  if (!/(best|highest|top|which|net|profit|compare|why|कौन|सबसे|बेहतर|ज़्यादा|ज्यादा|मुनाफ़ा|लाभ)/i.test(q)) {
    return t("decision.assistantUnsupported");
  }
  const best = comparable[0];
  const tied = comparable.filter((item) => item.net === best.net);
  const record = best.record;
  const title = tied.length > 1 ? t("decision.assistantTied", { count: tied.length }) :
    t("decision.assistantHighest", { market: record.market });
  return title + " " + t("decision.assistantCalculation", {
    quantity,
    price: money(record.modal_price),
    gross: money(best.gross),
    costs: money(best.costs),
    net: money(best.net),
    date: record.arrival_date,
  });
}

if (assistantForm) {
  assistantForm.addEventListener("submit", (event) => {
    event.preventDefault();
    assistantAnswer.textContent = answerFromCurrentEvidence(assistantQuestion.value.trim());
  });
}


const voiceCropButton = document.querySelector("#voiceCropButton");
if (voiceCropButton) {
  voiceCropButton.addEventListener("click", () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      statusNode.textContent = t("decision.voiceUnsupported");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = getLocale();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    voiceCropButton.disabled = true;
    statusNode.textContent = t("decision.voiceListening");
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (transcript) {
        cropInput.value = transcript;
        statusNode.textContent = t("decision.voiceConfirm", { crop: transcript });
      } else {
        statusNode.textContent = t("decision.voiceError");
      }
    };
    recognition.onerror = () => {
      statusNode.textContent = t("decision.voiceError");
    };
    recognition.onend = () => {
      voiceCropButton.disabled = false;
    };
    try {
      // The browser asks for microphone permission only after this explicit click.
      recognition.start();
    } catch {
      voiceCropButton.disabled = false;
      statusNode.textContent = t("decision.voiceError");
    }
  });
}
