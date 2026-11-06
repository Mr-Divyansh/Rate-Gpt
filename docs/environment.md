# Environment Variables — Rate-GPT

## Required (production)
- `DATA_GOV_API_KEY` — OGD/AGMARKNET API key (server-side). Sync disabled if missing/placeholder.
- `ADMIN_SYNC_KEY` — Admin sync endpoint token (server-side). Admin endpoints return 503 if unset.

## Optional
- `NODE_ENV` — should be `production` on Vercel.
- `PORT` — local dev server port (default 3000).
- `RATEGPT_DB_PATH` / `DB_PATH` — override SQLite file path (tests).
- `DATA_GOV_API_BASE_URL` — override upstream base (default https://api.data.gov.in/resource).
- `DATA_GOV_RESOURCE_ID` — override resource ID (default 9ef84268-d588-465a-a308-a864a43d0070).
- `DATABASE_URL` — future PostgreSQL connection string (not yet used).
- `VERCEL` — set by Vercel platform.

## Rules
- Never commit `.env` or `.env.local`.
- Never use `VITE_` or `NEXT_PUBLIC_` prefixes for secrets.
- `.env.example` contains placeholder values only.