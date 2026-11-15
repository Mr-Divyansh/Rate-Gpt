// @ts-nocheck
import { t, tCount, onLangChange } from "./i18n.js";
// auto-refresh test
import { hydrateIcons, icon } from "./icons.js";
import {
  fetchFilters, fetchPrices, fetchSyncStatus,
  loadLocation, saveLocation, loadRecent, pushRecent,
} from "./api.js";
import {
  axisFor, spreadAxis, cropNames, createDelta, createRange,
  formatDate, formatDateTime, formatPrice,
} from "./rate-ui.js";
import { buildPreviousObservationIndex } from "./price-comparison.js";
import {
  createCsvFilename, fetchAllMatchingRecords, recordsToCsv,
} from "./csv-export.js";

const PAGE_SIZE = 50;
const $ = (id) => document.getElementById(id);

function indiaTodayIsoDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

const state = {
  states: [], districts: [], markets: [],
  location: { state: "", district: "" },
  market: "",
  allIndia: false,
  arrivalDate: "",
  records: [],
  meta: {
    limit: PAGE_SIZE, offset: 0, nextOffset: 0, total: 0,
    hasNext: false, upstreamHasNext: false, truncated: false,
  },
  pageOffsets: [0],
  sort: "date_desc",
  priceUnit: "quintal",
  loading: false,
  error: "",
  finderError: "",
  filterCoverage: null,
  controller: null,
  exportController: null,
  exporting: false,
  exportStatus: null,
  sync: null,
  lastFetchedAt: null,
  upstreamUpdatedAt: null,
};
let navToken = 0; // guards async state → district → mandi chains against fast re-selection

const errorText = (e, fallback) => (e instanceof Error ? e.message : fallback);

/* ============================ finder ============================ */
function fill(select, values, placeholder, selected = "") {
  select.replaceChildren(new Option(placeholder, ""));
  for (const value of values) select.add(new Option(value, value));
  select.value = values.includes(selected) ? selected : "";
}

function chip(label, { pressed = false, sub = "", onClick }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "chip";
  button.setAttribute("aria-pressed", String(pressed));
  if (pressed) button.append(icon("check", 16));
  const text = document.createElement("span");
  text.textContent = label;
  button.append(text);
  if (sub) {
    const small = document.createElement("small");
    small.textContent = sub;
    button.append(small);
  }
  button.addEventListener("click", onClick);
  return button;
}

function renderMandis() {
  const grid = $("mandiGrid");
  const help = $("mandiHelp");
  $("indiaBrowse").textContent = t(
    state.allIndia ? "finder.browsingIndia" : "finder.browseIndia",
  );
  $("indiaBrowse").setAttribute("aria-pressed", String(state.allIndia));
  grid.replaceChildren();
  const { state: s, district } = state.location;
  if (state.finderError) {
    help.textContent = state.finderError;
    return;
  }
  if (!s || !district) {
    help.textContent = t("finder.pick");
    return;
  }
  if (state.markets.length === 0) {
    help.textContent = state.filterCoverage?.status === "partial"
      ? t("finder.partialEmpty", {
          records: state.filterCoverage.recordsScanned.toLocaleString("en-IN"),
          maxOffset: state.filterCoverage.maxOffset.toLocaleString("en-IN"),
        })
      : t("finder.none");
    return;
  }
  const coverageNote = state.filterCoverage?.status === "partial"
    ? ` · ${t("finder.partial", {
        records: state.filterCoverage.recordsScanned.toLocaleString("en-IN"),
        maxOffset: state.filterCoverage.maxOffset.toLocaleString("en-IN"),
      })}`
    : "";
  help.textContent = `${t("finder.mandis", { district })} · ${tCount("finder.count", state.markets.length)}${coverageNote}`;
  for (const market of state.markets) {
    grid.append(
      chip(market, { pressed: state.market === market, onClick: () => selectMandi(market) }),
    );
  }
}

function renderRecent() {
  const wrap = $("recentWrap");
  const list = $("recentList");
  const items = loadRecent().filter(
    (r) =>
      !(r.state === state.location.state && r.district === state.location.district && r.market === state.market),
  );
  list.replaceChildren(
    ...items.map((r) =>
      chip(r.market, {
        sub: `${r.district}, ${r.state}`,
        onClick: () => chooseState(r.state, { district: r.district, market: r.market }),
      }),
    ),
  );
  wrap.hidden = items.length === 0;
}

