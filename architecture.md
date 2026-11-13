# Rate-GPT — System Architecture

## Data flow

```text
Government OGD / AGMARKNET API
          ↓
Server-side sync service
          ↓
Validation, normalization and deduplication
          ↓
SQLite locally / PostgreSQL when configured
          ↓
Express REST API (/api/v1)
          ↓
Static multi-page frontend (HTML, CSS and JavaScript)
```

The browser calls only Rate-GPT endpoints. The Government API key stays on the
server. Missing prices remain null and are displayed as unavailable; source
arrival dates are kept distinct from synchronization timestamps.

## Stack

- Frontend: HTML, CSS and JavaScript; Vite builds the three public pages.
- Backend: Node.js, Express and TypeScript with Zod request validation.
- Storage: `better-sqlite3` locally, or PostgreSQL through `pg` when
  `DATABASE_URL` or `POSTGRES_URL` is configured.
- Security: Helmet, rate limiting, parameterized SQL, and bearer-token
  authorization for manual and scheduled synchronization.

## Public pages

- `index.html` — latest stored-record preview.
- `mandi-prices.html` — location selection, crop search and paginated prices.
- `about.html` — data-source context and limitations.

The shared navigation script renders the same header and footer on all pages.
Previous `/app` and `/market-price` routes redirect to the Mandi Prices page.

## Database and synchronization

The database factory selects PostgreSQL when a connection URL is present and
SQLite otherwise. Vercel requires PostgreSQL; it does not fall back to
ephemeral SQLite storage. The `mandi_prices` table uses a normalized composite
`dedup_key` to prevent duplicate observations. Synchronization validates
upstream fields, preserves null prices and records each attempt in `sync_logs`.

The trend endpoint reads stored observations only. No prices or historical
values are fabricated or interpolated.
