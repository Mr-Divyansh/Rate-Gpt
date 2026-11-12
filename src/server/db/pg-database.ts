/**
 * Rate GPT — PostgreSQL Database Layer (Neon)
 *
 * Provides a PostgreSQL-backed storage engine using `pg` (node-postgres)
 * with connection pooling for serverless environments.
 *
 * Exposes the same interface as sqlite-database.ts so the rest of the
 * application can switch between SQLite (local/dev) and PostgreSQL
 * (production on Neon) without changing route handlers.
 *
 * All functions are async because the pg driver is asynchronous.
 */

import { Pool, QueryResult } from "pg";
import { getDatabaseConnectionString } from "./database-config.js";

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

export async function getFilterMetadata(params: QueryFiltersParams): Promise<{
  states: string[];
  districts: string[];
  markets: string[];
  commodities: string[];
}> {
  const pool = await getPool();
  const stateFilter = params.state ? `WHERE state = $1` : "";
  const stateParam = params.state ? [params.state] : [];

  const stateRes = await pool.query(
    `SELECT DISTINCT state FROM mandi_prices ${stateFilter} ORDER BY state`,
    stateParam,
  );
  const states = stateRes.rows.map((r) => r.state);

  let districtRes: QueryResult;
  let marketRes: QueryResult;
  let commodityRes: QueryResult;

  const districtConditions: string[] = [];
  const districtValues: string[] = [];
  if (params.state) { districtValues.push(params.state); districtConditions.push(`state = $${districtValues.length}`); }
  const districtWhere = districtConditions.length ? `WHERE ${districtConditions.join(" AND ")}` : "";
  districtRes = await pool.query(`SELECT DISTINCT district FROM mandi_prices ${districtWhere} ORDER BY district`, districtValues);

  const marketConditions: string[] = [];
  const marketValues: string[] = [];
  if (params.state) { marketValues.push(params.state); marketConditions.push(`state = $${marketValues.length}`); }
  if (params.district) { marketValues.push(params.district); marketConditions.push(`district = $${marketValues.length}`); }
  const marketWhere = marketConditions.length ? `WHERE ${marketConditions.join(" AND ")}` : "";
  marketRes = await pool.query(`SELECT DISTINCT market FROM mandi_prices ${marketWhere} ORDER BY market`, marketValues);

  const commodityValues: string[] = [];
  let commodityWhere = "";
  if (params.search) { commodityValues.push(`%${params.search}%`); commodityWhere = "WHERE commodity ILIKE $1"; }
  commodityRes = await pool.query(`SELECT DISTINCT commodity FROM mandi_prices ${commodityWhere} ORDER BY commodity`, commodityValues);

  return {
    states: stateRes.rows.map((r) => r.state),
    districts: districtRes.rows.map((r) => r.district),
    markets: marketRes.rows.map((r) => r.market),
    commodities: commodityRes.rows.map((r) => r.commodity),
  };
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

export interface RawMandiInput {
  state: string;
  district: string;
  market: string;
  commodity: string;
  variety: string | null;
  arrivalDate: string;
  minPrice: number | null;
  maxPrice: number | null;
  modalPrice: number | null;
  grade: string | null;
  sourceUnit: string;
  sourceRecordId: string | null;
}

export async function getMandiPrices(params: GetPricesParams): Promise<{
  records: MandiPriceRecord[];
  meta: { limit: number; offset: number; total: number; hasNext: boolean };
}> {
  const pool = await getPool();
  const limit = Math.min(Math.max(params.limit || 50, 1), 100);
  const offset = Math.max(params.offset || 0, 0);

  const conditions: string[] = [];
  const values: any[] = [];
  let paramIdx = 1;

  if (params.state) {
    values.push(params.state);
    conditions.push(`state = $${paramIdx++}`);
  }
  if (params.district) {
    values.push(params.district);
    conditions.push(`district = $${paramIdx++}`);
  }
  if (params.market) {
    values.push(params.market);
    conditions.push(`market = $${paramIdx++}`);
  }
  if (params.commodity) {
    values.push(params.commodity);
    conditions.push(`commodity = $${paramIdx++}`);
  }
  if (params.variety) {
    values.push(params.variety);
    conditions.push(`variety = $${paramIdx++}`);
  }
  if (params.search) {
    values.push(`%${params.search}%`);
    conditions.push(
      `(commodity ILIKE $${paramIdx} OR market ILIKE $${paramIdx} OR district ILIKE $${paramIdx} OR state ILIKE $${paramIdx})`,
    );
    paramIdx++;
  }
  if (params.date) {
    values.push(params.date);
    conditions.push(`arrival_date = $${paramIdx++}`);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countRes = await pool.query(
    `SELECT COUNT(*) as total FROM mandi_prices ${whereClause}`,
    values,
  );
  const total = parseInt(countRes.rows[0].total, 10);

  const orderBy =
    params.sort === "date_asc"
      ? "arrival_date ASC"
      : params.sort === "modal_price_asc"
        ? "modal_price ASC NULLS LAST"
        : params.sort === "modal_price_desc"
          ? "modal_price DESC NULLS LAST"
          : params.sort === "commodity_asc"
            ? "commodity ASC"
            : params.sort === "commodity_desc"
              ? "commodity DESC"
              : params.sort === "market_asc"
                ? "market ASC"
                : params.sort === "market_desc"
                  ? "market DESC"
                  : "arrival_date DESC";

  const dataRes = await pool.query(
    `SELECT * FROM mandi_prices ${whereClause} ORDER BY ${orderBy} LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    [...values, limit, offset],
  );

  const records = dataRes.rows.map((r: any) => ({
    id: r.id,
    source_record_id: r.source_record_id,
    state: r.state,
    district: r.district,
    market: r.market,
    commodity: r.commodity,
    variety: r.variety,
    grade: r.grade,
    arrival_date: r.arrival_date,
    min_price: r.min_price,
    max_price: r.max_price,
    modal_price: r.modal_price,
    source_unit: r.source_unit,
    dedup_key: r.dedup_key,
    first_fetched_at: r.first_fetched_at,
    last_fetched_at: r.last_fetched_at,
  }));

  return {
    records,
    meta: {
      limit,
      offset,
      total,
      hasNext: offset + limit < total,
    },
  };
}

export interface QueryFiltersParams {
  state?: string;
  district?: string;
  market?: string;
  search?: string;
}

export interface GetPricesParams {
  state?: string;
  district?: string;
  market?: string;
  commodity?: string;
  variety?: string;
  search?: string;
  date?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}

export async function getPriceTrend(
  commodity: string,
  market: string,
  state?: string,
  district?: string,
  from?: string,
  to?: string,
): Promise<MandiPriceRecord[]> {
  const pool = await getPool();
  const conditions: string[] = [`commodity = $1`, `market = $2`];
  const values: any[] = [commodity, market];
  let paramIdx = 3;

  if (state) {
    values.push(state);
    conditions.push(`state = $${paramIdx++}`);
  }
  if (district) {
    values.push(district);
    conditions.push(`district = $${paramIdx++}`);
  }
  if (from) {
    values.push(from);
    conditions.push(`arrival_date >= $${paramIdx++}`);
  }
  if (to) {
    values.push(to);
    conditions.push(`arrival_date <= $${paramIdx++}`);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const res = await pool.query(
    `SELECT * FROM mandi_prices ${whereClause} ORDER BY arrival_date ASC, modal_price DESC`,
    values,
  );

  return res.rows.map((r: any) => ({
    id: r.id,
    source_record_id: r.source_record_id,
    state: r.state,
    district: r.district,
    market: r.market,
    commodity: r.commodity,
    variety: r.variety,
    grade: r.grade,
    arrival_date: r.arrival_date,
    min_price: r.min_price,
    max_price: r.max_price,
    modal_price: r.modal_price,
    source_unit: r.source_unit,
    dedup_key: r.dedup_key,
    first_fetched_at: r.first_fetched_at,
    last_fetched_at: r.last_fetched_at,
  }));
}
export async function getMarketComparison(
  commodity: string,
  targetDate?: string,
): Promise<MandiPriceRecord[]> {
  const pool = await getPool();

  // If no date is specified, resolve to the latest available date for this
  // commodity (matching database.ts). Without this, the comparison would mix
  // records from every date ever synced instead of comparing markets as of
  // the same point in time.
  let date = targetDate;
  if (!date) {
    const latestRes = await pool.query(
      `SELECT MAX(arrival_date) as "maxDate" FROM mandi_prices WHERE commodity = $1`,
      [commodity],
    );
    date = latestRes.rows[0]?.maxDate || undefined;
  }

  if (!date) {
    return [];
  }

  const res = await pool.query(
    `SELECT * FROM mandi_prices WHERE commodity = $1 AND arrival_date = $2 ORDER BY modal_price DESC NULLS LAST`,
    [commodity, date],
  );

  return res.rows.map((r: any) => ({
    id: r.id,
    source_record_id: r.source_record_id,
    state: r.state,
    district: r.district,
    market: r.market,
    commodity: r.commodity,
    variety: r.variety,
    grade: r.grade,
    arrival_date: r.arrival_date,
    min_price: r.min_price,
    max_price: r.max_price,
    modal_price: r.modal_price,
    source_unit: r.source_unit,
    dedup_key: r.dedup_key,
    first_fetched_at: r.first_fetched_at,
    last_fetched_at: r.last_fetched_at,
  }));
}
export async function searchCommodities(
  query: string,
  limit: number = 10,
): Promise<string[]> {
  const pool = await getPool();
  const res = await pool.query(
    `SELECT DISTINCT commodity FROM mandi_prices WHERE commodity ILIKE $1 ORDER BY commodity LIMIT $2`,
    [`%${query}%`, limit],
  );
  return res.rows.map((r: any) => r.commodity);
}

let pool: Pool | null = null;

async function getPool(): Promise<Pool> {
  if (!pool) {
    const connectionString = getDatabaseConnectionString();
    if (!connectionString) {
      throw new Error(
        "PostgreSQL connection is not configured. Set DATABASE_URL or POSTGRES_URL.",
      );
    }
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: true },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    pool.on("error", (err) => {
      console.error("[PG] Unexpected pool error:", err);
    });
  }
  return pool;
}

export async function upsertMandiPrices(
  records: RawMandiInput[],
): Promise<{ inserted: number; updated: number }> {
  if (records.length === 0) return { inserted: 0, updated: 0 };

  const pool = await getPool();
  const client = await pool.connect();
  const nowIso = new Date().toISOString();
  let inserted = 0;
  const recordsByKey = new Map<string, RawMandiInput>();

  for (const record of records) {
    recordsByKey.set(
      generateDedupKey(
        record.state,
        record.district,
        record.market,
        record.commodity,
        record.variety || "Other",
        record.arrivalDate,
      ),
      record,
    );
  }

  try {
    await client.query("BEGIN");
    const entries = Array.from(recordsByKey.entries());
    const batchSize = 250;

    for (let start = 0; start < entries.length; start += batchSize) {
      const batch = entries.slice(start, start + batchSize);
      const values: unknown[] = [];
      const placeholders = batch.map(([dedupKey, record]) => {
        const rowValues = [
          `rec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          record.sourceRecordId || null,
          record.state,
          record.district,
          record.market,
          record.commodity,
          record.variety || "Other",
          record.grade || "FAQ",
          record.arrivalDate,
          record.minPrice,
          record.maxPrice,
          record.modalPrice,
          record.sourceUnit || "Rs/Quintal",
          dedupKey,
          nowIso,
          nowIso,
        ];
        const firstParameter = values.length + 1;
        values.push(...rowValues);
        return `(${rowValues
          .map((_, index) => `$${firstParameter + index}`)
          .join(", ")})`;
      });

      const result = await client.query(
        `INSERT INTO mandi_prices (
          id, source_record_id, state, district, market, commodity,
          variety, grade, arrival_date, min_price, max_price, modal_price,
          source_unit, dedup_key, first_fetched_at, last_fetched_at
        ) VALUES ${placeholders.join(", ")}
        ON CONFLICT (dedup_key) DO UPDATE SET
          min_price = EXCLUDED.min_price,
          max_price = EXCLUDED.max_price,
          modal_price = EXCLUDED.modal_price,
          grade = EXCLUDED.grade,
          variety = EXCLUDED.variety,
          source_unit = EXCLUDED.source_unit,
          last_fetched_at = EXCLUDED.last_fetched_at
        RETURNING (xmax = 0) AS was_inserted`,
        values,
      );
      inserted += result.rows.filter((row) => row.was_inserted).length;
    }
    await client.query("COMMIT");
    return { inserted, updated: records.length - inserted };
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch { /* preserve the original database error */ }
    throw error;
  } finally {
    client.release();
  }
}

