# Rate-GPT

Rate-GPT is a mandi-price discovery website for Indian farmers, traders, students, and researchers. It retrieves available records on demand from the Government of India Open Government Data (OGD) / AGMARKNET resource and presents the source's minimum, maximum, modal, and arrival-date values clearly.

Rate-GPT is not a price-prediction service. A successful fetch means the source was queried; it does not mean the observation is a real-time trading quote. Always check the arrival date and confirm a current offer with the relevant mandi.

## Architecture

```text
Browser → Rate-GPT Express API → data.gov.in / AGMARKNET
              validation, normalization, page-safe deduplication
Browser ← live response with source and fetch-time context
```

There is no database, bulk price synchronisation, or historical price store. Price records are fetched on demand and are never persisted by Rate-GPT. Public read-only GET routes use short-lived Vercel edge caching to reduce repeated upstream requests: price observations and comparisons for 60 seconds, location/filter metadata for 15 minutes, and commodity suggestions for 5 minutes. Browser caching remains disabled or revalidated; contact, health, and other non-cacheable API responses retain `no-store`. This temporary edge cache is not a historical price database.

## Prerequisites

- Node.js 20 or newer
- npm
- An OGD API key with access to resource `9ef84268-d588-465a-a308-a864a43d0070`

## Local setup

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

Set `DATA_GOV_API_KEY` in `.env`; do not commit it or put it in browser code. Set `VITE_WEB3FORMS_ACCESS_KEY` to enable the public contact form. Web3Forms access keys are public form identifiers intended for browser-side submission; they are not account passwords. WeatherAPI configuration is documented in `docs/environment.md`.

The local API and site are available at `http://localhost:3000`. Use `/api/v1/health` for a basic process check; it does not verify a particular government-data request.

## Verification

```bash
npm ci
npm test
npm run test:integration
npm run test:api-contract
npm run test:agmarknet2
npm run test:site
npm run test:responsive
npm run test:release-gate
npm run lint
npm run build
```

The CI workflow also runs the deterministic Weather browser interaction suite on pull requests and every push to `main`. Production smoke checks run after a successful main-branch CI workflow and verify that the exact commit is deployed before checking public endpoints.

## Releases

- [Rate-GPT 2.0.1 release notes](docs/releases/v2.0.1.md)

## Documentation

- [Architecture](docs/architecture.md)
- [API contract](docs/api.md)
- [Environment](docs/environment.md)
- [Security](docs/security.md)
- [Deployment](docs/deployment.md)
- [Live-data coverage and limitations](docs/live-data-coverage.md)
