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
- Admin sync cannot persist in production (read-only SQLite) — documented blocker.
- `NODE_ENV` may be unset on Vercel — manual check required.
- Express 4 deprecation (DEP0169) — deferred.

## Rules
- Never commit `.env` or `.env.local`.
- Never use `VITE_`/`NEXT_PUBLIC_` prefixes for secrets.
- Never print secret values.