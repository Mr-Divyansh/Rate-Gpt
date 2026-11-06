/**
 * Database adapter boundary. SQLite is used when DATABASE_URL is absent;
 * PostgreSQL is used when DATABASE_URL is configured. All operations are async
 * at this boundary so Express routes and the sync service work with either.
 */
import type * as SqliteTypes from "./database.js";

let adapterPromise: Promise<any> | undefined;

async function getDb(): Promise<any> {
  if (!adapterPromise) {
    adapterPromise = (async () => {
      if (process.env.DATABASE_URL) {
        const pg = await import("./pg-database.js");
        await pg.initDb();
        return pg;
      }
      if (process.env.VERCEL) {
        throw new Error("DATABASE_URL is required on Vercel; SQLite is only supported for local development.");
      }
      return import("./database.js");
    })();
  }
  return adapterPromise;
}

export type RawMandiInput = SqliteTypes.RawMandiInput;
export type GetPricesParams = SqliteTypes.GetPricesParams;
export type QueryFiltersParams = SqliteTypes.QueryFiltersParams;
export type SyncLogRecord = SqliteTypes.SyncLogRecord;

export async function getFilterMetadata(params: QueryFiltersParams) {
  return (await getDb()).getFilterMetadata(params);
}
export async function getMandiPrices(params: GetPricesParams) {
  return (await getDb()).getMandiPrices(params);
}
export async function getPriceTrend(...args: Parameters<typeof import("./database.js").getPriceTrend>) {
  return (await getDb()).getPriceTrend(...args);
}
export async function getMarketComparison(...args: Parameters<typeof import("./database.js").getMarketComparison>) {
  return (await getDb()).getMarketComparison(...args);
}
export async function searchCommodities(...args: Parameters<typeof import("./database.js").searchCommodities>) {
  return (await getDb()).searchCommodities(...args);
}
export async function getDatabaseStats() {
  return (await getDb()).getDatabaseStats();
}
export async function getRecentSyncLogs(limit = 10) {
  return (await getDb()).getRecentSyncLogs(limit);
}
export async function insertSyncLog(log: Omit<SyncLogRecord, "id">) {
  return (await getDb()).insertSyncLog(log);
}
export async function upsertMandiPrices(records: RawMandiInput[]) {
  return (await getDb()).upsertMandiPrices(records);
}
