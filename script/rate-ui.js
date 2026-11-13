/* Shared presentation helpers: number/date formatting, crop names, the price-range bar, sparkline. */
import { getLang, getLocale, t } from "./i18n.js";

const numberFormat = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

export function priceNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function formatPrice(value) {
  const n = priceNumber(value);
  return n === null ? "—" : `₹${numberFormat.format(n)}`;
}

export function formatDate(value, options = { day: "numeric", month: "short", year: "numeric" }) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "—";
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return "—";
  return date.toLocaleDateString(getLocale(), { ...options, timeZone: "UTC" });
}

export function formatDateTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(getLocale(), {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/* ---- crop names: show Hindi next to the government's English name ---- */
const HINDI_CROPS = {
  wheat: "गेहूँ", paddy: "धान", rice: "चावल", maize: "मक्का", bajra: "बाजरा", jowar: "ज्वार",
  barley: "जौ", ragi: "रागी", mustard: "सरसों", soyabean: "सोयाबीन", soybean: "सोयाबीन",
  groundnut: "मूंगफली", sunflower: "सूरजमुखी", gram: "चना", arhar: "अरहर", "tur ": "तूर",
  moong: "मूंग", urad: "उड़द", masur: "मसूर", lentil: "मसूर", cotton: "कपास", sugarcane: "गन्ना",
  jute: "जूट", onion: "प्याज", potato: "आलू", tomato: "टमाटर", garlic: "लहसुन", ginger: "अदरक",
  cauliflower: "फूलगोभी", cabbage: "पत्तागोभी", brinjal: "बैंगन", bhindi: "भिंडी",
  "ladies finger": "भिंडी", peas: "मटर", carrot: "गाजर", radish: "मूली", spinach: "पालक",
  cucumber: "खीरा", pumpkin: "कद्दू", "bitter gourd": "करेला", "bottle gourd": "लौकी",
  "green chilli": "हरी मिर्च", capsicum: "शिमला मिर्च", lemon: "नींबू", coriander: "धनिया",
  turmeric: "हल्दी", apple: "सेब", banana: "केला", mango: "आम", orange: "संतरा", grapes: "अंगूर",
  papaya: "पपीता", pomegranate: "अनार", guava: "अमरूद", mushroom: "मशरूम", "maize": "मक्का",
};
const HINDI_KEYS = Object.keys(HINDI_CROPS).sort((a, b) => b.length - a.length);

export function cropNames(commodity) {
  const english = typeof commodity === "string" && commodity.trim() ? commodity.trim() : "—";
  const lower = `${english.toLowerCase()} `;
  const key = HINDI_KEYS.find((k) => lower.includes(k));
  const hindi = key ? HINDI_CROPS[key] : null;
  if (getLang() === "hi" && hindi) return { primary: hindi, secondary: english };
  return { primary: english, secondary: hindi };
}

/* ---- the range bar: green = min→max traded, gold tick = modal price ---- */
function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

export function axisFor(records) {
  const values = [];
  for (const r of records) {
    for (const v of [r.min_price, r.max_price, r.modal_price]) {
      const n = priceNumber(v);
      if (n !== null) values.push(n);
    }
  }
  if (values.length === 0) return null;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = (hi - lo) * 0.1 || hi * 0.03 || 1;
  return { min: Math.max(0, lo - pad), max: hi + pad };
}

/* One record on a common % scale around its modal price, so spread is comparable between crops. */
export function spreadAxis(record, spread = 0.18) {
  const base =
    priceNumber(record.modal_price) ?? priceNumber(record.max_price) ?? priceNumber(record.min_price);
  return base ? { min: base * (1 - spread), max: base * (1 + spread) } : null;
}

export function createRange(record, axis, { labels = true } = {}) {
  const min = priceNumber(record.min_price);
  const max = priceNumber(record.max_price);
  const modal = priceNumber(record.modal_price);
  const wrap = el("div", "range");
  wrap.setAttribute("role", "img");
  wrap.setAttribute(
    "aria-label",
    t("range.aria", { min: formatPrice(min), modal: formatPrice(modal), max: formatPrice(max) }),
  );

  const track = el("span", "range-track");
  const present = [min, max, modal].filter((v) => v !== null);
  if (present.length === 0) {
    track.classList.add("is-empty");
  } else {
    let lo = axis?.min ?? Math.min(...present);
    let hi = axis?.max ?? Math.max(...present);
    if (hi === lo) {
      lo -= 1;
      hi += 1;
    }
    const pos = (v) => Math.min(100, Math.max(0, ((v - lo) / (hi - lo)) * 100));
    if (min !== null && max !== null) {
      const fill = el("span", "range-fill");
      const left = pos(min);
      fill.style.left = `${left}%`;
      fill.style.width = `${Math.max(pos(max) - left, 2)}%`;
      track.append(fill);
    }
    if (modal !== null) {
      const tick = el("span", "range-modal");
      tick.style.left = `${pos(modal)}%`;
      track.append(tick);
    }
  }
  wrap.append(track);

  if (labels) {
    const row = el("span", "range-labels");
    row.setAttribute("aria-hidden", "true");
    const a = el("span");
    a.textContent = formatPrice(min);
    const b = el("span");
    b.textContent = formatPrice(max);
    row.append(a, b);
    wrap.append(row);
  }
  return wrap;
}

/* ---- change vs previous arrival ---- */
export function createDelta(current, previous) {
  const node = el("span", "delta");
  const now = priceNumber(current);
  const before = priceNumber(previous);
  if (now === null || before === null) {
    node.classList.add("is-none");
    node.textContent = t("delta.none");
    return node;
  }
  const diff = now - before;
  if (Math.abs(diff) < 0.005) {
    node.classList.add("is-same");
    node.textContent = t("delta.same");
    return node;
  }
  const pct = before > 0 ? (Math.abs(diff) / before) * 100 : null;
  const amount = `${formatPrice(Math.abs(diff))}${pct === null ? "" : ` (${pct.toFixed(1)}%)`}`;
  node.classList.add(diff > 0 ? "is-up" : "is-down");
  const mark = el("span", "delta-mark");
  mark.setAttribute("aria-hidden", "true");
  mark.textContent = diff > 0 ? "▲" : "▼";
  const text = el("span");
  text.textContent = t(diff > 0 ? "delta.up" : "delta.down", { amount });
  node.append(mark, text);
  return node;
}

/* ---- sparkline for the home board (oldest → newest) ---- */
export function createSparkline(points) {
  const ns = "http://www.w3.org/2000/svg";
  const W = 320;
  const H = 72;
  const padX = 6;
  const padY = 10;
  const values = points.map((p) => p.value);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const x = (i) => padX + (i / Math.max(points.length - 1, 1)) * (W - padX * 2);
  const y = (v) => H - padY - ((v - lo) / span) * (H - padY * 2);

  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("spark");

  const line = points.map((p, i) => `${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = document.createElementNS(ns, "polygon");
  area.setAttribute("points", `${x(0)},${H} ${line} ${x(points.length - 1)},${H}`);
  area.setAttribute("class", "spark-area");
  const stroke = document.createElementNS(ns, "polyline");
  stroke.setAttribute("points", line);
  stroke.setAttribute("class", "spark-line");
  stroke.setAttribute("vector-effect", "non-scaling-stroke");
  const last = document.createElementNS(ns, "circle");
  last.setAttribute("cx", x(points.length - 1).toFixed(1));
  last.setAttribute("cy", y(points[points.length - 1].value).toFixed(1));
  last.setAttribute("r", "4");
  last.setAttribute("class", "spark-dot");
  svg.append(area, stroke, last);
  return svg;
}
