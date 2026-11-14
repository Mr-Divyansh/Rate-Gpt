# Rate GPT — REST API

**Base URL:** `/api/v1`

Government data requests are made only by the backend. `DATA_GOV_API_KEY` is
never returned to the browser. Live responses use `Cache-Control: no-store`;
Rate-GPT does not persist fetched price pages.

## Endpoints

### `GET /health`
Reports API health, whether the upstream key is configured (boolean only), the
OGD/AGMARKNET source, and that price storage is disabled.

### `GET /meta/filters`
Optional `state`, `district`, and `market` filters. Returns the configured
Indian state/UT names and distinct locations/commodities seen in a bounded
100-record live page for a selected location. District and market choices may
therefore be partial; the API does not crawl the national dataset to populate
filter lists.

### `GET /prices`
Optional `state`, `district`, `market`, `commodity`, `date` (`YYYY-MM-DD`),
and `search` filters; `limit` (1–100, default 50), `offset` (0–1,000,000),
and `sort`. Each call requests only that page from OGD/AGMARKNET.

The success envelope includes `data` and `meta`:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "limit": 50,
    "offset": 0,
    "nextOffset": 50,
    "total": 123,
    "hasNext": true,
    "source": "Government of India OGD / AGMARKNET",
    "fetchedAt": "2026-11-13T00:00:00.000Z",
    "cacheStatus": "live",
    "freshnessStatus": "Government-published daily market data; not guaranteed real-time trading prices."
  },
  "message": "Live prices fetched successfully"
}
```

`total` is `null` if OGD omits it. Missing prices remain `null`; records are
never assigned fallback values. `502`, `503`, and `504` errors describe
upstream failures without returning credentials or response bodies.

### `GET /commodities/search?q=...&limit=10`
Searches live government records and provides the eight fruit names as
autocomplete suggestions. Suggestions do not imply that a mandi price exists;
only `/prices` results are price data.

### `GET /sync-status`
Reports `mode: "on-demand"`, `bulkSyncEnabled: false`, and
`schedulerEnabled: false`. It does not report a database sync as data freshness.

### Legacy historical endpoints
`GET /prices/trend` and `GET /prices/compare` remain read-only compatibility
routes over any pre-existing database observations. The live prices/filter
routes do not read from or write to those tables.

## Removed routes

`POST /admin/sync`, `GET /admin/logs`, and `GET /scheduler/sync` have been
removed. There is no daily cron or bulk database synchronization.
