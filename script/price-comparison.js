export function summarizeModalComparison(records) {
  const groups = new Map();
  for (const record of Array.isArray(records) ? records : []) {
    if (!record || typeof record.commodity !== "string" || !record.commodity.trim()) continue;
    if (typeof record.source_unit !== "string" || !record.source_unit.trim()) continue;
    if (typeof record.market !== "string" || !record.market.trim()) continue;
    const commodity = record.commodity.trim();
    if (!groups.has(commodity)) groups.set(commodity, []);
    groups.get(commodity).push(record);
  }

  return [...groups.entries()].map(([commodity, group]) => {
    const units = [...new Set(group.map((record) => record.source_unit.trim()))];
    const missingModal = group.filter((record) => !Number.isFinite(Number(record.modal_price)) || record.modal_price === null || record.modal_price === "").length;
    if (units.length !== 1) {
      return {
        commodity,
        comparable: false,
        reason: "incompatible-units",
        sourceUnit: null,
        units,
        highest: [],
        missingModal,
        recordCount: group.length,
        mixedVariety: false,
        caveat: "Prices in different units are not compared.",
      };
    }

    const priced = group.filter((record) => {
      const price = Number(record.modal_price);
      return record.modal_price !== null && record.modal_price !== "" && Number.isFinite(price);
    });
    if (priced.length === 0) {
      return {
        commodity,
        comparable: false,
        reason: "missing-modal",
        sourceUnit: units[0],
        units,
        highest: [],
        missingModal,
        recordCount: group.length,
        mixedVariety: false,
        caveat: "No loaded record has a modal price, so no mandi is ranked.",
      };
    }

    const highestPrice = Math.max(...priced.map((record) => Number(record.modal_price)));
    const highest = priced
      .filter((record) => Number(record.modal_price) === highestPrice)
      .map((record) => ({
        market: record.market,
        district: record.district ?? "",
        state: record.state ?? "",
        arrival_date: record.arrival_date ?? "",
        variety: record.variety ?? null,
        grade: record.grade ?? null,
        min_price: record.min_price ?? null,
        max_price: record.max_price ?? null,
        modal_price: Number(record.modal_price),
        source_unit: units[0],
      }));
    const varietyKey = (record) => `${record.variety ?? ""}|${record.grade ?? ""}`.trim().toLocaleLowerCase();
    const mixedVariety = new Set(priced.map(varietyKey)).size > 1;
    return {
      commodity,
      comparable: true,
      reason: highest.length > 1 ? "tie" : "highest-modal",
      sourceUnit: units[0],
      units,
      highest,
      missingModal,
      recordCount: group.length,
      mixedVariety,
      caveat: "Highest reported modal price among the loaded records. Transport, quality, and actual sale conditions are not included.",
    };
  });
}

export function buildPreviousObservationIndex(records) {
  const groups = new Map();
  for (const record of records) {
    const keyParts = [
      record.state,
      record.district,
      record.market,
      record.commodity,
      record.variety ?? "",
      record.grade ?? "",
      record.source_unit,
    ];
    if (keyParts.some((value) => typeof value !== "string" || !value.trim())) continue;
    if (!isIsoDate(record.arrival_date)) continue;
    const key = keyParts.map((value) => value.trim().toLocaleLowerCase()).join("|");
    if (!groups.has(key)) groups.set(key, new Map());
    const dates = groups.get(key);
    if (!dates.has(record.arrival_date)) dates.set(record.arrival_date, []);
    dates.get(record.arrival_date).push(record);
  }

  const previousByRecord = new WeakMap();
  for (const dates of groups.values()) {
    const orderedDates = [...dates.keys()].sort();
    for (let index = 1; index < orderedDates.length; index += 1) {
      const current = dates.get(orderedDates[index]);
      const previous = dates.get(orderedDates[index - 1]);
      if (current.length !== 1 || previous.length !== 1) continue;
      previousByRecord.set(current[0], previous[0]);
    }
  }
  return (record) => previousByRecord.get(record) ?? null;
}

export function calculatePriceDelta(current, previous) {
  const now = comparablePrice(current);
  const before = comparablePrice(previous);
  if (now === null || before === null) return null;
  const difference = now - before;
  return {
    difference,
    percentage: before > 0 ? (Math.abs(difference) / before) * 100 : null,
  };
}

function comparablePrice(value) {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const text = String(value).trim();
  if (!/^\d+(?:\.\d+)?$/.test(text)) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function isIsoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
