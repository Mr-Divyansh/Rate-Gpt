# Environment Variables — Rate-GPT

## Required for the relevant feature
- `DATA_GOV_API_KEY` — OGD/AGMARKNET API key (server-side); upstream sync is
  disabled if missing or set to a placeholder. Browsing stored records does not
  require this key.
- `ADMIN_SYNC_KEY` — server-side bearer token; required to enable manual sync
  and protected sync logs.
- `CRON_SECRET` — server-side bearer token; required to authorize scheduled
  sync requests.
- `DATABASE_URL` or `POSTGRES_URL` — PostgreSQL URL required on Vercel for
  persistent API data. Local development uses SQLite when neither is set.

## Optional
- `NODE_ENV` — should be `production` on Vercel.
- `PORT` — local dev server port (default 3000).
- `RATEGPT_DB_PATH` / `DB_PATH` — override the local SQLite file path.
- `DATA_GOV_API_BASE_URL` — override upstream base (default https://api.data.gov.in/resource).
- `DATA_GOV_RESOURCE_ID` — override resource ID (default 9ef84268-d588-465a-a308-a864a43d0070).
- `VERCEL` — set by Vercel platform.

## Rules
- Never commit `.env` or `.env.local`.
- Never use `VITE_` or `NEXT_PUBLIC_` prefixes for secrets.
- `.env.example` contains placeholder values only.
- Do not commit `.env`; database URLs and API/admin/cron keys must stay server-side.