function renderFinder() {
  const stateSelect = $("stateSelect");
  const districtSelect = $("districtSelect");
  fill(stateSelect, state.states, t("field.statePh"), state.location.state);
  fill(districtSelect, state.districts, t("field.districtPh"), state.location.district);
  stateSelect.disabled = state.states.length === 0;
  districtSelect.disabled = !state.location.state || state.districts.length === 0;
  renderMandis();
  renderRecent();
}

async function chooseState(name, { district = "", market = "" } = {}) {
  const token = ++navToken;
  state.allIndia = false;
  state.location = { state: name, district: "" };
  state.districts = [];
  state.markets = [];
  state.market = "";
  state.finderError = "";
  state.filterCoverage = null;
  clearResults();
  renderFinder();
  if (!name) return;
  try {
    const data = await fetchFilters({ state: name });
    if (token !== navToken) return;
    state.districts = data.districts;
    state.filterCoverage = data.coverage ?? null;
  } catch (error) {
    if (token !== navToken) return;
    state.finderError = t("finder.fail", { reason: errorText(error, "") });
    renderFinder();
    return;
  }
  renderFinder();
  if (district && state.districts.includes(district)) {
    await chooseDistrict(district, { market });
  }
}

async function chooseDistrict(name, { market = "" } = {}) {
  const token = ++navToken;
  state.allIndia = false;
  state.location.district = name;
  state.markets = [];
  state.market = "";
  state.finderError = "";
  state.filterCoverage = null;
  clearResults();
  renderFinder();
  if (!name) return;
  try {
    const data = await fetchFilters({ state: state.location.state, district: name });
    if (token !== navToken) return;
    state.markets = data.markets;
    state.filterCoverage = data.coverage ?? null;
  } catch (error) {
    if (token !== navToken) return;
    state.finderError = t("finder.fail", { reason: errorText(error, "") });
    renderFinder();
    return;
  }
  renderFinder();
  const target =
    market && state.markets.includes(market)
      ? market
      : state.markets.length === 1
        ? state.markets[0]
        : "";
  if (target) selectMandi(target);
}

function selectMandi(market) {
  state.allIndia = false;
  state.market = market;
  const entry = { ...state.location, market };
  saveLocation(entry);
  pushRecent(entry);
  history.replaceState(null, "", `?${new URLSearchParams(entry)}`);
  renderMandis();
  renderRecent();
  loadPrices();
}

function toggleIndiaBrowse() {
  if (state.loading || state.exporting) return;
  state.allIndia = !state.allIndia;
  state.market = "";
  state.location = { state: "", district: "" };
  state.districts = [];
  state.markets = [];
  state.finderError = "";
  if (state.allIndia) {
    $("cropSearch").value = "";
    $("arrivalDate").value = "";
    state.arrivalDate = "";
    $("sortFilter").value = "date_desc";
    state.sort = "date_desc";
  }
  clearResults();
  renderFinder();
  if (state.allIndia) {
    history.replaceState(null, "", `${location.pathname}?scope=india`);
    loadPrices();
  }
}

/* ============================ results ============================ */
function resetResultState() {
  state.controller?.abort();
  state.records = [];
  state.meta = {
    limit: PAGE_SIZE, offset: 0, nextOffset: 0, total: 0,
    hasNext: false, upstreamHasNext: false, truncated: false,
  };
  state.pageOffsets = [0];
  state.error = "";
  state.loading = false;
}

function clearResults() {
  resetResultState();
  history.replaceState(null, "", location.pathname);
  updateControls();
  renderResults();
}

function updateControls() {
  const locked = state.loading || state.exporting;
  const on = Boolean(state.market || state.allIndia) && !locked;
  $("stateSelect").disabled = state.exporting || state.states.length === 0;
  $("districtSelect").disabled = state.exporting || !state.location.state || state.districts.length === 0;
  $("cropSearch").disabled = !(state.market || state.allIndia) || state.exporting;
  $("arrivalDate").disabled = !(state.market || state.allIndia) || state.exporting;
  $("sortFilter").disabled = !on;
  $("clearFilters").disabled = !on;
  $("indiaBrowse").disabled = locked;
  $("indiaBrowse").setAttribute("aria-pressed", String(state.allIndia));
  $("indiaBrowse").textContent = t(
    state.allIndia ? "finder.browsingIndia" : "finder.browseIndia",
  );
  $("exportCsv").disabled = !(state.market || state.allIndia) || (state.loading && !state.exporting);
  $("refreshPrices").disabled = !state.market && !state.allIndia;
  $("exportCsv").textContent = t(state.exporting ? "results.exportCancel" : "results.export");
  $("exportStatus").textContent = state.exportStatus
    ? t(state.exportStatus.key, state.exportStatus.vars)
    : "";
}

