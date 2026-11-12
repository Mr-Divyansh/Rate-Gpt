# Rate GPT — REST API Specification

**Base URL:** `/api/v1`

## Standard Envelopes

### Success Envelope
```json
{
  "success": true,
  "data": [],
  "meta": {
    "limit": 50,
    "offset": 0,
    "total": 120,
    "hasNext": true
  },
  "message": "Prices fetched successfully"
}
```

### Error Envelope
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid query parameters",
    "details": {}
  }
}
```

---

## Endpoints

### 1. System Health
`GET /api/v1/health`
Returns backend health, database counts, and Government API integration status.

### 2. Cascading Filter Metadata
`GET /api/v1/meta/filters`
Query parameters:
- `state` (optional): Filter districts and markets to this state
- `district` (optional): Filter markets to this district
- `search` (optional): Filter commodity list

### 3. Mandi Prices Listing
`GET /api/v1/prices`
Query parameters:
- `state`: String
- `district`: String
- `market`: String
- `commodity`: String
- `variety`: String
- `date`: String (YYYY-MM-DD)
- `search`: String (searches commodity, market, district, state)
- `limit`: Integer (1–100, default 50)
- `offset`: Integer (default 0)
- `sort`: `modal_price_asc` | `modal_price_desc` | `market_asc` | `date_desc` | `commodity_asc`

### 4. Price Trends (Historical)
`GET /api/v1/prices/trend`
Query parameters:
- `commodity`: Required
- `market`: Required
- `state`: Optional
- `district`: Optional
- `from`: Optional (YYYY-MM-DD)
- `to`: Optional (YYYY-MM-DD)

### 5. Market Price Comparison
`GET /api/v1/prices/compare`
Query parameters:
- `commodity`: Required
- `date`: Optional

### 6. Commodity Search Autocomplete
`GET /api/v1/commodities/search`
Query parameters:
- `q`: Search string (required)
- `limit`: Integer (default 10)

### 7. Trigger Upstream Synchronization
`POST /api/v1/admin/sync`
Headers:
- `Authorization`: `Bearer <token>` (if `ADMIN_SYNC_KEY` is configured)
Payload:
```json
{
  "state": "Maharashtra",
  "commodity": "Onion",
  "limit": 100
}
```

### 8. Synchronization Audit Logs
`GET /api/v1/admin/logs`
Headers:
- `Authorization`: `Bearer <token>` (`ADMIN_SYNC_KEY`)

Returns the recent 20 sync execution records.

### 9. Sync Status
`GET /api/v1/sync-status`
Returns the last attempt, last successful sync, freshness, and the backend's
next scheduled execution timestamp/countdown. The scheduled job is daily at
00:00 UTC on Vercel; local SQLite mode does not run an automatic scheduler.

### 10. Scheduled Synchronization
`GET /api/v1/scheduler/sync`
Protected with `Authorization: Bearer <CRON_SECRET>`. Vercel Cron calls this
route daily; manual clients should use the admin sync endpoint instead.
