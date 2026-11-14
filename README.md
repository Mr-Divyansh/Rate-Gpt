# Rate-GPT

Rate-GPT is a mandi-price discovery website for Indian farmers, traders, students, and researchers. It retrieves available records on demand from the Government of India Open Government Data (OGD) / AGMARKNET resource and presents the source's minimum, maximum, modal, and arrival-date values clearly.

Rate-GPT is not a price-prediction service. A successful fetch means the source was queried; it does not mean the observation is a real-time trading quote. Always check the arrival date and confirm a current offer with the relevant mandi.

## Architecture

```text
Browser → Rate-GPT Express API → data.gov.in / AGMARKNET
              validation, normalization, page-safe deduplication
Browser ← live response with source and fetch-time context
```

There is no SQLite, PostgreSQL, Neon, Redis, file storage, bulk synchronisation, or historical price store. Price records are requested for each search and API responses use `Cache-Control: no-store`. A bounded 60-second in-memory cache is used only for non-price filter metadata.

## Prerequisites

- Node.js 20 or newer
- npm
- An OGD API key with access to resource `9ef84268-d588-465a-a308-a864a43d0070`

## Local setup

```bash
npm ci
Copy-Item .env.example .env # PowerShell
npm run dev
```

Set `DATA_GOV_API_KEY` in `.env`; do not commit the file or put the key in browser code. `WEB3FORMS_ACCESS_KEY` is needed only to enable the contact form.

The local API and site are available at `http://localhost:3000`. Use `/api/v1/health` for a basic process check; it does not verify a particular government-data request.

## Verification

```bash
npm test
npm run test:integration
npm run test:site
npm run lint
npm run build
```

`npm test` uses deterministic source-response fixtures and makes no network calls. `npm run test:integration` starts an isolated mock upstream and verifies the public API flow. Neither command exposes or requires a database.

## Documentation

- [Architecture](docs/architecture.md)
- [API contract](docs/api.md)
- [Environment](docs/environment.md)
- [Security](docs/security.md)
- [Deployment](docs/deployment.md)