function buildContext(records) {
  const keyOf = (r) => [
    r.state, r.district, r.market, r.commodity, r.variety ?? "", r.grade ?? "", r.source_unit,
  ].map((value) => String(value ?? "").trim().toLocaleLowerCase()).join("|");
  const groups = new Map();
  for (const r of records) {
    if (!groups.has(keyOf(r))) groups.set(keyOf(r), []);
    groups.get(keyOf(r)).push(r);
  }
  const previous = buildPreviousObservationIndex(records);
  return {
    axis: (r) => {
      const list = groups.get(keyOf(r));
      return list.length > 1 ? axisFor(list) : spreadAxis(r);
    },
    previous,
  };
}

function cropBlock(record, showLocation = false) {
  const names = cropNames(record.commodity);
  const wrap = document.createElement("div");
  wrap.className = "crop-name";
  const strong = document.createElement("strong");
  strong.textContent = names.primary;
  wrap.append(strong);
  if (showLocation) {
    const locationLabel = document.createElement("small");
    locationLabel.className = "record-location";
    locationLabel.textContent = [record.market, record.district, record.state]
      .filter(Boolean)
      .join(" · ");
    wrap.append(locationLabel);
  }
  const second = [
    names.secondary,
    typeof record.variety === "string" ? record.variety.trim() : "",
    typeof record.grade === "string" ? record.grade.trim() : "",
    typeof record.display_unit === "string" && record.display_unit.trim()
      ? record.display_unit
      : typeof record.source_unit === "string" && record.source_unit.trim()
        ? record.source_unit
      : t("results.unitUnavailable"),
  ]
    .filter(Boolean)
    .join(" · ");
  if (second) {
    const small = document.createElement("small");
    small.textContent = second;
    wrap.append(small);
  }
  return wrap;
}

function modalBlock(record, tag = "div") {
  const wrap = document.createElement(tag);
  wrap.className = "modal-price";
  const strong = document.createElement("strong");
  strong.textContent = formatPrice(record.modal_price);
  wrap.append(strong);
  return wrap;
}

function tableRow(record, ctx, showLocation) {
  const tr = document.createElement("tr");
  const crop = document.createElement("td");
  crop.append(cropBlock(record, showLocation));
  const date = document.createElement("td");
  date.className = "date-cell";
  date.textContent = formatDate(record.arrival_date);
  const range = document.createElement("td");
  range.className = "range-cell";
  range.append(createRange(record, ctx.axis(record)));
  const modal = modalBlock(record, "td");
  const change = document.createElement("td");
  change.append(createDelta(record.modal_price, ctx.previous(record)?.modal_price));
  tr.append(crop, date, range, modal, change);
  return tr;
}

function cardFor(record, ctx, showLocation) {
  const card = document.createElement("article");
  card.className = "price-card";
  const top = document.createElement("div");
  top.className = "price-card-top";
  top.append(cropBlock(record, showLocation), modalBlock(record));
  const meta = document.createElement("div");
  meta.className = "price-card-meta";
  const date = document.createElement("span");
  date.textContent = formatDate(record.arrival_date);
  meta.append(date, createDelta(record.modal_price, ctx.previous(record)?.modal_price));
  card.append(top, createRange(record, ctx.axis(record)), meta);
  return card;
}

function messageRows(message, { actionLabel = "", onAction = null } = {}) {
  const tr = document.createElement("tr");
  const td = document.createElement("td");
  td.colSpan = 6;
  td.className = "state-cell";
  td.setAttribute("role", "status");
  const rowMessage = document.createElement("p");
  rowMessage.className = "state-message-text";
  rowMessage.textContent = message;
  td.append(rowMessage);
  tr.append(td);

  const card = document.createElement("div");
  card.className = "state-message";
  card.setAttribute("role", "status");
  const cardMessage = document.createElement("p");
  cardMessage.className = "state-message-text";
  cardMessage.textContent = message;
  card.append(cardMessage);

  if (actionLabel && typeof onAction === "function") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn";
    button.textContent = actionLabel;
    button.addEventListener("click", onAction);
    td.append(button);
    card.append(button.cloneNode(true));
    card.lastElementChild.addEventListener("click", onAction);
  }
  return { row: tr, card };
}

