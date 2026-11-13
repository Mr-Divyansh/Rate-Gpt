# Deployment — Rate-GPT

## Vercel
- `vercel.json` rewrites `/api/(.*)` to `/api/index.ts`; no cron jobs are
  configured.
- Public pages: `/`, `/mandi-prices.html`, and `/about.html`.
- Legacy `/app` and `/market-price` URLs redirect to `/mandi-prices.html`.
- Build with `npm run build`.
- Set `DATA_GOV_API_KEY` as a server-side environment variable. The key is
  included only in backend-to-government requests and is never returned to
  browsers.
- `DATA_GOV_API_BASE_URL` and `DATA_GOV_RESOURCE_ID` may override the upstream
  endpoint/resource. Production upstream requests require HTTPS.
- PostgreSQL remains optional for live prices and filters; it is used only by
  retained legacy history endpoints when configured.
- Do not configure a sync cron, `CRON_SECRET`, or `ADMIN_SYNC_KEY`.

## Environment variables (names only)
- `DATA_GOV_API_KEY`
- `DATA_GOV_API_BASE_URL` (optional)
- `DATA_GOV_RESOURCE_ID` (optional)
- `NODE_ENV`
- `PORT`
- `RATEGPT_DB_PATH` / `DB_PATH` (optional local database override)
- `DATABASE_URL` / `POSTGRES_URL` (optional, legacy history endpoints)

## Safety
- No secrets in frontend bundles or Git.
- `.env` is local-only; only `.env.example` is tracked.
- Do not deploy without approval.
- Existing database records are not deleted by the live API change. Cleanup
  requires separate approval; see `live-mandi-migration.md`.