export async function getDatabaseStats(): Promise<{
  totalRecords: number;
  commoditiesCount: number;
  mandisCount: number;
  statesCount: number;
  latestArrivalDate: string | null;
  lastSync: SyncLogRecord | undefined;
  lastSuccessfulSync: SyncLogRecord | undefined;
}> {
  const pool = await getPool();
  const totalRes = await pool.query(
    "SELECT COUNT(*) as count FROM mandi_prices",
  );
  const commRes = await pool.query(
    "SELECT COUNT(DISTINCT commodity) as count FROM mandi_prices",
  );
  const mandiRes = await pool.query(
    "SELECT COUNT(DISTINCT market) as count FROM mandi_prices",
  );
  const stateRes = await pool.query(
    "SELECT COUNT(DISTINCT state) as count FROM mandi_prices",
  );
  const latestRes = await pool.query(
    "SELECT MAX(arrival_date) as maxDate FROM mandi_prices",
  );
  const syncRes = await pool.query(
    "SELECT * FROM sync_logs ORDER BY started_at DESC LIMIT 1",
  );
  const successfulSyncRes = await pool.query(
    "SELECT * FROM sync_logs WHERE status = 'SUCCESS' ORDER BY completed_at DESC LIMIT 1",
  );

  return {
    totalRecords: parseInt(totalRes.rows[0].count, 10),
    commoditiesCount: parseInt(commRes.rows[0].count, 10),
    mandisCount: parseInt(mandiRes.rows[0].count, 10),
    statesCount: parseInt(stateRes.rows[0].count, 10),
    latestArrivalDate: latestRes.rows[0]?.maxdate || null,
    lastSync: syncRes.rows[0] ? (syncRes.rows[0] as SyncLogRecord) : undefined,
    lastSuccessfulSync: successfulSyncRes.rows[0]
      ? (successfulSyncRes.rows[0] as SyncLogRecord)
      : undefined,
  };
}

