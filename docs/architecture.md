# Rate-GPT — System Architecture

## Data flow

```text
Government OGD / AGMARKNET
       ↓
src/server/services/mandiDataService.ts
       ↓
Validation, date/price normalization and idempotent upsert
       ↓
SQLite (local) or PostgreSQL (configured / Vercel)
       ↓
Express API in src/server/routes/api.ts
       ↓
Static HTML, CSS and JavaScript pages built with Vite
```

The public pages are `index.html`, `mandi-prices.html` and `about.html`. The
shared `script/global-nav.js` renders consistent navigation and footer content.
The frontend requests stored data only through `/api/v1`; the OGD key remains
server-side.

## Components

- `server.ts` creates the production Express API app.
- `server.dev.ts` mounts that API alongside Vite middleware for local
  multi-page development.
- `api/index.ts` is the Vercel serverless entry point.
- `src/server/db/database-factory.ts` selects PostgreSQL when
  `DATABASE_URL`/`POSTGRES_URL` is set and SQLite otherwise. On Vercel, a
  PostgreSQL URL is required.
- `src/server/services/mandiDataService.ts` validates upstream records,
  normalizes dates and nullable prices, and persists successful observations.
- `src/server/tests/` contains deterministic database and API integration
  checks.

The `mandi_prices` table uses a normalized composite `dedup_key` for
idempotency. `sync_logs` records synchronization attempts. Price trends use
stored records only; missing source values are never replaced with estimates.
