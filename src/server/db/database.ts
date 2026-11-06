/**
 * Rate GPT — Embedded Database Layer
 *
 * Provides an ACID-compliant local SQLite storage engine using `better-sqlite3`
 * with tables matching the schema documented in `architecture.md`.
 *
 * Local SQLite storage engine. Production adapter selection is handled by database-factory.ts.
 */

import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lazy-load better-sqlite3 so a native-binding failure is catchable and
// reported as JSON instead of crashing the serverless function at module load.
async function loadBetterSqlite3(): Promise<any> {
  try {
    const mod = await import("better-sqlite3");
    return mod.default ?? mod;
  } catch (err: any) {
    console.error(
      "[DB] Failed to load better-sqlite3 native module:",
      err?.stack || err?.message || err,
    );
    throw err;
  }
}

export interface MandiPriceRecord {
  id: string;
  source_record_id: string | null;
  state: string;
  district: string;
  market: string;
  commodity: string;
  variety: string | null;
  grade: string | null;
  arrival_date: string; // YYYY-MM-DD format
  min_price: number | null;
  max_price: number | null;
  modal_price: number | null;
  source_unit: string;
  dedup_key: string;
  first_fetched_at: string;
  last_fetched_at: string;
}

export interface SyncLogRecord {
  id: string;
  status: "SUCCESS" | "PARTIAL" | "FAILED" | "IN_PROGRESS" | "NOT_CONFIGURED";
  requested_date: string | null;
  state_filter: string | null;
  records_fetched: number;
  records_inserted: number;
  records_updated: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

console.log(
  `[DB] Resolving. VERCEL=${process.env.VERCEL || "false"}, NODE_ENV=${process.env.NODE_ENV || "unset"}`,
);

export async function resolveDbPath(): Promise<string | null> {
  // Step 1: Check explicitly configured database path (highest priority)
  const envDbPath = process.env.RATEGPT_DB_PATH || process.env.DB_PATH;
  if (envDbPath) {
    const resolved = path.resolve(envDbPath);
    try {
      if (fs.existsSync(resolved)) {
        // Validate it's a valid SQLite database by attempting to open it read-only
        try {
          const mod = await import("better-sqlite3");
          const DatabaseCtor: any = (mod as any).default ?? mod;
          const testDb = new DatabaseCtor(resolved, { readonly: true });
          testDb.close();
          console.log(`[DB] Using explicitly configured database: ${resolved}`);
          return resolved;
        } catch (openErr: any) {
          console.error(
            `[DB] Explicit database path exists but is not a valid SQLite file: ${resolved}`,
          );
          console.error(`[DB] Error: ${openErr.message || openErr}`);
          // Fall through to fallback paths rather than silently using wrong database
        }
      } else {
        console.error(
          `[DB] Explicit database path does not exist: ${resolved}`,
        );
        console.error(`[DB] Candidate paths will be used instead.`);
      }
    } catch (e: any) {
      console.error(
        `[DB] Error resolving explicit database path: ${e.message || e}`,
      );
    }
  } else {
    console.log(
      "[DB] No explicit database path configured via RATEGPT_DB_PATH or DB_PATH",
    );
  }

  // Step 2: Fall back to default candidate paths (in order of preference)
  const candidatePaths = [
    path.resolve(__dirname, "rategpt.db"),
    path.resolve(process.cwd(), "rategpt.db"),
    "/var/task/rategpt.db",
    "/tmp/rategpt.db",
  ];

  let dbPath: string | null = null;
  for (const candidate of candidatePaths) {
    try {
      if (fs.existsSync(candidate)) {
        dbPath = candidate;
        break;
      }
    } catch {
      // ignore stat errors
    }
  }

  if (dbPath) {
    console.log(`[DB] Using fallback database: ${dbPath}`);
  } else {
    console.error("[DB] No database file found in any candidate location.");
  }
  return dbPath;
}

const dbPath = await resolveDbPath();

console.log(`[DB] __dirname=${__dirname}, cwd=${process.cwd()}`);
console.log(`[DB] Resolved database path: ${dbPath ?? "(none found)"}`);
if (dbPath) {
  try {
    console.log(
      `[DB] File exists: true, size: ${fs.statSync(dbPath).size} bytes`,
    );
  } catch (e: any) {
    console.error("[DB] Failed to stat database file:", e?.message || e);
  }
} else {
  console.error("[DB] No database file found in any candidate location.");
}
function openDatabase(Database: any, filePath: string | null): any {
  if (!filePath) {
    const err = new Error("Database file not found in any candidate location.");
    console.error("[DB Init Error]", err.message);
    throw err;
  }
  // Try read-only first (works for bundled/read-only files on Vercel), then
  // read-write (needed for local dev and sync). This avoids "unable to open
  // database file" when the file is read-only.
  const modes: Array<{ readonly?: boolean; label: string }> = process.env.VERCEL
    ? [
        { readonly: true, label: "readonly" },
        { readonly: false, label: "readwrite" },
      ]
    : [
        { readonly: false, label: "readwrite" },
        { readonly: true, label: "readonly" },
      ];
  let lastErr: any = null;
  for (const mode of modes) {
    try {
      const instance = new Database(
        filePath,
        mode.readonly ? { readonly: true } : undefined,
      );
      console.log(`[DB] Opened OK (mode=${mode.label}).`);
      return instance;
    } catch (err: any) {
      lastErr = err;
      console.warn(
        `[DB] Open failed (mode=${mode.label}):`,
        err?.message || err,
      );
    }
  }
  console.error(
    "[DB Init Error] Failed to open database in all modes:",
    lastErr?.stack || lastErr?.message || lastErr,
  );
  throw lastErr;
}

const Database = await loadBetterSqlite3();
const resolvedDbPath = dbPath ?? path.resolve(process.cwd(), "rategpt.db");
const db = openDatabase(Database, resolvedDbPath);

// Journal mode is left as DELETE (default) so the bundled read-only database
// does not require -wal/-shm sidecar files on read-only filesystems (Vercel).

if (!process.env.VERCEL) {
  // Initialize database schema
  db.exec(`
  CREATE TABLE IF NOT EXISTS mandi_prices (
    id TEXT PRIMARY KEY,
    source_record_id TEXT,
    state TEXT NOT NULL,
    district TEXT NOT NULL,
    market TEXT NOT NULL,
    commodity TEXT NOT NULL,
    variety TEXT DEFAULT 'Other',
    grade TEXT DEFAULT 'FAQ',
    arrival_date TEXT NOT NULL,
    min_price REAL,
    max_price REAL,
    modal_price REAL,
    source_unit TEXT NOT NULL DEFAULT 'Rs/Quintal',
    dedup_key TEXT UNIQUE NOT NULL,
    first_fetched_at TEXT NOT NULL,
    last_fetched_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_mandi_location ON mandi_prices(state, district, market);
  CREATE INDEX IF NOT EXISTS idx_mandi_commodity ON mandi_prices(commodity);
  CREATE INDEX IF NOT EXISTS idx_mandi_arrival_date ON mandi_prices(arrival_date);
  CREATE INDEX IF NOT EXISTS idx_mandi_state_commodity_date ON mandi_prices(state, commodity, arrival_date);
  CREATE INDEX IF NOT EXISTS idx_mandi_market_commodity_date ON mandi_prices(market, commodity, arrival_date);

  CREATE TABLE IF NOT EXISTS sync_logs (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    requested_date TEXT,
    state_filter TEXT,
    records_fetched INTEGER NOT NULL DEFAULT 0,
    records_inserted INTEGER NOT NULL DEFAULT 0,
    records_updated INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    started_at TEXT NOT NULL,
    completed_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_sync_started_at ON sync_logs(started_at);
`);
}

/**
 * Generates a stable deduplication key for a mandi price observation.
 * Format: state|district|market|commodity|variety|arrival_date (all normalized lowercase)
 */
export function generateDedupKey(
  state: string,
  district: string,
  market: string,
  commodity: string,
  variety: string | null | undefined,
  arrivalDate: string,
): string {
  const norm = (s: string | null | undefined) => (s || "").trim().toLowerCase();
  return `${norm(state)}|${norm(district)}|${norm(market)}|${norm(commodity)}|${norm(variety || "other")}|${norm(arrivalDate)}`;
}

// Deliberately do not seed synthetic mandi-price records.

// --- Database Operations ---

export interface QueryFiltersParams {
  state?: string;
  district?: string;
  market?: string;
  search?: string;
}

export function getFilterMetadata(params: QueryFiltersParams) {
  let statesQuery =
    "SELECT DISTINCT state FROM mandi_prices ORDER BY state ASC";
  const states = (db.prepare(statesQuery).all() as { state: string }[]).map(
    (r) => r.state,
  );

  let districtsQuery = "SELECT DISTINCT district FROM mandi_prices";
  const districtConditions: string[] = [];
  const districtArgs: any[] = [];
  if (params.state) {
    districtConditions.push("state = ?");
    districtArgs.push(params.state);
  }
  if (districtConditions.length > 0) {
    districtsQuery += " WHERE " + districtConditions.join(" AND ");
  }
  districtsQuery += " ORDER BY district ASC";
  const districts = (
    db.prepare(districtsQuery).all(...districtArgs) as { district: string }[]
  ).map((r) => r.district);

  let marketsQuery = "SELECT DISTINCT market FROM mandi_prices";
  const marketConditions: string[] = [];
  const marketArgs: any[] = [];
  if (params.state) {
    marketConditions.push("state = ?");
    marketArgs.push(params.state);
  }
  if (params.district) {
    marketConditions.push("district = ?");
    marketArgs.push(params.district);
  }
  if (marketConditions.length > 0) {
    marketsQuery += " WHERE " + marketConditions.join(" AND ");
  }
  marketsQuery += " ORDER BY market ASC";
  const markets = (
    db.prepare(marketsQuery).all(...marketArgs) as { market: string }[]
  ).map((r) => r.market);

  let commoditiesQuery = "SELECT DISTINCT commodity FROM mandi_prices";
  const commArgs: any[] = [];
  if (params.search) {
    commoditiesQuery += " WHERE commodity LIKE ?";
    commArgs.push(`%${params.search}%`);
  }
  commoditiesQuery += " ORDER BY commodity ASC";
  const commodities = (
    db.prepare(commoditiesQuery).all(...commArgs) as { commodity: string }[]
  ).map((r) => r.commodity);

  return {
    states,
    districts,
    markets,
    commodities,
  };
}

export interface GetPricesParams {
  state?: string;
  district?: string;
  market?: string;
  commodity?: string;
  variety?: string;
  date?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sort?:
    | "modal_price_asc"
    | "modal_price_desc"
    | "market_asc"
    | "market_desc"
    | "date_desc"
    | "date_asc"
    | "commodity_asc"
    | "commodity_desc";
}

export function getMandiPrices(params: GetPricesParams) {
  const conditions: string[] = [];
  const args: any[] = [];

  if (params.state) {
    conditions.push("state = ?");
    args.push(params.state);
  }
  if (params.district) {
    conditions.push("district = ?");
    args.push(params.district);
  }
  if (params.market) {
    conditions.push("market = ?");
    args.push(params.market);
  }
  if (params.commodity) {
    conditions.push("commodity = ?");
    args.push(params.commodity);
  }
  if (params.variety) {
    conditions.push("variety = ?");
    args.push(params.variety);
  }
  if (params.date) {
    conditions.push("arrival_date = ?");
    args.push(params.date);
  }
  if (params.search && params.search.trim() !== "") {
    // Normalize common Hindi spellings to English (no duplicate records).
    const _aliases = { बैजनाथ: "baijnath" };
    let term = params.search.trim().toLowerCase();
    for (const [k, v] of Object.entries(_aliases)) {
      if (term.includes(k)) term = term.split(k).join(v);
    }
    conditions.push(
      "(instr(lower(commodity), ?) > 0 OR instr(lower(market), ?) > 0 OR instr(lower(district), ?) > 0 OR instr(lower(state), ?) > 0)",
    );
    args.push(term, term, term, term);
  }

  const whereClause =
    conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

  // Count total matching
  const countSql = `SELECT COUNT(*) as total FROM mandi_prices ${whereClause}`;
  const totalRow = db.prepare(countSql).get(...args) as { total: number };
  const total = totalRow.total;

  // Sorting (P0 audit fix: explicit allowlist of sort keys -> SQL fragments).
  const SORT_ALLOWLIST: Record<string, string> = {
    modal_price_asc: "modal_price IS NULL, modal_price ASC, arrival_date DESC",
    modal_price_desc:
      "modal_price IS NULL, modal_price DESC, arrival_date DESC",
    market_asc: "market ASC, arrival_date DESC",
    market_desc: "market DESC, arrival_date DESC",
    commodity_asc: "commodity ASC, arrival_date DESC",
    commodity_desc: "commodity DESC, arrival_date DESC",
    date_desc: "arrival_date DESC, commodity ASC, market ASC",
    date_asc: "arrival_date ASC, commodity ASC, market ASC",
  };
  const orderBy =
    SORT_ALLOWLIST[params.sort ?? ""] ??
    "arrival_date DESC, commodity ASC, market ASC";

  const limit = Math.min(Math.max(params.limit || 50, 1), 100);
  const offset = Math.max(params.offset || 0, 0);

  const querySql = `
    SELECT * FROM mandi_prices
    ${whereClause}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;
  const records = db
    .prepare(querySql)
    .all(...args, limit, offset) as MandiPriceRecord[];

  return {
    records,
    meta: {
      limit,
      offset,
      total,
      hasNext: offset + records.length < total,
    },
  };
}

export function getPriceTrend(
  commodity: string,
  market: string,
  state?: string,
  district?: string,
  from?: string,
  to?: string,
) {
  const conditions: string[] = ["commodity = ?", "market = ?"];
  const args: any[] = [commodity, market];

  if (state) {
    conditions.push("state = ?");
    args.push(state);
  }
  if (district) {
    conditions.push("district = ?");
    args.push(district);
  }
  if (from) {
    conditions.push("arrival_date >= ?");
    args.push(from);
  }
  if (to) {
    conditions.push("arrival_date <= ?");
    args.push(to);
  }

  const sql = `
    SELECT * FROM mandi_prices
    WHERE ${conditions.join(" AND ")}
    ORDER BY arrival_date ASC
  `;

  return db.prepare(sql).all(...args) as MandiPriceRecord[];
}

export function getMarketComparison(commodity: string, targetDate?: string) {
  // If targetDate not specified, pick latest available date for this commodity
  let date = targetDate;
  if (!date) {
    const latestRow = db
      .prepare(
        `
      SELECT MAX(arrival_date) as maxDate FROM mandi_prices WHERE commodity = ?
    `,
      )
      .get(commodity) as { maxDate: string | null };
    date = latestRow?.maxDate || undefined;
  }

  if (!date) {
    return [];
  }

  const sql = `
    SELECT * FROM mandi_prices
    WHERE commodity = ? AND arrival_date = ?
    ORDER BY modal_price DESC NULLS LAST
  `;

  return db.prepare(sql).all(commodity, date) as MandiPriceRecord[];
}

export function searchCommodities(query: string, limit: number = 10) {
  const sql = `
    SELECT DISTINCT commodity FROM mandi_prices
    WHERE commodity LIKE ?
    ORDER BY commodity ASC
    LIMIT ?
  `;
  const rows = db.prepare(sql).all(`%${query}%`, Math.min(limit, 50)) as {
    commodity: string;
  }[];
  return rows.map((r) => r.commodity);
}

export interface RawMandiInput {
  sourceRecordId?: string | null;
  state: string;
  district: string;
  market: string;
  commodity: string;
  variety?: string | null;
  grade?: string | null;
  arrivalDate: string; // YYYY-MM-DD
  minPrice: number | null;
  maxPrice: number | null;
  modalPrice: number | null;
  sourceUnit?: string;
}

export function upsertMandiPrices(records: RawMandiInput[]): {
  inserted: number;
  updated: number;
} {
  let inserted = 0;
  let updated = 0;

  const checkStmt = db.prepare(
    "SELECT id, arrival_date FROM mandi_prices WHERE dedup_key = ?",
  );
  const insertStmt = db.prepare(`
    INSERT INTO mandi_prices (
      id, source_record_id, state, district, market, commodity, variety, grade,
      arrival_date, min_price, max_price, modal_price, source_unit,
      dedup_key, first_fetched_at, last_fetched_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  const updateStmt = db.prepare(`
    UPDATE mandi_prices
    SET min_price = ?, max_price = ?, modal_price = ?, grade = ?, variety = ?,
        source_unit = ?, last_fetched_at = ?
    WHERE dedup_key = ?
  `);

  const batch = db.transaction(() => {
    const nowIso = new Date().toISOString();
    for (const r of records) {
      const dedupKey = generateDedupKey(
        r.state,
        r.district,
        r.market,
        r.commodity,
        r.variety,
        r.arrivalDate,
      );
      const existing = checkStmt.get(dedupKey) as { id: string } | undefined;

      if (existing) {
        updateStmt.run(
          r.minPrice,
          r.maxPrice,
          r.modalPrice,
          r.grade || "FAQ",
          r.variety || "Other",
          r.sourceUnit || "Rs/Quintal",
          nowIso,
          dedupKey,
        );
        updated++;
      } else {
        const id = `rec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        insertStmt.run(
          id,
          r.sourceRecordId || null,
          r.state,
          r.district,
          r.market,
          r.commodity,
          r.variety || "Other",
          r.grade || "FAQ",
          r.arrivalDate,
          r.minPrice,
          r.maxPrice,
          r.modalPrice,
          r.sourceUnit || "Rs/Quintal",
          dedupKey,
          nowIso,
          nowIso,
        );
        inserted++;
      }
    }
  });

  batch();
  return { inserted, updated };
}

export function insertSyncLog(log: Omit<SyncLogRecord, "id">): string {
  const id = `sync-${Date.now()}`;
  const stmt = db.prepare(`
    INSERT INTO sync_logs (
      id, status, requested_date, state_filter, records_fetched,
      records_inserted, records_updated, error_message, started_at, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    id,
    log.status,
    log.requested_date,
    log.state_filter,
    log.records_fetched,
    log.records_inserted,
    log.records_updated,
    log.error_message,
    log.started_at,
    log.completed_at,
  );
  return id;
}

export function getDatabaseStats() {
  const totalRow = db
    .prepare("SELECT COUNT(*) as count FROM mandi_prices")
    .get() as { count: number };
  const commRow = db
    .prepare("SELECT COUNT(DISTINCT commodity) as count FROM mandi_prices")
    .get() as { count: number };
  const mandiRow = db
    .prepare("SELECT COUNT(DISTINCT market) as count FROM mandi_prices")
    .get() as { count: number };
  const stateRow = db
    .prepare("SELECT COUNT(DISTINCT state) as count FROM mandi_prices")
    .get() as { count: number };
  const lastSync = db
    .prepare("SELECT * FROM sync_logs ORDER BY started_at DESC LIMIT 1")
    .get() as SyncLogRecord | undefined;
  const latestDateRow = db
    .prepare("SELECT MAX(arrival_date) as maxDate FROM mandi_prices")
    .get() as { maxDate: string | null };

  return {
    totalRecords: totalRow.count,
    commoditiesCount: commRow.count,
    mandisCount: mandiRow.count,
    statesCount: stateRow.count,
    latestArrivalDate: latestDateRow?.maxDate || null,
    lastSync,
  };
}

export function getRecentSyncLogs(limit: number = 10): SyncLogRecord[] {
  return db
    .prepare("SELECT * FROM sync_logs ORDER BY started_at DESC LIMIT ?")
    .all(limit) as SyncLogRecord[];
}
