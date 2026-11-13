import { t, tCount, onLangChange } from "./i18n.js";
import { hydrateIcons, icon } from "./icons.js";
import {
  fetchFilters, fetchPrices, fetchPriceTrend, fetchSyncStatus,
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
  records: [],
  meta: { limit: PAGE_SIZE, offset: 0, total: 0, hasNext: false },
  sort: "date_desc",
  loading: false,
  error: "",
  finderError: "",
  controller: null,
  sync: null,
  syncReceivedAt: 0,
  trend: [],
  trendCrop: "",
  trendRange: 30,
  trendLoading: false,
  trendError: "",
  trendController: null,
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
  state.meta = { limit: PAGE_SIZE, offset: 0, total: 0, hasNext: false };
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
    $("resultCount").textContent = tCount("results.count", state.meta.total);
    announcement = `${state.market}: ${tCount("results.count", state.meta.total)}`;
  }

  $("showingText").textContent =
    state.records.length > 0
      ? t("results.showing", { a: state.records.length.toLocaleString("en-IN"), b: state.meta.total.toLocaleString("en-IN") })
      : "";
  $("loadMore").hidden = !state.meta.hasNext;
  $("loadMore").disabled = state.loading;
  $("priceMessage").textContent = announcement;
  renderError();
  addTrendOptions();
}