export async function acquireMandiSyncLock(): Promise<(() => Promise<void>) | null> {
  const pool = await getPool();
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT pg_try_advisory_lock($1, $2) AS locked",
      [77343291, 1],
    );
    if (!result.rows[0]?.locked) {
      client.release();
      return null;
    }

    let released = false;
    return async () => {
      if (released) return;
      released = true;
      try {
        await client.query("SELECT pg_advisory_unlock($1, $2)", [77343291, 1]);
      } finally {
        client.release();
      }
    };
  } catch (error) {
    client.release();
    throw error;
  }
}

export async function getRecentSyncLogs(
  limit: number = 10,
): Promise<SyncLogRecord[]> {
  const pool = await getPool();
  const res = await pool.query(
    "SELECT * FROM sync_logs ORDER BY started_at DESC LIMIT $1",
    [limit],
  );
  return res.rows as SyncLogRecord[];
}

export async function insertSyncLog(
  log: Omit<SyncLogRecord, "id">,
): Promise<string> {
  const pool = await getPool();
  const id = `sync-${Date.now()}`;
  await pool.query(
    `INSERT INTO sync_logs (
      id, status, requested_date, state_filter, records_fetched,
      records_inserted, records_updated, error_message, started_at, completed_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [id, log.status, log.requested_date, log.state_filter, log.records_fetched,
      log.records_inserted, log.records_updated, log.error_message, log.started_at, log.completed_at],
  );
  return id;
}

export async function initDb(): Promise<void> {
  const pool = await getPool();
  await pool.query(`
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
    )
  `);
  await pool.query(`
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
    )
  `);
  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_mandi_location ON mandi_prices(state, district, market)",
  );
  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_mandi_commodity ON mandi_prices(commodity)",
  );
  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_mandi_arrival_date ON mandi_prices(arrival_date)",
  );
  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_mandi_state_commodity_date ON mandi_prices(state, commodity, arrival_date)",
  );
  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_mandi_market_commodity_date ON mandi_prices(market, commodity, arrival_date)",
  );
  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_sync_started_at ON sync_logs(started_at)",
  );
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export function generateDedupKey(
  state: string,
  district: string,
  market: string,
  commodity: string,
  variety: string | null,
  arrivalDate: string,
): string {
  // Must match database.ts's (SQLite) normalization exactly: trim each field
  // individually, not just lowercase the joined string. Otherwise identical
  // records that differ only in incidental whitespace (common in upstream
  // government data) get different dedup keys under Postgres than they would
  // under SQLite, producing duplicate rows instead of being deduped/updated.
  const norm = (s: string | null | undefined) => (s || "").trim().toLowerCase();
  return `${norm(state)}|${norm(district)}|${norm(market)}|${norm(commodity)}|${norm(variety || "Other")}|${norm(arrivalDate)}`;
}
