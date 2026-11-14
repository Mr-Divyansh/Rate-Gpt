export const MAX_CSV_EXPORT_RECORDS = 5_000;
export const MAX_CSV_EXPORT_PAGES = 50;
const MAX_PAGE_SIZE = 100;
const MAX_OFFSET = 1_000_000;

const CSV_COLUMNS = [
  ["State", "state"],
  ["District", "district"],
  ["Market", "market"],
  ["Commodity", "commodity"],
  ["Variety", "variety"],
  ["Grade", "grade"],
  ["Arrival date", "arrival_date"],
  ["Minimum price", "min_price"],
  ["Maximum price", "max_price"],
  ["Modal price", "modal_price"],
  ["Unit", "source_unit"],
];

function priceCell(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? String(value)
    : "";
}

function escapeCsvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  const safeText = /^[\t\r\n ]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
}

export function recordsToCsv(records) {
  if (!Array.isArray(records)) throw new TypeError("CSV records must be an array.");
  const header = CSV_COLUMNS.map(([name]) => escapeCsvCell(name)).join(",");
  const rows = records.map((record) =>
    CSV_COLUMNS.map(([, key]) =>
      escapeCsvCell(
        key.endsWith("_price") ? priceCell(record?.[key]) : record?.[key],
      ),
    ).join(","),
  );
  return `\uFEFF${[header, ...rows].join("\r\n")}\r\n`;
}

function throwIfAborted(signal) {
  if (!signal?.aborted) return;
  throw signal.reason ?? new DOMException("CSV export cancelled.", "AbortError");
}

function recordKey(record) {
  if (typeof record?.id === "string" && record.id) return `id:${record.id}`;
  return [
    record?.state,
    record?.district,
    record?.market,
    record?.commodity,
    record?.variety ?? "",
    record?.arrival_date,
  ].join("|").toLocaleLowerCase();
}

/**
 * @param {{
 *   params: Record<string, string>,
 *   fetchPage: (params: Record<string, string>, options: { signal?: AbortSignal }) => Promise<any>,
 *   signal?: AbortSignal,
 *   onProgress?: (progress: { records: number, pages: number, total: number | null }) => void,
 *   maxRecords?: number,
 *   maxPages?: number
 * }} options
 */
export async function fetchAllMatchingRecords(options) {
  const {
    params,
    fetchPage,
    signal,
    onProgress = () => {},
    maxRecords = MAX_CSV_EXPORT_RECORDS,
    maxPages = MAX_CSV_EXPORT_PAGES,
  } = options;
  if (typeof fetchPage !== "function") {
    throw new TypeError("A live page fetch function is required.");
  }
  if (!Number.isInteger(maxRecords) || maxRecords < 1) {
    throw new RangeError("The export record limit must be a positive integer.");
  }
  if (!Number.isInteger(maxPages) || maxPages < 1) {
    throw new RangeError("The export page limit must be a positive integer.");
  }

  const records = [];
  const seen = new Set();
  let offset = 0;
  let pages = 0;
  let reportedTotal = null;

  while (true) {
    throwIfAborted(signal);
    if (pages >= maxPages) {
      throw new Error("Export limit reached. Narrow the filters and try again.");
    }

    const page = await fetchPage(
      { ...params, limit: String(MAX_PAGE_SIZE), offset: String(offset) },
      { signal },
    );
    const meta = page?.meta;
    const sourceHasNext =
      typeof meta?.upstreamHasNext === "boolean"
        ? meta.upstreamHasNext
        : meta?.hasNext;
    if (
      !Array.isArray(page?.data) ||
      !meta ||
      meta.offset !== offset ||
      !Number.isInteger(meta.limit) ||
      meta.limit < 1 ||
      meta.limit > MAX_PAGE_SIZE ||
      !Number.isInteger(meta.nextOffset) ||
      meta.nextOffset < offset ||
      meta.nextOffset > offset + meta.limit ||
      typeof meta.hasNext !== "boolean" ||
      (meta.nextOffset === offset && (page.data.length > 0 || sourceHasNext))
    ) {
      throw new Error("The live API returned invalid export pagination data.");
    }
    if (meta.total !== null && (!Number.isInteger(meta.total) || meta.total < 0)) {
      throw new Error("The live API returned an invalid export total.");
    }
    if (
      reportedTotal !== null &&
      meta.total !== null &&
      meta.total !== reportedTotal
    ) {
      throw new Error("The live API returned inconsistent totals during export.");
    }
    if (meta.total !== null) reportedTotal = meta.total;
    if (meta.truncated) {
      throw new Error("The API pagination boundary was reached. Narrow the filters to export all matching records.");
    }
    if (reportedTotal !== null && meta.nextOffset > reportedTotal) {
      throw new Error("The live API returned inconsistent export pagination data.");
    }

    pages += 1;
    for (const record of page.data) {
      const key = recordKey(record);
      if (seen.has(key)) continue;
      seen.add(key);
      records.push(record);
      if (records.length > maxRecords) {
        throw new Error("Export limit reached. Narrow the filters and try again.");
      }
    }
    onProgress({ records: records.length, pages, total: reportedTotal });

    if (!sourceHasNext) {
      if (reportedTotal !== null && meta.nextOffset < reportedTotal) {
        throw new Error("The live API stopped before all reported records were paged.");
      }
      return { records, pages, total: reportedTotal };
    }
    if (!meta.hasNext || meta.nextOffset > MAX_OFFSET) {
      throw new Error("The API pagination boundary was reached. Narrow the filters to export all matching records.");
    }

    offset = meta.nextOffset;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

export function createCsvFilename(market, date) {
  const safeMarket = String(market || "market")
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80) || "market";
  const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "export";
  return `${safeMarket}-prices-${safeDate}.csv`;
}
