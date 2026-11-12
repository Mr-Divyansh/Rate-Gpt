# Deployment — Rate-GPT

## Vercel
- `vercel.json`: API rewrite `/api/(.*)` → `/api/index.ts`; function `api/index.ts` maxDuration 300s and daily Vercel Cron at 00:00 UTC.
- Public routes: `/` → landing page, `/mandi-prices.html` → price explorer, `/about.html` → About Us.
- Legacy `/app` and `/market-price` URLs redirect to `/mandi-prices.html`.
- Build: `npm run build` (Vite) → `dist/`.
- Configure `CRON_SECRET` with at least 32 characters. Vercel Cron sends it as a Bearer token to `/api/v1/scheduler/sync`.
- Configure a persistent PostgreSQL `DATABASE_URL` (Neon is supported) for Vercel. SQLite is the local fallback and cannot persist writes on Vercel.
- Configure `DATA_GOV_API_KEY` for live upstream synchronization and `ADMIN_SYNC_KEY` for manual protected sync/log access.
- The sync-status endpoint reports the next daily UTC cron run and the last successful sync independently from failed attempts.
- The Vercel plan must allow the configured 300-second function duration; confirm the selected plan's function limits before deployment.

## Environment variables (names only)
- `DATA_GOV_API_KEY` (optional; sync disabled if missing)
- `ADMIN_SYNC_KEY` (required for admin sync)
- `NODE_ENV` (should be `production` on Vercel — verify manually)
- `PORT` (local dev, default 3000)
- `RATEGPT_DB_PATH` / `DB_PATH` (optional override)
- `DATABASE_URL` (PostgreSQL connection string; required for persistent Vercel data)
- `POSTGRES_URL` (optional PostgreSQL URL fallback)
- `CRON_SECRET` (required to authorize scheduled sync)

## CI/CD
- GitHub Actions: `.github/workflows/ci.yml` runs on push/PR to main: npm ci, tsc, npm test, npm run build.
- No auto-deploy to Vercel configured in repo.

## Safety
- No secrets in frontend bundle or Git.
- `.env` gitignored; only `.env.example` tracked.
- Do not deploy without approval.