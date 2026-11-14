# Rate-GPT API

Base path: `/api/v1`. All successful responses use `{ success: true, data, meta?, message }`; errors use `{ success: false, error: { code, message } }`. The browser never receives the government API key.

## Endpoints

- `GET /health` — minimal process availability check.
- `GET /meta/filters?state=&district=&market=` — Indian state/UT names and source-observed districts, markets, and commodities. For a selected location, discovery reads at most two live upstream pages, so returned location values may be partial.
- `GET /prices?state=&district=&market=&commodity=&date=&search=&limit=&offset=&sort=` — live normalized records. `limit` is 1–100; `offset` is 0–1,000,000. Missing prices are `null`, never zero. `date` is an exact arrival date and future dates are rejected.
- `GET /commodities/search?q=&limit=` — source-derived commodity names from a live upstream response. A suggestion is not emitted merely because it exists in a local catalogue.
- `GET /prices/compare?commodity=&date=` — a bounded live comparison page. `meta.comparisonMayBePartial` is true when the upstream source indicates more records.
- `GET /prices/trend` — returns HTTP 410 with `HISTORICAL_STORAGE_DISABLED`; Rate-GPT does not store price history.
- `GET /sync-status` — describes the on-demand, no-storage data mode; it does not represent a database sync.
- `POST /contact` — validates a consented contact request and forwards it server-to-server to Web3Forms when `WEB3FORMS_ACCESS_KEY` is configured.

`/prices` metadata includes the upstream `total` where available, the next raw upstream offset, source attribution, and an ISO `fetchedAt` timestamp. API data uses `Cache-Control: no-store`.

## Failure behavior

Validation failures return 400. Upstream rejection or invalid upstream content returns 502; an unavailable or rate-limited source returns 503; a timed-out upstream request returns 504. The server does not return credentials, upstream response bodies, or stack traces in production error responses.
