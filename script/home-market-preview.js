const numberFormat = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});
const requiredTextFields = [
  "state",
  "district",
  "market",
  "commodity",
  "arrival_date",
];

function isPrice(value) {
  if (value === null) return true;
  if (
    (typeof value !== "number" && typeof value !== "string") ||
    (typeof value === "string" && value.trim() === "")
  ) {
    return false;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0;
}

function isArrivalDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function isPriceRecord(record) {
  return (
    record !== null &&
    typeof record === "object" &&
    requiredTextFields.every(
      (field) => typeof record[field] === "string" && record[field].trim(),
    ) &&
    isArrivalDate(record.arrival_date) &&
    isPrice(record.min_price) &&
    isPrice(record.max_price) &&
    isPrice(record.modal_price)
  );
}

async function requestPrices(query) {
  const response = await fetch(`/api/v1/prices?${query}`, {
    headers: { Accept: "application/json" },
  });
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      response.ok
        ? "The market data service returned an unexpected response."
        : `The market data service returned HTTP ${response.status}.`,
    );
  }

  const payload = await response.json();
  if (!response.ok || payload?.success !== true) {
    throw new Error(
      payload?.error?.message ||
        `The market data request failed (HTTP ${response.status}).`,
    );
  }
  if (!Array.isArray(payload.data) || !payload.data.every(isPriceRecord)) {
    throw new Error("The market data service returned invalid price records.");
  }
  return payload.data;
}

function formatPrice(value) {
  if (value === null || value === undefined || value === "") return "—";
  const price = Number(value);
  return Number.isFinite(price) && price >= 0
    ? `₹${numberFormat.format(price)}`
    : "—";
}

function formatDate(value, options = { day: "2-digit", month: "short" }) {
  const date = new Date(`${value}T00:00:00Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return "—";
  }
  return date.toLocaleDateString("en-IN", { ...options, timeZone: "UTC" });
}

function setPriceValue(id, value) {
  const element = document.getElementById(id);
  element.replaceChildren(document.createTextNode(formatPrice(value)));
  const unit = document.createElement("small");
  unit.textContent = "/Quintal";
  element.append(" ", unit);
}

function setUnavailable(message) {
  document.getElementById("homeMarketName").textContent =
    "Stored mandi prices unavailable";
  for (const id of ["homeMinimum", "homeMaximum", "homeModal"]) {
    setPriceValue(id, null);
  }
  for (const id of [
    "homeMinimumContext",
    "homeMaximumContext",
    "homeModalContext",
  ]) {
    document.getElementById(id).textContent = "No live value shown";
  }
  document.getElementById("homeHistoryCaption").textContent =
    "Stored arrivals";
  const history = document.getElementById("homePriceHistory");
  history.setAttribute("aria-label", message);
  const empty = document.createElement("div");
  empty.className = "chart-empty";
  empty.textContent = message;
  history.replaceChildren(empty);
  const status = document.getElementById("homeDataMessage");
  status.classList.add("is-error");
  status.textContent = "Open Mandi Prices to retry or choose a market.";
}

function renderHistory(records, record) {
  const history = document.getElementById("homePriceHistory");
  const observations = records
    .filter((item) => item.modal_price !== null && item.modal_price !== "")
    .slice(0, 8);

  if (observations.length === 0) {
    history.setAttribute(
      "aria-label",
      `No modal-price history is available for ${record.commodity} at ${record.market}.`,
    );
    const empty = document.createElement("div");
    empty.className = "chart-empty";
    empty.textContent = "No modal-price history is available for this crop and mandi.";
    history.replaceChildren(empty);
    document.getElementById("homeHistoryCaption").textContent =
      "No stored arrivals";
    return;
  }

  const prices = observations.map((item) => Number(item.modal_price));
  const maximum = Math.max(...prices);
  history.setAttribute(
    "aria-label",
    `Modal prices for ${record.commodity} at ${record.market}, by arrival date.`,
  );
  const fragment = document.createDocumentFragment();
  observations.forEach((item, index) => {
    const point = document.createElement("div");
    point.className = "home-history-point";
    point.setAttribute(
      "aria-label",
      `${formatDate(item.arrival_date, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })}: ${formatPrice(item.modal_price)} per quintal`,
    );

    const value = document.createElement("span");
    value.className = "home-history-value";
    value.textContent = formatPrice(item.modal_price);

    const bar = document.createElement("span");
    bar.className = "home-history-bar";
    const height = maximum > 0 ? (prices[index] / maximum) * 70 : 0;
    bar.style.height = `${Math.max(12, height)}px`;
    bar.setAttribute("aria-hidden", "true");

    const date = document.createElement("span");
    date.className = "home-history-date";
    date.textContent = formatDate(item.arrival_date);
    point.append(value, bar, date);
    fragment.append(point);
  });
  history.replaceChildren(fragment);
  document.getElementById("homeHistoryCaption").textContent =
    `${observations.length} stored arrival${observations.length === 1 ? "" : "s"}`;
}

async function loadMarketPreview() {
  const status = document.getElementById("homeDataMessage");
  status.classList.remove("is-error");
  status.textContent = "";
  try {
    const latestRecords = await requestPrices(
      new URLSearchParams({ limit: "30", sort: "date_desc" }),
    );
    const latest = latestRecords.find(
      (record) =>
        record.min_price !== null && record.min_price !== undefined ||
        record.max_price !== null && record.max_price !== undefined ||
        record.modal_price !== null && record.modal_price !== undefined,
    );
    if (!latest) {
      setUnavailable("No stored mandi price records are available yet.");
      return;
    }

    document.getElementById("homeMarketName").textContent =
      `${latest.market} · ${latest.district}, ${latest.state}`;
    setPriceValue("homeMinimum", latest.min_price);
    setPriceValue("homeMaximum", latest.max_price);
    setPriceValue("homeModal", latest.modal_price);
    const context = `${latest.commodity} · ${formatDate(latest.arrival_date, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })}`;
    for (const id of [
      "homeMinimumContext",
      "homeMaximumContext",
      "homeModalContext",
    ]) {
      document.getElementById(id).textContent = context;
    }

    try {
      const query = new URLSearchParams({
        state: latest.state,
        district: latest.district,
        market: latest.market,
        commodity: latest.commodity,
        limit: "8",
        sort: "date_desc",
      });
      const history = await requestPrices(query);
      renderHistory(history, latest);
    } catch (error) {
      console.error("[Home] Could not load modal price history:", error);
      const history = document.getElementById("homePriceHistory");
      history.setAttribute("aria-label", "Stored price history is unavailable.");
      const empty = document.createElement("div");
      empty.className = "chart-empty";
      empty.textContent = "Price history is temporarily unavailable.";
      history.replaceChildren(empty);
      document.getElementById("homeHistoryCaption").textContent =
        "History unavailable";
      status.classList.add("is-error");
      status.textContent =
        "The latest stored price is shown; its history could not be loaded.";
    }
  } catch (error) {
    console.error("[Home] Could not load stored mandi prices:", error);
    setUnavailable(
      error instanceof Error
        ? error.message
        : "Unable to load stored mandi prices.",
    );
  }
}

loadMarketPreview();
