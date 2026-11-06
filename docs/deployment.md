# Deployment — Rate-GPT

## Vercel
- `vercel.json`: API rewrite `/api/(.*)` → `/api/index.ts`; function `api/index.ts` maxDuration 30s, includeFiles `rategpt.db`.
- Routes: `/` → landing, `/market-price` → app.html, `/app` → redirect to `/market-price`.
- Build: `npm run build` (Vite) → `dist/`.

## Environment variables (names only)
- `DATA_GOV_API_KEY` (optional; sync disabled if missing)
- `ADMIN_SYNC_KEY` (required for admin sync)
- `NODE_ENV` (should be `production` on Vercel — verify manually)
- `PORT` (local dev, default 3000)
- `RATEGPT_DB_PATH` / `DB_PATH` (optional override)
- `DATABASE_URL` (future, Postgres)

## CI/CD
- GitHub Actions: `.github/workflows/ci.yml` runs on push/PR to main: npm ci, tsc, npm test, npm run build.
- No auto-deploy to Vercel configured in repo.

## Safety
- No secrets in frontend bundle or Git.
- `.env` gitignored; only `.env.example` tracked.
- Do not deploy without approval.