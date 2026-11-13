import { t, tCount, onLangChange } from "./i18n.js";
import { hydrateIcons, icon } from "./icons.js";
import {
  fetchFilters, fetchPrices, fetchSyncStatus,
  loadLocation, saveLocation, loadRecent, pushRecent,
} from "./api.js";
import {
  axisFor, spreadAxis, cropNames, createDelta, createRange,
  formatDate, formatDateTime, formatPrice,
} from "./rate-ui.js";

const PAGE_SIZE = 50;
const $ = (id) => document.getElementById(id);

const state = {
  states: [], districts: [], markets: [],
  location: { state: "", district: "" },
  market: "",
  arrivalDate: "",
  records: [],
  meta: { limit: PAGE_SIZE, offset: 0, nextOffset: 0, total: 0, hasNext: false },
  pageOffsets: [0],
  sort: "date_desc",
  loading: false,
  error: "",
  finderError: "",
  controller: null,
  sync: null,
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
    help.textContent = t("finder.none");
    return;
  }
  help.textContent = `${t("finder.mandis", { district })} · ${tCount("finder.count", state.markets.length)}`;
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
  state.location = { state: name, district: "" };
  state.districts = [];
  state.markets = [];
  state.market = "";
  state.finderError = "";
  clearResults();
  renderFinder();
  if (!name) return;
  try {
    const data = await fetchFilters({ state: name });
    if (token !== navToken) return;
    state.districts = data.districts;
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
  state.location.district = name;
  state.markets = [];
  state.market = "";
  state.finderError = "";
  clearResults();
  renderFinder();
  if (!name) return;
  try {
    const data = await fetchFilters({ state: state.location.state, district: name });
    if (token !== navToken) return;
    state.markets = data.markets;
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
  state.market = market;
  const entry = { ...state.location, market };
  saveLocation(entry);
  pushRecent(entry);
  history.replaceState(null, "", `?${new URLSearchParams(entry)}`);
  renderMandis();
  renderRecent();
  loadPrices();
}

/* ============================ results ============================ */
function resetResultState() {
  state.controller?.abort();
  state.records = [];
  state.meta = { limit: PAGE_SIZE, offset: 0, nextOffset: 0, total: 0, hasNext: false };
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
  const on = Boolean(state.market) && !state.loading;
  $("cropSearch").disabled = !state.market;
  $("arrivalDate").disabled = !state.market;
  $("sortFilter").disabled = !on;
  $("clearFilters").disabled = !on;
}

function buildContext(records) {
  const keyOf = (r) => `${r.commodity}|${r.variety ?? ""}`;
  const groups = new Map();
  for (const r of records) {
    if (!groups.has(keyOf(r))) groups.set(keyOf(r), []);
    groups.get(keyOf(r)).push(r);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => String(b.arrival_date).localeCompare(String(a.arrival_date)));
  }
  return {
    axis: (r) => {
      const list = groups.get(keyOf(r));
      return list.length > 1 ? axisFor(list) : spreadAxis(r);
    },
    previous: (r) => {
      const list = groups.get(keyOf(r));
      return list[list.indexOf(r) + 1] ?? null;
    },
  };
}

