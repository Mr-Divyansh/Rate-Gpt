# Rate-GPT API

Base path: `/api/v1`. All successful responses use `{ success: true, data, meta?, message }`; errors use `{ success: false, error: { code, message } }`. The browser never receives the government API key.

## Endpoints

- `GET /health` — minimal process availability check.
- `GET /meta/filters?state=&district=&market=` — state/UT selector names and source-observed districts, markets, and commodities. Dependent options are paged until the upstream total is reached or the application's documented offset boundary is reached. `data.coverage` and `meta.coverage` distinguish complete from partial discovery; `maxOffset` reports the application boundary.
- `GET /prices?state=&district=&market=&commodity=&date=&search=&limit=&offset=&sort=` — latest government-reported normalized records. `limit` is 1–100; `offset` is 0–1,000,000. Missing prices are `null`, never zero. `date` is an exact arrival date and future dates are rejected.
- `GET /commodities/search?q=&limit=` — source-derived commodity names from an on-demand upstream response. A suggestion is not emitted merely because it exists in a local catalogue.
- `GET /prices/compare?commodity=&date=` — a bounded live observation page for a required commodity and arrival date. It does not calculate price differences; consumers should compare only matching varieties and source units. `meta.comparisonMayBePartial` indicates upstream records remain.
- `GET /prices/trend` — returns HTTP 410 with `HISTORICAL_STORAGE_DISABLED`; Rate-GPT does not store price history.
- `GET /sync-status` — describes the on-demand, no-storage data mode; it does not represent a database sync.
- `POST /contact` — validates a consented contact request and forwards it server-to-server to Web3Forms when `WEB3FORMS_ACCESS_KEY` is configured.

`/prices` metadata includes the upstream `total` where available, the next raw upstream offset, source attribution, an ISO `fetchedAt` timestamp for the successful API request, and `upstreamUpdatedAt` when the source provides its dataset update time. The record's `arrival_date` remains the government-reported arrival date and is not inferred from either timestamp. `upstreamHasNext` reports upstream coverage; `hasNext` is false when the supported offset boundary prevents another request, and `truncated` identifies that case. Date and modal-price sorting apply to each returned page; page offsets still follow upstream order and do not imply a globally ranked result. API data uses `Cache-Control: no-store`.

The Mandi Prices page exports all matching live records client-side, subject to a 5,000-record / 50-page safety bound. Filters are carried across every request; if the export cannot complete, no partial CSV is downloaded. Price records are not stored by the server.

## Failure behavior

Validation failures return 400. Upstream rejection or invalid upstream content returns 502; an unavailable or rate-limited source returns 503; a timed-out upstream request returns 504. The server does not return credentials, upstream response bodies, or stack traces in production error responses.