function skeletonRows() {
  const rows = [];
  const cards = [];
  for (let i = 0; i < 5; i += 1) {
    const tr = document.createElement("tr");
    for (let c = 0; c < 5; c += 1) {
      const td = document.createElement("td");
      const bar = document.createElement("div");
      bar.className = "skeleton";
      bar.style.height = "20px";
      bar.style.width = c === 2 ? "100%" : "70%";
      td.append(bar);
      tr.append(td);
    }
    rows.push(tr);
    const card = document.createElement("div");
    card.className = "price-card";
    const bar = document.createElement("div");
    bar.className = "skeleton";
    bar.style.height = "64px";
    card.append(bar);
    cards.push(card);
  }
  return { rows, cards };
}

function renderResults() {
  const body = $("priceTableBody");
  const list = $("mobilePriceList");
  $("pricesHeading").textContent = state.allIndia
    ? t("results.titleAllIndia")
    : state.market
      ? t("results.titleSet", { market: state.market })
      : t("results.titleNone");
  document.querySelector(".price-table caption").textContent = t(
    state.allIndia ? "results.captionAllIndia" : "results.caption",
  );

  const busy = state.loading && state.records.length === 0;
  const unitLabel = state.priceUnit === "kg" ? "₹ / KG" : "₹ / Quintal";
  const unitControl = $("priceUnit");
  if (unitControl) unitControl.value = state.priceUnit;
  let announcement = "";

  if (busy) {
    const { rows, cards } = skeletonRows();
    body.replaceChildren(...rows);
    list.replaceChildren(...cards);
    announcement = t("results.loading");
    $("resultCount").textContent = t("results.loading");
  } else if (!state.market && !state.allIndia) {
    const m = messageRows(t("results.pickMandi"));
    body.replaceChildren(m.row);
    list.replaceChildren(m.card);
    $("resultCount").textContent = "";
  } else if (state.records.length === 0 && state.error) {
    const message = t("results.unavailable");
    const m = messageRows(message);
    body.replaceChildren(m.row);
    list.replaceChildren(m.card);
    $("resultCount").textContent = "";
    announcement = message;
  } else if (state.records.length === 0) {
    const hasNarrowFilters = Boolean($("cropSearch").value.trim() || state.arrivalDate);
    const message = hasNarrowFilters
      ? t("results.noMatches")
      : t("results.none");
    const action = hasNarrowFilters
      ? { actionLabel: t("results.clearSearchFilters"), onAction: clearSearchAndDateFilters }
      : !state.allIndia
        ? { actionLabel: t("results.browseIndia"), onAction: toggleIndiaBrowse }
        : {};
    const m = messageRows(message, action);
    body.replaceChildren(m.row);
    list.replaceChildren(m.card);
    $("resultCount").textContent = tCount("results.count", 0);
    announcement = message;
  } else {
    const displayRecords = state.records.map((record) => {
      const isQuintal = typeof record.source_unit === "string" &&
        /rs\.?\s*\/\s*quintal/i.test(record.source_unit);
      const divisor = state.priceUnit === "kg" && isQuintal ? 100 : 1;
      return {
        ...record,
        display_unit: state.priceUnit === "kg" && isQuintal ? "₹ / kg" : record.source_unit,
        min_price: record.min_price === null ? null : record.min_price / divisor,
        max_price: record.max_price === null ? null : record.max_price / divisor,
        modal_price: record.modal_price === null ? null : record.modal_price / divisor,
      };
    });
    const ctx = buildContext(displayRecords);
    body.replaceChildren(...displayRecords.map((r) => tableRow(r, ctx, state.allIndia)));
    list.replaceChildren(...displayRecords.map((r) => cardFor(r, ctx, state.allIndia)));
    $("resultCount").textContent = tCount("results.count", state.records.length);
    announcement = state.allIndia
      ? t("results.allIndiaAnnouncement", { n: state.records.length.toLocaleString("en-IN") })
      : `${state.market}: ${$("resultCount").textContent}`;
  }

  $("showingText").textContent = state.records.length > 0
    ? state.meta.total === null
      ? t("results.showingUnknown", { a: state.records.length.toLocaleString("en-IN") })
      : t("results.showing", { a: state.records.length.toLocaleString("en-IN"), b: state.meta.total.toLocaleString("en-IN") })
    : "";
  const paginationNotice = $("paginationNotice");
  paginationNotice.hidden = !state.meta.truncated;
  paginationNotice.textContent = state.meta.truncated
    ? t("results.paginationLimit")
    : "";
  $("loadMore").hidden = !state.meta.hasNext;
  $("loadMore").disabled = state.loading || state.exporting;
  $("loadPrevious").hidden = state.pageOffsets.length < 2;
  $("loadPrevious").disabled = state.loading || state.exporting;
  $("priceMessage").textContent = announcement;
  const unitNote = document.querySelector(".unit-field label");
  if (unitNote) unitNote.textContent = `Price unit (${unitLabel})`;
  $("exportStatus").textContent = state.exportStatus
    ? t(state.exportStatus.key, state.exportStatus.vars)
    : "";
  renderError();
}



