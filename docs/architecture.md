# Rate-GPT — System Architecture

## Live price data flow

```text
Browser → Rate-GPT Express API → Government OGD / AGMARKNET
                                      ↓
                         validation + normalization
                                      ↓
Browser ← bounded page + source/fetch metadata
```

The browser never receives the government API key. Live prices, filters, and
commodity search call the upstream API server-side, with a bounded page size,
timeouts, and limited retries. Response pages are not written to SQLite or
PostgreSQL and are not cached by Rate-GPT. The API sets `Cache-Control:
no-store`.

The application does not describe published daily arrivals as guaranteed
real-time trading prices. Each price record retains the source arrival date;
the response reports its fetch timestamp and live-source status.

## Components

- `server.ts` configures Express, request limits, security headers, and no-store
  API responses.
- `src/server/routes/api.ts` validates user filters and returns live results.
- `src/server/services/mandiDataService.ts` makes bounded government API calls,
  validates pagination, normalizes dates/prices, retries transient failures,
  and removes duplicates within a page.
- `script/mandi-prices.js` requests data when the user chooses a market or
  changes crop/date/sort filters; pagination advances by the upstream offset.
- `api/index.ts` is the Vercel serverless entry point.

## Existing database records

SQLite/PostgreSQL adapters and their existing rows are retained to avoid
unapproved destructive changes and to preserve compatibility with the legacy
read-only trend/comparison endpoints. Live price/filter routes neither consult
nor update those tables. The old admin/scheduler synchronization routes and
Vercel cron are removed. A staged, approval-gated cleanup procedure is in
`docs/live-mandi-migration.md`.
