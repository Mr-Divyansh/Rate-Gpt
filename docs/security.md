# Security — Rate-GPT

## Measures in place
- Helmet security headers.
- express-rate-limit (300 req/15min general, 20 req/15min admin).
- Zod input validation on all endpoints.
- Parameterized SQL (better-sqlite3 prepared statements).
- Timing-safe admin key comparison (`crypto.timingSafeEqual`).
- Admin sync disabled if `ADMIN_SYNC_KEY` unset/placeholder (returns 503).
- Admin logs endpoint requires `ADMIN_SYNC_KEY`.
- No stack traces in production error responses.
- Request IDs (`X-Request-Id`) for tracing.
- Cache-Control: no-store for admin/mutations; 30s public for GET prices.
- Secrets server-side only (`DATA_GOV_API_KEY`, `ADMIN_SYNC_KEY`).

## Known issues
- Production database connectivity depends on a valid PostgreSQL URL configured
  in the deployment environment; a configured URL alone does not prove that the
  database is reachable. The public health endpoint checks database access.
- Upstream synchronization and scheduled runs require their respective
  server-side credentials (`DATA_GOV_API_KEY`, `ADMIN_SYNC_KEY`, and
  `CRON_SECRET`); live synchronization was not exercised by local tests.

## Rules
- Never commit `.env` or `.env.local`.
- Never use `VITE_`/`NEXT_PUBLIC_` prefixes for secrets.
- Never print secret values.