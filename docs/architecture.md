# Rate-GPT architecture

## Live data flow

```text
Browser → /api/v1 → Express validation and rate limits → OGD / AGMARKNET
Browser ← normalized current page ← timeout, retry, validation, and deduplication
```

`src/server/services/mandiDataService.ts` is the only government-data client. It reads `DATA_GOV_API_KEY` on the server, requests the configured AGMARKNET resource over HTTPS in production, validates pagination, normalizes source field names and dates, preserves missing prices as `null`, and retries only transient upstream failures.

`src/server/routes/api.ts` validates public parameters with Zod and returns a consistent JSON envelope. `server.ts` applies request-size limits, Helmet, rate limiting, request IDs, compression, and `Cache-Control: no-store` to API responses. `api/index.ts` adapts the Express app to Vercel serverless functions.

## Storage policy

Rate-GPT has no database or price storage layer. It does not use SQLite, PostgreSQL, Neon, Redis, files, scheduled imports, or a stale-price fallback. Each price response comes directly from the official upstream service for that request.

The service keeps a short, bounded process-memory cache for filter metadata only: at most 64 entries for 60 seconds. It never contains mandi price records and does not serve a price response.

## Pagination and ordering

The application forwards the requested `limit` and `offset` to OGD, caps pages at 100 records, and advances from the upstream raw offset even when a response contains duplicate or invalid rows. The upstream-reported `total` is a source count; it can be greater than the number of normalized rows shown on a page.

AGMARKNET's current index does not support arrival-date sorting. Rate-GPT sorts the validated records within the returned page before rendering a date sort. It does not claim that this is a globally sorted historical catalogue. Market comparison is likewise one bounded live page, and the historical trend route returns HTTP 410 because no multi-day history is retained.
