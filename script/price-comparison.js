export function buildPreviousObservationIndex(records) {
  const groups = new Map();
  for (const record of records) {
    const keyParts = [
      record.state,
      record.district,
      record.market,
      record.commodity,
      record.variety ?? "",
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
