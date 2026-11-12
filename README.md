# Rate-GPT

Rate-GPT is an agricultural mandi-price discovery platform. It presents records stored by the backend and uses the Government of India Open Government Data (OGD) / AGMARKNET resource as its intended upstream source.

**Important:** the application does not fabricate replacement prices. If the backend or source is unavailable, the UI shows an error or unavailable state. Government data availability and update frequency are controlled by the source; the product must not be described as real-time unless the source actually supports that claim.

## Public website pages

The public website has three pages:

- `index.html` — landing page with a preview of the latest stored mandi price record.
- `mandi-prices.html` — searchable market and crop selection with stored price records from `/api/v1`.
- `about.html` — platform purpose, data-source context, and limitations.

## Stack

- Frontend: HTML, CSS, JavaScript, and Vite.
- Backend: Node.js, Express, TypeScript, Zod.
- Data storage: SQLite for local development when `DATABASE_URL` is unset; PostgreSQL when `DATABASE_URL` is configured. Both are accessed through `src/server/db/database-factory.ts`.
- Upstream: Government of India OGD / AGMARKNET resource `9ef84268-d588-465a-a308-a864a43d0070`.

## Requirements

- Node.js 20 or newer.
- npm.
- A valid OGD API key to run upstream sync. Browsing stored records does not require the key; a fresh sync does.
- `ADMIN_SYNC_KEY` to enable protected manual sync.

## Run locally in VS Code

1. Extract the project and open its folder in VS Code.
2. Install Node.js 20+ if needed.
3. In the integrated terminal, run:

   ```bash
   npm ci
   ```

4. Create a local `.env` from the template:

   **Windows PowerShell**

   ```powershell
   Copy-Item .env.example .env
   ```

   **macOS / Linux**

   ```bash
   cp .env.example .env
   ```

5. Edit `.env` and set `DATA_GOV_API_KEY` to your own key from [data.gov.in](https://data.gov.in/). Set `ADMIN_SYNC_KEY` to a long random secret if you need manual synchronization. Never commit `.env`.
6. Start the development server:

   ```bash
   npm run dev
   ```

7. Open:
   - Landing page: `http://localhost:3000/`
   - Mandi prices: `http://localhost:3000/mandi-prices.html`
   - About: `http://localhost:3000/about.html`
   - API health: `http://localhost:3000/api/v1/health`

Previous `/app` and `/market-price` URLs redirect to the Mandi Prices page.

The development server may choose the next port if port 3000 is already occupied; read the terminal output for the actual URL.

## Useful commands

```bash
npm ci
npm run lint
npm test
npm run build
npm run preview
```

`npm run lint` runs the TypeScript compiler in no-emit mode. `npm test` runs the database/service verification script. Run these commands in your own environment and review the reported output; passing a frontend build alone does not prove the upstream government API is reachable.

## Environment variables

See `.env.example`. Keep credentials server-side only:

- `DATA_GOV_API_KEY` — OGD API key.
- `DATA_GOV_API_BASE_URL` — defaults to `https://api.data.gov.in/resource`.
- `DATA_GOV_RESOURCE_ID` — defaults to the AGMARKNET resource ID above.
- `ADMIN_SYNC_KEY` — secret for protected sync endpoints.
- `DATABASE_URL` — optional PostgreSQL connection string; when set, API reads and writes use the PostgreSQL adapter.
- `POSTGRES_URL` — fallback PostgreSQL connection string used when `DATABASE_URL` is unset, including Vercel Postgres's standard pooled URL.
- `PORT` — local server port (default `3000`).

Do not paste secrets into issues, logs, frontend code, or source control.

## Data integrity

- The UI shows values returned by the backend, with missing prices rendered as a dash rather than zero.
- The arrival date is the market-data date; a backend sync timestamp is not the same thing as the latest arrival date.
- Cached/stored data may be older than the latest source publication.
- No price trend or live market statistic should be inferred from sample records.
- The OGD API key is used only by the server-side synchronization service.

## Deployment notes and known limitations

- The database factory selects PostgreSQL when `DATABASE_URL` or `POSTGRES_URL` is configured and SQLite otherwise. PostgreSQL end-to-end connectivity still requires a valid database URL and deployment-side verification. SQLite is local-only for durable use; serverless filesystems may be ephemeral or read-only.
- On Vercel, add a pooled Neon/Postgres connection string as `DATABASE_URL` in **Project Settings → Environment Variables** (or connect Vercel Postgres to provide `POSTGRES_URL`). Apply it to Production and any Preview environments that need the API, then redeploy. The server initializes the PostgreSQL schema on first use; never commit the connection string.
- Upstream sync requires a valid API key and the OGD endpoint to be available.
- No scheduled sync is configured by default.
- The UI reports backend status and does not claim data is real-time.

## Source

Government of India Open Government Data Platform: [https://data.gov.in/](https://data.gov.in/)

AGMARKNET resource ID: `9ef84268-d588-465a-a308-a864a43d0070`.
