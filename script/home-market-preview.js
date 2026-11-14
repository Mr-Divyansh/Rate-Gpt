import { t, onLangChange } from "./i18n.js";
import { hydrateIcons } from "./icons.js";
import { fetchPrices } from "./api.js";
import {
  spreadAxis, cropNames, createRange, createSparkline, formatDate, formatPrice, priceNumber,
} from "./rate-ui.js";

const $ = (id) => document.getElementById(id);
const BOARD_ROWS = 5;

/* ---------------- interactive product demo ---------------- */
const demoDialog = $("demoDialog");
$("watchDemo")?.addEventListener("click", () => demoDialog?.showModal());
$("demoClose")?.addEventListener("click", () => demoDialog?.close());
demoDialog?.addEventListener("click", (event) => {
  if (event.target === demoDialog) demoDialog.close();
});

/* ---------------- rate board ---------------- */
let board = null; // { latest, rows, history } | { error } | { empty: true }

function pickRows(records) {
  const hasPrice = (r) =>
    [r.min_price, r.max_price, r.modal_price].some((v) => priceNumber(v) !== null);
  const usable = records.filter(hasPrice);
  const latest = usable[0];
  if (!latest) return { latest: null, rows: [] };
  const seen = new Set();
  const rows = [];
  for (const record of usable) {
    const key = `${record.commodity}|${record.variety ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(record);
    if (rows.length === BOARD_ROWS) break;
  }
  return { latest, rows };
}

function boardRow(record, axis) {
  const li = document.createElement("li");
  li.className = "board-row";

  const names = cropNames(record.commodity);
  const crop = document.createElement("div");
  crop.className = "crop-name";
  const strong = document.createElement("strong");
  strong.textContent = names.primary;
  crop.append(strong);
  const second = [names.secondary, record.variety, record.market, record.district].filter(Boolean).join(" · ");
  if (second) {
    const small = document.createElement("small");
    small.textContent = second;
    crop.append(small);
  }

  const modal = document.createElement("div");
  modal.className = "board-modal";
  const price = document.createElement("strong");
  price.textContent = formatPrice(record.modal_price);
  const label = document.createElement("small");
  label.textContent = t("board.modal");
  modal.append(price, label);

  li.append(crop, createRange(record, axis), modal);
  return li;
}

function renderBoard() {
  const root = $("rateBoard");
  const rows = $("boardRows");
  const status = $("boardStatus");
  const trend = $("boardTrend");
  const title = $("boardTitleText") || $("boardTitle");
  root.setAttribute("aria-busy", "false");
  status.hidden = true;
  status.replaceChildren();
  trend.hidden = true;

  if (!board) return;

  if (board.error || board.empty) {
    title.textContent = t("board.titleNone");
    $("boardLink").hidden = true;
    $("boardMeta").textContent = "";
    rows.replaceChildren();
    status.hidden = false;
    status.textContent = board.error
      ? t("board.error", { reason: board.error })
      : t("board.empty");
    if (board.error) {
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "btn";
      retry.textContent = t("board.retry");
      retry.addEventListener("click", () => {
        board = null;
        root.setAttribute("aria-busy", "true");
        loadBoard();
      });
      status.append(document.createElement("br"), retry);
    }
    return;
  }

  $("boardLink").hidden = false;
  const { latest, rows: records, history } = board;
  title.textContent = t("board.titleNone");
  $("boardMeta").textContent = t("board.meta", {
    district: latest.district,
    state: latest.state,
    date: formatDate(latest.arrival_date),
  });
  rows.replaceChildren(...records.map((r) => boardRow(r, spreadAxis(r))));

  const params = new URLSearchParams({
    state: latest.state, district: latest.district, market: latest.market,
  });
  $("boardLink").href = `mandi-prices.html?${params}`;

  trend.hidden = false;
  const spark = $("boardSpark");
  if (history && history.length >= 2) {
    $("boardTrendTitle").textContent = t("board.trend", {
      n: history.length,
      crop: cropNames(latest.commodity).primary,
    });
    spark.replaceChildren(createSparkline(history));
    $("boardTrendFrom").textContent = `${formatDate(history[0].date, { day: "numeric", month: "short" })} · ${formatPrice(history[0].value)}`;
    $("boardTrendTo").textContent = `${formatDate(history.at(-1).date, { day: "numeric", month: "short" })} · ${formatPrice(history.at(-1).value)}`;
  } else {
    $("boardTrendTitle").textContent = t("board.trendEmpty");
    spark.replaceChildren();
    $("boardTrendFrom").textContent = "";
    $("boardTrendTo").textContent = "";
  }
}

async function loadBoard() {
  try {
    const { data } = await fetchPrices({ limit: "40", sort: "date_desc" });
    const { latest, rows } = pickRows(data);
    if (!latest) {
      board = { empty: true };
      renderBoard();
      return;
    }
    // Historical price series are intentionally not fetched or retained.
    // The home board displays only the current live response.
    board = { latest, rows, history: null };
    renderBoard();
  } catch (error) {
    console.error("[Home] Could not load live mandi prices:", error);
    board = { error: error instanceof Error ? error.message : "Unknown error." };
    renderBoard();
  }
}

onLangChange(() => {
  renderBoard();
  hydrateIcons();
});

loadBoard();