function cropBlock(record) {
  const names = cropNames(record.commodity);
  const wrap = document.createElement("div");
  wrap.className = "crop-name";
  const strong = document.createElement("strong");
  strong.textContent = names.primary;
  wrap.append(strong);
  const second = [names.secondary, typeof record.variety === "string" ? record.variety.trim() : ""]
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

function tableRow(record, ctx) {
  const tr = document.createElement("tr");
  const crop = document.createElement("td");
  crop.append(cropBlock(record));
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

function cardFor(record, ctx) {
  const card = document.createElement("article");
  card.className = "price-card";
  const top = document.createElement("div");
  top.className = "price-card-top";
  top.append(cropBlock(record), modalBlock(record));
  const meta = document.createElement("div");
  meta.className = "price-card-meta";
  const date = document.createElement("span");
  date.textContent = formatDate(record.arrival_date);
  meta.append(date, createDelta(record.modal_price, ctx.previous(record)?.modal_price));
  card.append(top, createRange(record, ctx.axis(record)), meta);
  return card;
}

function messageRows(message) {
  const tr = document.createElement("tr");
  const td = document.createElement("td");
  td.colSpan = 5;
  td.className = "state-cell";
  td.textContent = message;
  tr.append(td);
  const p = document.createElement("p");
  p.className = "state-message";
  p.textContent = message;
  return { row: tr, card: p };
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
  $("pricesHeading").textContent = state.market
    ? t("results.titleSet", { market: state.market })
    : t("results.titleNone");

  const busy = state.loading && state.records.length === 0;
  let announcement = "";

  if (busy) {
    const { rows, cards } = skeletonRows();
    body.replaceChildren(...rows);
    list.replaceChildren(...cards);
    announcement = t("results.loading");
    $("resultCount").textContent = t("results.loading");
  } else if (!state.market) {
    const m = messageRows(t("results.pickMandi"));
    body.replaceChildren(m.row);
    list.replaceChildren(m.card);
    $("resultCount").textContent = "";
  } else if (state.records.length === 0 && !state.error) {
    const m = messageRows(t("results.none"));
    body.replaceChildren(m.row);
    list.replaceChildren(m.card);
    $("resultCount").textContent = tCount("results.count", 0);
    announcement = t("results.none");
  } else {
    const ctx = buildContext(state.records);
    body.replaceChildren(...state.records.map((r) => tableRow(r, ctx)));
    list.replaceChildren(...state.records.map((r) => cardFor(r, ctx)));
    $("resultCount").textContent = state.meta.total === null
      ? tCount("results.count", state.records.length)
      : tCount("results.count", state.meta.total);
    announcement = `${state.market}: ${$("resultCount").textContent}`;
  }

  $("showingText").textContent = state.records.length > 0
    ? state.meta.total === null
      ? t("results.showingUnknown", { a: state.records.length.toLocaleString("en-IN") })
      : t("results.showing", { a: state.records.length.toLocaleString("en-IN"), b: state.meta.total.toLocaleString("en-IN") })
    : "";
  $("loadMore").hidden = !state.meta.hasNext;
  $("loadMore").disabled = state.loading;
  $("loadPrevious").hidden = state.pageOffsets.length < 2;
  $("loadPrevious").disabled = state.loading;
  $("priceMessage").textContent = announcement;
  renderError();
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

async function loadPrices({ append = false, offset = 0 } = {}) {
  if (!state.market) return;
  state.controller?.abort();
  const controller = new AbortController();
  state.controller = controller;
  if (!append) {
    state.records = [];
    state.meta = { limit: PAGE_SIZE, offset, nextOffset: offset, total: 0, hasNext: false };
  }
  state.loading = true;
  state.error = "";
  updateControls();
  renderResults();

  const params = {
    state: state.location.state,
    district: state.location.district,
    market: state.market,
    limit: String(PAGE_SIZE),
    offset: String(state.meta.offset),
    sort: state.sort,
  };
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
      typeof meta.hasNext !== "boolean" || (meta.hasNext && meta.nextOffset <= meta.offset)
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
    };
    if (append) {
      if (!state.pageOffsets.includes(meta.offset)) state.pageOffsets.push(meta.offset);
    } else {
      state.pageOffsets = [meta.offset];
    }
    state.sync = {
      ...(state.sync && state.sync !== "error" ? state.sync : {}),
      source: meta.source,
      fetchedAt: meta.fetchedAt,
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
    : t("sync.onSearch");
  dot.dataset.state = data.fetchedAt ? "live" : "none";
  next.textContent = data.fetchedAt
    ? t("sync.transparency", {
        source: data.source || "Government of India OGD / AGMARKNET",
        mode: data.cacheStatus === "temporary-cache" ? t("sync.temporaryCache") : t("sync.liveApi"),
        freshness: data.freshnessStatus || "",
      })
    : t("sync.noFetchYet");
}

async function loadSync() {
  try {
    const status = await fetchSyncStatus();
    state.sync = {
      ...status,
      fetchedAt: state.sync?.fetchedAt || status.lastFetchedAt,
    };
  } catch (error) {
    console.error("[Mandi prices] Unable to load sync status:", error);
    state.sync = "error";
  }
  renderSync();
}

/* ============================ boot ============================ */
function bind() {
  $("stateSelect").addEventListener("change", (e) => chooseState(e.currentTarget.value));
  $("districtSelect").addEventListener("change", (e) => chooseDistrict(e.currentTarget.value));
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
  $("loadMore").addEventListener("click", () => {
    state.meta.offset = state.meta.nextOffset;
    loadPrices({ append: true });
  });
  $("loadPrevious").addEventListener("click", () => {
    state.pageOffsets.pop();
    const previousOffset = state.pageOffsets[state.pageOffsets.length - 1] ?? 0;
    loadPrices({ offset: previousOffset });
  });
  $("arrivalDate").addEventListener("change", (event) => {
    state.arrivalDate = event.currentTarget.value;
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
  onLangChange(() => {
    renderFinder();
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
    state.states = (await fetchFilters()).states;
  } catch (error) {
    console.error("[Mandi prices] Unable to load mandi filters:", error);
    state.finderError = t("finder.fail", { reason: errorText(error, "") });
    renderFinder();
    return;
  }
  renderFinder();

  const params = new URLSearchParams(location.search);
  const initial = params.get("state")
    ? { state: params.get("state"), district: params.get("district") || "", market: params.get("market") || "" }
    : loadLocation();
  if (initial && state.states.includes(initial.state)) {
    await chooseState(initial.state, initial);
  }
}

init();
