/**
 * Rate GPT — Client-side API Service
 *
 * Strictly routes requests to the backend server (/api/v1/*).
 * Never exposes Government API keys or makes direct upstream calls from browser.
 */

import {
  ApiEnvelope,
  FilterMetaResponse,
  HealthResponse,
  MandiRecord,
  PaginationMeta,
  SyncLogItem,
  SyncStatusResponse,
} from "../types/mandi.js";

const BASE_URL = "/api/v1";

async function handleResponse<T>(res: Response): Promise<ApiEnvelope<T>> {
  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();

  if (!contentType.includes("application/json")) {
    // P0 deployment fix: avoid crashing on HTML/non-JSON responses (e.g. misrouted API).
    throw new Error(
      res.ok
        ? "Unexpected non-JSON response from server."
        : `Server returned ${res.status} ${res.statusText} (non-JSON).`,
    );
  }

  let json: ApiEnvelope<T>;
  try {
    json = JSON.parse(text) as ApiEnvelope<T>;
  } catch {
    throw new Error("Invalid JSON response from server.");
  }

  if (!res.ok && !json.error) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  if (!json.success && json.error) {
    throw new Error(json.error.message || "Request failed");
  }
  return json;
}

export const api = {
  async getHealth(signal?: AbortSignal): Promise<HealthResponse> {
    const res = await fetch(`${BASE_URL}/health`, { signal });
    const payload = await handleResponse<HealthResponse>(res);
    return payload.data;
  },

  async getFilters(
    state?: string,
    district?: string,
    signal?: AbortSignal,
  ): Promise<FilterMetaResponse> {
    const params = new URLSearchParams();
    if (state) params.set("state", state);
    if (district) params.set("district", district);
    const res = await fetch(`${BASE_URL}/meta/filters?${params.toString()}`, {
      signal,
    });
    const payload = await handleResponse<FilterMetaResponse>(res);
    return payload.data;
  },

  async getPrices(
    params: {
      state?: string;
      district?: string;
      market?: string;
      commodity?: string;
      variety?: string;
      date?: string;
      search?: string;
      limit?: number;
      offset?: number;
      sort?: string;
    },
    signal?: AbortSignal,
  ): Promise<{ records: MandiRecord[]; meta: PaginationMeta }> {
    const q = new URLSearchParams();
    if (params.state) q.set("state", params.state);
    if (params.district) q.set("district", params.district);
    if (params.market) q.set("market", params.market);
    if (params.commodity) q.set("commodity", params.commodity);
    if (params.variety) q.set("variety", params.variety);
    if (params.date) q.set("date", params.date);
    if (params.search) q.set("search", params.search);
    if (params.limit) q.set("limit", String(params.limit));
    if (params.offset !== undefined) q.set("offset", String(params.offset));
    if (params.sort) q.set("sort", params.sort);

    const res = await fetch(`${BASE_URL}/prices?${q.toString()}`, { signal });
    const payload = await handleResponse<MandiRecord[]>(res);
    return {
      records: payload.data,
      meta: payload.meta || {
        limit: params.limit || 50,
        offset: params.offset || 0,
        total: payload.data.length,
        hasNext: false,
      },
    };
  },

  async getTrend(
    commodity: string,
    market: string,
    state?: string,
    district?: string,
    signal?: AbortSignal,
  ): Promise<MandiRecord[]> {
    const q = new URLSearchParams({ commodity, market });
    if (state) q.set("state", state);
    if (district) q.set("district", district);

    const res = await fetch(`${BASE_URL}/prices/trend?${q.toString()}`, {
      signal,
    });
    const payload = await handleResponse<MandiRecord[]>(res);
    return payload.data;
  },

  async getComparison(
    commodity: string,
    date?: string,
    signal?: AbortSignal,
  ): Promise<MandiRecord[]> {
    const q = new URLSearchParams({ commodity });
    if (date) q.set("date", date);

    const res = await fetch(`${BASE_URL}/prices/compare?${q.toString()}`, {
      signal,
    });
    const payload = await handleResponse<MandiRecord[]>(res);
    return payload.data;
  },

  async searchCommodities(
    query: string,
    signal?: AbortSignal,
  ): Promise<string[]> {
    if (!query.trim()) return [];
    const q = new URLSearchParams({ q: query, limit: "10" });
    const res = await fetch(`${BASE_URL}/commodities/search?${q.toString()}`, {
      signal,
    });
    const payload = await handleResponse<string[]>(res);
    return payload.data;
  },

  async triggerSync(options: {
    state?: string;
    district?: string;
    market?: string;
    commodity?: string;
    arrivalDate?: string;
    adminKey?: string;
  }): Promise<{
    message: string;
    success: boolean;
    recordsFetched: number;
    recordsInserted: number;
    recordsUpdated: number;
  }> {
    const { adminKey, ...syncOptions } = options;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (adminKey) headers.Authorization = `Bearer ${adminKey}`;
    const res = await fetch(`${BASE_URL}/admin/sync`, {
      method: "POST",
      headers,
      body: JSON.stringify(syncOptions),
    });
    const payload = await handleResponse<{
      message: string;
      success: boolean;
      recordsFetched: number;
      recordsInserted: number;
      recordsUpdated: number;
    }>(res);
    return payload.data;
  },

  async getSyncLogs(adminKey: string): Promise<SyncLogItem[]> {
    const res = await fetch(`${BASE_URL}/admin/logs`, {
      headers: { Authorization: `Bearer ${adminKey}` },
    });
    const payload = await handleResponse<SyncLogItem[]>(res);
    return payload.data;
  },

  async getSyncStatus(signal?: AbortSignal): Promise<SyncStatusResponse> {
    const res = await fetch(`${BASE_URL}/sync-status`, { signal });
    const payload = await handleResponse<SyncStatusResponse>(res);
    return payload.data;
  },
};
