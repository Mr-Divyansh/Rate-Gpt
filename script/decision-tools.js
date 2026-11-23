import { getLocale, onLangChange, t } from "./i18n.js";
import { createFarmerDashboardStore } from "./farmer-dashboard-store.js";
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
const priceAlertStatus = document.querySelector("#priceAlertStatus");
const quantityInput = document.querySelector("#quantityInput");
const priceInput = document.querySelector("#priceInput");
const transportCostInput = document.querySelector("#transportCostInput");
const handlingCostInput = document.querySelector("#handlingCostInput");
const costInput = document.querySelector("#costInput");
const netResult = document.querySelector("#netResult");
const grossResult = document.querySelector("#grossResult");
const breakEvenResult = document.querySelector("#breakEvenResult");
let comparedMarkets = [];
let selectedRecord = null;
let lastRenderData = null;
let lastSearchState = null;
const copy = (en, hi) => getLocale() === "hi-IN" ? hi : en;
let dashboardStore = null;
try { dashboardStore = createFarmerDashboardStore(window.localStorage); } catch { /* saving stays optional */ }

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
  grossResult.textContent = copy("Gross ", "कुल रकम ") + money(estimate.gross) + copy(" − transport ", " − ढुलाई ") + money(transport) +
    copy(" − loading/unloading ", " − लोडिंग/अनलोडिंग ") + money(handling) + copy(" − other costs ", " − अन्य खर्च ") + money(other);
  breakEvenResult.textContent = t("decision.breakEven", { price: money(estimate.breakEvenPrice) }) +
    (estimate.net < 0 ? " " + (getLocale() === "hi-IN" ? "दर्ज खर्च सकल रकम से अधिक है।" : copy(copy("Entered costs exceed gross revenue.", "दर्ज खर्च कुल रकम से अधिक है।"), "दर्ज खर्च कुल रकम से अधिक है।")) : "");
}

function selectRecord(record) {
  if (!isRupeesPerQuintal(record.source_unit)) {
    statusNode.textContent = t("decision.unitRequired", { unit: record.source_unit || (getLocale() === "hi-IN" ? "अज्ञात इकाई" : "an unspecified unit") });
    return;
  }
  selectedRecord = record;
  priceInput.value = String(record.modal_price);
  transportCostInput.value = "0";
  handlingCostInput.value = "0";
  costInput.value = "0";
  updateCalculator();
  document.querySelector("#calculatorTitle").scrollIntoView({ behavior: "smooth", block: "center" });
}

function checkLocalPriceAlerts(records) {
  if (!priceAlertStatus || !dashboardStore) return;
  const state = stateInput.value.trim().toLowerCase();
  const commodity = cropInput.value.trim().toLowerCase();
  const alerts = dashboardStore.list().alerts.filter((alert) =>
    alert.state.toLowerCase() === state &&
    alert.commodity.toLowerCase() === commodity &&
    (!alert.district || alert.district.toLowerCase() === districtInput.value.trim().toLowerCase()) &&
    (!alert.market || alert.market.toLowerCase() === marketInput.value.trim().toLowerCase())
  );
  const matches = [];
  for (const alert of alerts) {
    const record = records.find((item) =>
      String(item.state || "").toLowerCase() === state &&
      (!alert.district || String(item.district || "").toLowerCase() === alert.district.toLowerCase()) &&
      (!alert.market || String(item.market || "").toLowerCase() === alert.market.toLowerCase()) &&
      isRupeesPerQuintal(item.source_unit) &&
      (alert.direction === "above" ? Number(item.modal_price) >= alert.targetPrice : Number(item.modal_price) <= alert.targetPrice)
    );
    if (record) {
      matches.push(t("decision.alertMatched", {
        market: record.market,
        condition: alert.direction === "above"
          ? (getLocale() === "hi-IN" ? "लक्ष्य के बराबर या ऊपर" : "at or above target")
          : (getLocale() === "hi-IN" ? "लक्ष्य के बराबर या नीचे" : "at or below target"),
        target: new Intl.NumberFormat(getLocale()).format(alert.targetPrice),
        price: new Intl.NumberFormat(getLocale()).format(record.modal_price),
      }));
    }
  }
  priceAlertStatus.textContent = matches.length ? matches.join(" ") :
    (alerts.length ? t("decision.alertNoMatch") : "");
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
      target.textContent = copy(copy("Not comparable", "तुलना संभव नहीं"), "तुलना संभव नहीं");
      return;
    }
    const estimate = calculateNetProceeds({ quantity, modalPrice: record.modal_price, otherCosts: costs });
    target.textContent = estimate ? money(estimate.net) : copy("Not comparable", "तुलना संभव नहीं");
  });
}

