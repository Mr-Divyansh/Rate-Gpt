# Rate-GPT architecture

## Live data flow

```text
Browser → /api/v1 → Express validation and rate limits → OGD / AGMARKNET
Browser ← normalized current page ← timeout, retry, validation, and deduplication
```

`src/server/services/mandiDataService.ts` is the government-data client. It reads `DATA_GOV_API_KEY` on the server, requests the configured AGMARKNET resource over HTTPS in production, validates pagination, normalizes source field names and dates, preserves missing prices as `null`, and retries only transient upstream failures.

`src/server/routes/api.ts` validates public parameters with Zod and returns a consistent JSON envelope. `server.ts` applies request-size limits, Helmet, rate limiting, request IDs, compression, and a default `Cache-Control: no-store` policy to API responses. Public read-only GET routes explicitly override that default with bounded Vercel edge caching. `api/index.ts` adapts the Express app to Vercel serverless functions.

## Storage and caching policy

Rate-GPT has no database or persistent price-storage layer. It does not use SQLite, PostgreSQL, Neon, Redis, files, scheduled price imports, or a stale-price fallback. Price records are requested from the official upstream service on demand and are never written to a Rate-GPT database.

To reduce repeated public catalogue and price requests, Vercel edge caching is configured per read-only endpoint:

| Endpoint | Shared edge TTL | Browser policy |
|---|---:|---|
| `/api/v1/prices` | 60 seconds | `max-age=0` |
| `/api/v1/prices/compare` | 60 seconds | `max-age=0` |
| `/api/v1/meta/filters` | 15 minutes | Revalidate according to response headers |
| `/api/v1/commodities/search` | 5 minutes | `max-age=0` |
| Contact, health, sync status, and other default API responses | No shared cache | `no-store` |

The service also keeps a bounded process-memory cache for filter metadata only. The AGMARKNET directory cache is 15 minutes; the OGD metadata fallback cache is bounded separately. Neither cache contains price records. A short edge-cached price response is temporary CDN delivery caching, not persistent price storage or historical trend storage.

## Pagination and ordering

The application forwards the requested `limit` and `offset` to OGD, caps pages at 100 records, and advances from the upstream raw offset even when a response contains duplicate or invalid rows. The upstream-reported `total` is a source count; it can be greater than the number of normalized rows shown on a page.

AGMARKNET's current index does not support arrival-date sorting. Rate-GPT sorts the validated records within the returned page before rendering a date sort. It does not claim that this is a globally sorted historical catalogue. Market comparison is likewise one bounded live page, and the historical trend route returns HTTP 410 because no multi-day history is retained.
