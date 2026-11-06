/**
 * Rate GPT — Type Definitions for Agricultural Mandi Market Data
 */

export interface MandiRecord {
  id: string;
  source_record_id: string | null;
  state: string;
  district: string;
  market: string;
  commodity: string;
  variety: string | null;
  grade: string | null;
  arrival_date: string; // YYYY-MM-DD
  min_price: number | null;
  max_price: number | null;
  modal_price: number | null;
  source_unit: string;
  dedup_key: string;
  first_fetched_at: string;
  last_fetched_at: string;
}

export interface PaginationMeta {
  limit: number;
  offset: number;
  total: number;
  hasNext: boolean;
}

export interface FilterMetaResponse {
  states: string[];
  districts: string[];
  markets: string[];
  commodities: string[];
}

export interface HealthResponse {
  status: string;
  version: string;
  upstreamSource: {
    name: string;
    resourceId: string;
    apiKeyConfigured: boolean;
  };
  stats: {
    totalRecords: number;
    commoditiesTracked: number;
    mandisCovered: number;
    statesCovered: number;
    latestArrivalDate: string | null;
    lastSync?: {
      status: string;
      started_at: string;
      completed_at: string | null;
      records_inserted: number;
      records_updated: number;
      error_message: string | null;
    };
  };
  serverTime: string;
}

export interface SyncLogItem {
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

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta | any;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