/* ============================ historical trend ============================ */
function addTrendOptions() {
  const select = $("trendCropSelect");
  if (!select) return;
  const crops = [...new Set(state.records.map((record) => record.commodity).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
  const preferred = crops.includes(state.trendCrop) ? state.trendCrop : crops[0] || "";
  state.trendCrop = preferred;
  select.replaceChildren(new Option("Select crop", ""));
  for (const crop of crops) select.add(new Option(crop, crop));
  select.value = preferred;
  select.disabled = crops.length === 0 || !state.market;
  if (preferred) loadTrend();
  else {
    state.trend = [];
    renderTrend();
  }
}

function trendDate(daysAgo) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function renderTrend() {
  const chart = $("trendChart");
  const status = $("trendStatus");
  const stats = $("trendStats");
  if (!chart || !status || !stats) return;
  chart.replaceChildren();
  stats.replaceChildren();
  const records = state.trend
    .filter((record) => Number.isFinite(Number(record.modal_price)) && record.modal_price !== null)
    .sort((a, b) => String(a.arrival_date).localeCompare(String(b.arrival_date)));
  if (state.trendLoading) {
    status.textContent = "Loading recorded price history…";
    return;
  }
  if (state.trendError) {
    status.textContent = state.trendError;
    return;
  }
  if (!state.market || !state.trendCrop) {
    status.textContent = "Choose a mandi and crop to view its price history.";
    return;
  }
  if (!records.length) {
    status.textContent = "No historical records are stored for this crop and mandi yet. The chart will grow as verified daily records are collected.";
    return;
  }

  const values = records.map((record) => Number(record.modal_price));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const first = values[0];
  const last = values[values.length - 1];
  const change = last - first;
  const changePct = first > 0 ? (change / first) * 100 : null;
  const number = (value) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
  const metric = (label, value, detail = "") => {
    const item = document.createElement("div");
    item.className = "trend-stat";
    const name = document.createElement("span");
    name.textContent = label;
    const strong = document.createElement("strong");
    strong.textContent = value;
    item.append(name, strong);
    if (detail) {
      const small = document.createElement("small");
      small.textContent = detail;
      item.append(small);
    }
    stats.append(item);
  };
  metric("Latest modal price", `₹${number(last)}`, formatDate(records.at(-1).arrival_date));
  metric("Period high", `₹${number(max)}`);
  metric("Period low", `₹${number(min)}`);
  metric("Change", `${change > 0 ? "+" : ""}₹${number(change)}`, changePct === null ? "" : `${changePct > 0 ? "+" : ""}${changePct.toFixed(1)}% across recorded dates`);

  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 720 250");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `${state.trendCrop} modal price history at ${state.market}`);
  svg.classList.add("trend-svg");
  const left = 58, right = 690, top = 18, bottom = 194;
  const spread = Math.max(max - min, Math.abs(max) * 0.04, 1);
  const low = min - spread * 0.14;
  const high = max + spread * 0.14;
  const x = (index) => records.length === 1 ? (left + right) / 2 : left + (index / (records.length - 1)) * (right - left);
  const y = (value) => bottom - ((value - low) / (high - low)) * (bottom - top);
  for (let i = 0; i < 4; i += 1) {
    const yy = top + (i / 3) * (bottom - top);
    const grid = document.createElementNS(ns, "line");
    grid.setAttribute("x1", left); grid.setAttribute("x2", right);
    grid.setAttribute("y1", yy); grid.setAttribute("y2", yy);
    grid.setAttribute("class", "trend-grid");
    svg.append(grid);
    const label = document.createElementNS(ns, "text");
    label.setAttribute("x", left - 10); label.setAttribute("y", yy + 4);
    label.setAttribute("text-anchor", "end"); label.setAttribute("class", "trend-axis-label");
    label.textContent = number(high - (i / 3) * (high - low));
    svg.append(label);
  }
  if (records.length > 1) {
    const area = document.createElementNS(ns, "path");
    const points = records.map((record, index) => `${x(index)},${y(Number(record.modal_price))}`);
    area.setAttribute("d", `M ${points[0]} L ${points.slice(1).join(" L ")} L ${right},${bottom} L ${left},${bottom} Z`);
    area.setAttribute("class", "trend-area");
    svg.append(area);
    const line = document.createElementNS(ns, "path");
    line.setAttribute("d", `M ${points.join(" L ")}`);
    line.setAttribute("class", "trend-line");
    svg.append(line);
  }
  records.forEach((record, index) => {
    const dot = document.createElementNS(ns, "circle");
    dot.setAttribute("cx", x(index)); dot.setAttribute("cy", y(Number(record.modal_price)));
    dot.setAttribute("r", records.length === 1 ? "6" : "4");
    dot.setAttribute("class", "trend-point");
    const title = document.createElementNS(ns, "title");
    title.textContent = `${formatDate(record.arrival_date)}: ₹${number(Number(record.modal_price))}/quintal`;
    dot.append(title);
    svg.append(dot);
  });
  [records[0], records[Math.floor((records.length - 1) / 2)], records.at(-1)]
    .filter((record, index, list) => list.findIndex((item) => item.arrival_date === record.arrival_date) === index)
    .forEach((record, index, list) => {
      const recordIndex = records.indexOf(record);
      const label = document.createElementNS(ns, "text");
      label.setAttribute("x", x(recordIndex));
      label.setAttribute("y", 226);
      label.setAttribute("text-anchor", index === 0 ? "start" : index === list.length - 1 ? "end" : "middle");
      label.setAttribute("class", "trend-axis-label");
      label.textContent = formatDate(record.arrival_date);
      svg.append(label);
    });
  chart.append(svg);
  status.textContent = records.length === 1
    ? "1 verified arrival date is available. More points will appear after additional daily records are collected."
    : `Showing ${records.length} verified arrival records. Prices are modal prices in ₹ per quintal.`;
}

async function loadTrend() {
  if (!state.market || !state.trendCrop) {
    state.trend = [];
    renderTrend();
    return;
  }
  state.trendController?.abort();
  const controller = new AbortController();
  state.trendController = controller;
  state.trendLoading = true;
  state.trendError = "";
  renderTrend();
  try {
    const records = await fetchPriceTrend({
      commodity: state.trendCrop,
      market: state.market,
      state: state.location.state,
      district: state.location.district,
      from: trendDate(state.trendRange),
      to: new Date().toISOString().slice(0, 10),
    }, { signal: controller.signal });
    if (controller.signal.aborted) return;
    state.trend = records;
  } catch (error) {
    if (controller.signal.aborted) return;
    state.trendError = errorText(error, "Unable to load price history.");
  } finally {
    if (state.trendController === controller) {
      state.trendLoading = false;
      renderTrend();
    }
  }
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

async function loadPrices({ append = false } = {}) {
  if (!state.market) return;
  state.controller?.abort();
  const controller = new AbortController();
  state.controller = controller;
  if (!append) {
    state.records = [];
    state.meta.offset = 0;
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
  const search = $("cropSearch").value.trim();
  if (search) params.search = search;

  try {
    const payload = await fetchPrices(params, { signal: controller.signal });
    const meta = payload.meta;
    if (
      !meta || !Number.isInteger(meta.limit) || meta.limit < 1 || !Number.isInteger(meta.offset) ||
      meta.offset < 0 || !Number.isInteger(meta.total) || meta.total < 0 || typeof meta.hasNext !== "boolean"
    ) {
      throw new Error("The mandi prices response has invalid pagination data.");
    }
    state.records = append ? [...state.records, ...payload.data] : payload.data;
    state.meta = { limit: meta.limit, offset: meta.offset, total: meta.total, hasNext: meta.hasNext };
  } catch (error) {
    if (controller.signal.aborted) return;
    state.error = errorText(error, "Unable to load mandi prices.");
    if (!append) state.meta = { limit: PAGE_SIZE, offset: 0, total: 0, hasNext: false };
  } finally {
    if (state.controller === controller) {
      state.loading = false;
      updateControls();
      renderResults();
    }
  }
}

/* ============================ data status ============================ */
function formatCountdown(ms) {
  const minutes = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? t("time.hm", { h, m }) : t("time.m", { m });
}

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
  const raw = data.freshnessStatus;
  const label = t(`fresh.${raw}`) === `fresh.${raw}` ? raw : t(`fresh.${raw}`);
  const completed = data.lastSuccessfulSync?.completed_at;
  text.textContent = completed
    ? t("sync.updated", { status: label, time: formatDateTime(completed) })
    : t("sync.never");
  dot.dataset.state = raw === "Fresh data" ? "fresh" : raw === "Data is outdated" ? "stale" : "none";

  const valid = data.schedulerEnabled && Number.isFinite(data.countdownMs);
  next.textContent = valid
    ? t("sync.next", { time: formatCountdown(data.countdownMs - (performance.now() - state.syncReceivedAt)) })
    : t("sync.nextNone");
}

async function loadSync() {
  try {
    state.sync = await fetchSyncStatus();
    state.syncReceivedAt = performance.now();
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
    $("sortFilter").value = "date_desc";
    state.sort = "date_desc";
    loadPrices();
  });
  $("trendCropSelect")?.addEventListener("change", (event) => { state.trendCrop = event.currentTarget.value; loadTrend(); });
  $("trendRange")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-days]");
    if (!button) return;
    state.trendRange = Number(button.dataset.days);
    $("trendRange").querySelectorAll("button").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    loadTrend();
  });
  $("loadMore").addEventListener("click", () => {
    state.meta.offset += state.meta.limit;
    loadPrices({ append: true });
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
    renderTrend();
    renderSync();
    hydrateIcons();
  });
}

async function init() {
  bind();
  renderFinder();
  renderResults();
  loadSync();
  window.setInterval(renderSync, 30_000);
  window.setInterval(loadSync, 5 * 60_000);

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