function clearSearchAndDateFilters() {
  $("cropSearch").value = "";
  $("arrivalDate").value = "";
  state.arrivalDate = "";
  loadPrices();
}

function renderError() {
  const box = $("priceError");
  box.replaceChildren();
  box.hidden = !state.error;
  if (!state.error) return;
  const text = document.createElement("span");
  text.textContent = t("results.error", { reason: state.error });
  const retry = document.createElement("button");
  retry.type = "button";
  retry.className = "btn";
  retry.textContent = t("results.retry");
  retry.addEventListener("click", () => loadPrices({ append: state.records.length > 0 }));
  box.append(text, retry);
}

function priceQueryParams() {
  const params = {
    limit: "100",
    offset: "0",
    sort: state.sort,
  };
  if (state.location.state) params.state = state.location.state;
  if (state.location.district) params.district = state.location.district;
  if (state.market) params.market = state.market;
  const search = $("cropSearch").value.trim();
  if (search) params.search = search;
  if (state.arrivalDate) params.date = state.arrivalDate;
  return params;
}

async function exportCsv() {
  if (state.exporting) {
    state.exportController?.abort();
    return;
  }
  if ((!state.market && !state.allIndia) || state.loading) return;

  const controller = new AbortController();
  state.exportController = controller;
  state.exporting = true;
  state.exportStatus = { key: "results.exportStarted", vars: {} };
  updateControls();

  try {
    const result = await fetchAllMatchingRecords({
      params: priceQueryParams(),
      fetchPage: fetchPrices,
      signal: controller.signal,
      onProgress: ({ records, pages }) => {
        state.exportStatus = {
          key: "results.exportProgress",
          vars: { records: records.toLocaleString("en-IN"), pages },
        };
        $("exportStatus").textContent = t(
          state.exportStatus.key,
          state.exportStatus.vars,
        );
      },
    });
    if (controller.signal.aborted) {
      state.exportStatus = { key: "results.exportCancelled", vars: {} };
      return;
    }
    if (result.records.length === 0) {
      state.exportStatus = { key: "results.exportEmpty", vars: {} };
      return;
    }

    const csv = recordsToCsv(result.records);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = createCsvFilename(
      state.allIndia ? "India" : state.market,
      indiaTodayIsoDate(),
    );
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    state.exportStatus = {
      key: "results.exportSuccess",
      vars: {
        records: result.records.length.toLocaleString("en-IN"),
        pages: result.pages,
      },
    };
  } catch (error) {
    state.exportStatus = controller.signal.aborted
      ? { key: "results.exportCancelled", vars: {} }
      : {
          key: "results.exportError",
          vars: { reason: errorText(error, "Unable to export live records.") },
        };
  } finally {
    if (state.exportController === controller) {
      state.exportController = null;
      state.exporting = false;
      updateControls();
      renderResults();
    }
  }
}