function renderComparison(records, meta, commodity, isPartial) {
  lastRenderData = { records, meta, commodity, isPartial };
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
    const unit = escapeHtml(record.source_unit || copy("Not provided by source", "स्रोत ने इकाई नहीं बताई"));
    tr.innerHTML =
      "<td><strong>" + market + "</strong><small>" + district + ", " + state + "</small></td>" +
      "<td>" + date + "</td>" +
      "<td><strong>" + money(record.modal_price) + "</strong><small>" + unit + "</small></td>" +
      '<td><label class="sr-only" for="market-cost-' + index + '">Costs for ' + market +
      '</label><input class="market-cost" id="market-cost-' + index +
      '" type="number" min="0" step="0.01" value="0" data-index="' + index +
      '" aria-label="Transport and handling cost for ' + market + ' in rupees"></td>' +
      '<td><strong id="market-net-' + index + '">—</strong><button class="use-record" type="button" data-index="' +
      index + '"' + (calculatorAllowed ? "" : " disabled") + ">' + copy("Use in calculator", "कैलकुलेटर में इस्तेमाल करें") + '</button></td>";
    rowsNode.append(tr);
  }

  rowsNode.querySelectorAll(".market-cost").forEach((input) => input.addEventListener("input", updateMarketEstimates));
  rowsNode.querySelectorAll(".use-record").forEach((button) => button.addEventListener("click", () => {
    selectRecord(comparedMarkets[Number(button.dataset.index)]);
  }));
  resultsPanel.hidden = false;

  const fetchedAt = meta?.fetchedAt ? new Date(meta.fetchedAt).toLocaleString(getLocale()) : copy("not supplied", "उपलब्ध नहीं");
  sourceSummary.textContent = copy("Source: ", "स्रोत: ") + (meta?.source || "Government of India OGD / AGMARKNET") +
    copy(" · fetched: ", " · प्राप्ति समय: ") + fetchedAt + copy(" · records scanned: ", " · जाँचे गए रिकॉर्ड: ") + records.length;

  if (!comparedMarkets.length) {
    noteNode.textContent = t("decision.noRecords");
  } else {
    const distinctUnits = new Set(comparedMarkets.map((record) => record.source_unit));
    noteNode.textContent = distinctUnits.size > 1
      ? (getLocale() === "hi-IN" ? "रिकॉर्ड में स्रोत की अलग-अलग इकाइयाँ हैं। इन्हें अलग दिखाया गया है; इनके भावों की सीधी तुलना न करें।" : "Records contain different source-reported units. They are shown separately; do not compare their price values directly.")
      : (getLocale() === "hi-IN" ? commodity + " के लिए हर मंडी का मिला हुआ सबसे नया रिकॉर्ड दिख रहा है। कैलकुलेटर में वही रिकॉर्ड चुनें जिसकी इकाई स्पष्ट रूप से ₹ प्रति क्विंटल है।" : "Showing the latest returned observation per mandi for " + commodity + ". Select “Use in calculator” only when the source unit is explicitly ₹ per quintal.");
  }
  if (isPartial) {
    noteNode.textContent += copy(" The source pagination boundary was reached; this is a partial comparison, not a complete state-wide ranking.", " स्रोत की पेज सीमा पूरी हो गई; यह आंशिक तुलना है, पूरे राज्य की पूरी रैंकिंग नहीं।");
  }
  updateMarketEstimates();
  checkLocalPriceAlerts(comparedMarkets);
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
  selectedRecord = null;
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
onLangChange(() => {
  if (lastRenderData) renderComparison(lastRenderData.records, lastRenderData.meta, lastRenderData.commodity, lastRenderData.isPartial);
  updateCalculator();
  if (assistantQuestion?.value.trim()) assistantAnswer.textContent = answerFromCurrentEvidence(assistantQuestion.value.trim());
  if (lastSearchState?.type === "loaded" || lastSearchState?.type === "empty") {
    const result = lastSearchState.result;
    statusNode.textContent = result.records.length
      ? copy("Loaded " + result.records.length + " records from " + result.pagesFetched + " source page(s)." + (result.partial ? " More records may exist; this comparison is limited to the first 500 records." : ""), result.records.length + " रिकॉर्ड " + result.pagesFetched + " स्रोत पेज से मिले।" + (result.partial ? " और रिकॉर्ड हो सकते हैं; यह तुलना पहले 500 रिकॉर्ड तक सीमित है।" : ""))
      : copy("The government source returned no records for this selection.", "सरकारी स्रोत से इस चयन के लिए कोई रिकॉर्ड नहीं मिला।");
  }
});
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


const saveFavoriteButton = document.querySelector("#saveFavoriteButton");
if (saveFavoriteButton) {
  saveFavoriteButton.addEventListener("click", () => {
    if (!dashboardStore) {
      statusNode.textContent = t("decision.storageUnavailable");
      return;
    }
    try {
      const saved = dashboardStore.saveFavorite({
        state: stateInput.value,
        commodity: cropInput.value,
        district: districtInput.value,
        market: marketInput.value,
      });
      statusNode.textContent = saved ? t("decision.favoriteSaved") : t("decision.favoriteInvalid");
    } catch {
      statusNode.textContent = t("decision.storageUnavailable");
    }
  });
}

const saveScenarioButton = document.querySelector("#saveScenarioButton");
if (saveScenarioButton) {
  saveScenarioButton.addEventListener("click", () => {
    if (!dashboardStore) {
      statusNode.textContent = t("decision.storageUnavailable");
      return;
    }
    const transport = Number(transportCostInput.value);
    const handling = Number(handlingCostInput.value);
    const other = Number(costInput.value);
    const estimate = calculateNetProceeds({
      quantity: Number(quantityInput.value),
      modalPrice: Number(priceInput.value),
      transportCost: transport,
      handlingCost: handling,
      otherCosts: other,
    });
    if (!estimate) {
      statusNode.textContent = t("decision.scenarioInvalid");
      return;
    }
    const sourceStillSelected = selectedRecord &&
      Number(priceInput.value) === Number(selectedRecord.modal_price);
    try {
      dashboardStore.saveScenario({
        state: stateInput.value,
        commodity: cropInput.value,
        market: sourceStillSelected ? selectedRecord.market : "",
        sourceDate: sourceStillSelected ? selectedRecord.arrival_date : "",
        quantity: Number(quantityInput.value),
        modalPrice: Number(priceInput.value),
        transportCost: transport,
        handlingCost: handling,
        otherCosts: other,
      });
      statusNode.textContent = t("decision.scenarioSaved");
    } catch {
      statusNode.textContent = t("decision.storageUnavailable");
    }
  });
}