async function loadPrices({ append = false, offset = 0, preserveHistory = false } = {}) {
  if (!state.market && !state.allIndia) return;
  state.controller?.abort();
  const controller = new AbortController();
  state.controller = controller;
  if (!append) {
    state.records = [];
    state.meta = {
      limit: PAGE_SIZE, offset, nextOffset: offset, total: 0,
      hasNext: false, upstreamHasNext: false, truncated: false,
    };
  }
  state.loading = true;
  state.error = "";
  updateControls();
  renderResults();

  const params = {
    limit: String(PAGE_SIZE),
    offset: String(state.meta.offset),
    sort: state.sort,
  };
  if (state.location.state) params.state = state.location.state;
  if (state.location.district) params.district = state.location.district;
  if (state.market) params.market = state.market;
  if (state.arrivalDate) params.date = state.arrivalDate;
  const search = $("cropSearch").value.trim();
  if (search) params.search = search;

  try {
    const payload = await fetchPrices(params, { signal: controller.signal });
    const meta = payload.meta;
    if (
      !meta || !Number.isInteger(meta.limit) || meta.limit < 1 || !Number.isInteger(meta.offset) ||
      meta.offset < 0 || (meta.total !== null && (!Number.isInteger(meta.total) || meta.total < 0)) ||
      !Number.isInteger(meta.nextOffset) || meta.nextOffset < meta.offset ||
      typeof meta.hasNext !== "boolean" ||
      typeof meta.upstreamHasNext !== "boolean" ||
      typeof meta.truncated !== "boolean" ||
      (meta.hasNext && meta.nextOffset <= meta.offset)
    ) {
      throw new Error("The mandi prices response has invalid pagination data.");
    }
    state.records = append
      ? [...state.records, ...payload.data.filter((record) => !state.records.some((seen) => seen.id === record.id))]
      : payload.data;
    state.meta = {
      limit: meta.limit,
      offset: meta.offset,
      nextOffset: meta.nextOffset,
      total: meta.total,
      hasNext: meta.hasNext,
      upstreamHasNext: meta.upstreamHasNext,
      truncated: meta.truncated,
    };
    if (append) {
      if (!state.pageOffsets.includes(meta.offset)) state.pageOffsets.push(meta.offset);
    } else if (!preserveHistory) {
      state.pageOffsets = [meta.offset];
    }
    state.sync = {
      ...(state.sync && state.sync !== "error" ? state.sync : {}),
      source: meta.source,
      fetchedAt: meta.fetchedAt,
      upstreamUpdatedAt: meta.upstreamUpdatedAt ?? null,
      cacheStatus: meta.cacheStatus,
      freshnessStatus: meta.freshnessStatus,
    };
    renderSync();
  } catch (error) {
    if (controller.signal.aborted) return;
    state.error = errorText(error, "Unable to load mandi prices.");
    if (!append) state.meta = { limit: PAGE_SIZE, offset: 0, nextOffset: 0, total: 0, hasNext: false };
  } finally {
    if (state.controller === controller) {
      state.loading = false;
      updateControls();
      renderResults();
    }
  }
}

/* ============================ data status ============================ */
function renderSync() {
  const text = $("syncText");
  const dot = $("syncDot");
  const next = $("nextSyncAt");
  const data = state.sync;
  if (!data) return;
  if (data === "error") {
    text.textContent = t("sync.none");
    dot.dataset.state = "none";
    next.textContent = "";
    return;
  }
  text.textContent = data.fetchedAt
    ? t("sync.fetched", { time: formatDateTime(data.fetchedAt) })
    : t("sync.noFetchYet");
  dot.dataset.state = data.fetchedAt ? "live" : "none";
  const transparency = data.fetchedAt
    ? t("sync.transparency", {
        source: data.source || "Government of India OGD / AGMARKNET",
        mode: data.cacheStatus === "temporary-cache" ? t("sync.temporaryCache") : t("sync.liveApi"),
        freshness: data.freshnessStatus || "",
      })
    : t("sync.noFetchYet");
  const upstreamUpdated = data.upstreamUpdatedAt
    ? t("sync.upstreamUpdated", { time: formatDateTime(data.upstreamUpdatedAt) })
    : "";
  next.textContent = [transparency, upstreamUpdated].filter(Boolean).join(" · ");
}

async function loadSync() {
  try {
    // fetchSyncStatus() unwraps the API envelope and returns its `data` object.
    // Keep this response shape consistent; reading status.data here throws.
    const status = await fetchSyncStatus();
    state.lastFetchedAt = status.lastFetchedAt ?? null;
    state.upstreamUpdatedAt = status.upstreamUpdatedAt ?? null;
    state.sync = {
      ...status,
      // A successful price request may have completed while this status
      // request was in flight. Never overwrite its newer fetch timestamp.
      fetchedAt: state.sync?.fetchedAt || status.lastFetchedAt || null,
    };
  } catch (error) {
    console.error("[Mandi prices] Unable to load sync status:", error);
    state.sync = "error";
  }
  renderSync();
}

/* ============================ boot ============================ */
function bind() {
  $("priceUnit").addEventListener("change", (event) => {
    state.priceUnit = event.currentTarget.value === "kg" ? "kg" : "quintal";
    renderResults();
  });
  $("stateSelect").addEventListener("change", (e) => chooseState(e.currentTarget.value));
  $("districtSelect").addEventListener("change", (e) => chooseDistrict(e.currentTarget.value));
  $("indiaBrowse").addEventListener("click", toggleIndiaBrowse);
  $("sortFilter").addEventListener("change", (e) => {
    state.sort = e.currentTarget.value;
    loadPrices();
  });
  $("clearFilters").addEventListener("click", () => {
    $("cropSearch").value = "";
    $("arrivalDate").value = "";
    state.arrivalDate = "";
    $("sortFilter").value = "date_desc";
    state.sort = "date_desc";
    loadPrices();
  });
  $("exportCsv").addEventListener("click", exportCsv);
  $("refreshPrices").addEventListener("click", () => {
    // loadPrices owns the loading state and aborts any older request.
    // Do not toggle state.loading around the async call.
    renderSync();
    void loadPrices();
  });
  $("loadMore").addEventListener("click", () => {
    state.meta.offset = state.meta.nextOffset;
    loadPrices({ append: true });
  });
  $("loadPrevious").addEventListener("click", () => {
    state.pageOffsets.pop();
    const previousOffset = state.pageOffsets[state.pageOffsets.length - 1] ?? 0;
    loadPrices({ offset: previousOffset, preserveHistory: true });
  });
  $("arrivalDate").max = indiaTodayIsoDate();
  $("arrivalDate").addEventListener("change", (event) => {
    const selectedDate = event.currentTarget.value;
    const today = indiaTodayIsoDate();
    if (selectedDate && selectedDate > today) {
      event.currentTarget.value = today;
      state.arrivalDate = today;
    } else {
      state.arrivalDate = selectedDate;
    }
    loadPrices();
  });
  let timer;
  $("cropSearch").addEventListener("input", () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => loadPrices(), 250);
  });
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      if (!$("cropSearch").disabled) $("cropSearch").focus();
    }
  });
  // Refresh the selected market periodically while the page is visible.
  // The upstream source publishes daily observations, so this is a re-fetch,
  // not a promise that the government data itself changes every interval.
  let refreshInterval = null;

function startAutoRefresh() {
  if (refreshInterval) clearInterval(refreshInterval);

  refreshInterval = setInterval(() => {
    if (
      document.visibilityState === "visible" &&
      !state.loading &&
      !state.exporting
    ) {
      loadPrices();
    }
  }, 5 * 60 * 1000);
}

function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

// Refresh when returning to visible tab (pause while hidden, then refresh)
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    startAutoRefresh();
    loadPrices(); // Fetch fresh data when user returns to tab
  } else {
    stopAutoRefresh();
  }
});

startAutoRefresh();
  onLangChange(() => {
    renderFinder();
    updateControls();
    renderResults();
    renderSync();
    hydrateIcons();
  });
}

async function init() {
  bind();
  renderFinder();
  renderResults();
  loadSync();

  try {
    const data = await fetchFilters();
    state.states = data.states;
    state.filterCoverage = data.coverage ?? null;
  } catch (error) {
    console.error("[Mandi prices] Unable to load mandi filters:", error);
    state.finderError = t("finder.fail", { reason: errorText(error, "") });
    renderFinder();
    return;
  }
  renderFinder();

  const params = new URLSearchParams(location.search);
  if (params.get("scope") === "india") {
    toggleIndiaBrowse();
    return;
  }
  const initial = params.get("state")
    ? { state: params.get("state"), district: params.get("district") || "", market: params.get("market") || "" }
    : loadLocation();
  if (initial && state.states.includes(initial.state)) {
    await chooseState(initial.state, initial);
  }
}

init();
