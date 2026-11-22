# Deployment

Vercel serves the static Vite build and routes `/api/*` to `api/index.ts`. The function is pinned to `bom1` in `vercel.json`; legacy `/app` and `/market-price` URLs redirect to `mandi-prices.html`.

## Required configuration

Before deploying, configure `DATA_GOV_API_KEY` server-side for the intended Vercel environment and `VITE_WEB3FORMS_ACCESS_KEY` for the public contact form. Configure `VITE_WEATHERAPI_KEY` if the Weather page should provide live weather. Values prefixed with `VITE_` are public browser configuration, not secrets.

The Web3Forms access key is a public form identifier and is embedded in the browser bundle by design. The optional server-side `WEB3FORMS_ACCESS_KEY` proxy requires a Web3Forms Pro plan and server-IP safelisting; the website contact page does not use this proxy. Do not configure database URLs, storage services, sync jobs, or a cron secret for Rate-GPT.

See [Environment variables](environment.md) and [Security controls](security.md) for the complete configuration and limitations.

## Local verification

Use Node.js 20 or newer:

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

The CI workflow additionally runs the live AGMARKNET catalogue check, a deterministic Weather browser interaction suite, and the production frontend build. Its dependency audit fails on high-severity findings. Pull requests also receive preview browser checks when a public preview is available.

## Production release verification

After a successful `main` CI workflow, the production smoke workflow waits until the public API reports the exact source commit SHA being released. It then checks the public API discovery document, OpenAPI specification, AI usage guide, health and sync status, location catalogue, live price endpoints, and representative Himachal Pradesh data. It also runs real-browser checks at mobile, tablet, and desktop viewports.

For a manual release review, verify:

1. The Vercel production deployment is `READY`, points to the intended `main` commit, and has the `rate-gpt.vercel.app` alias.
2. `/api/v1/health` responds successfully and `/api/v1/` reports the expected deployed commit SHA.
3. The homepage, Mandi Prices, About, Contact, Weather, Privacy, and Terms pages load.
4. Mandi filters, price results, pagination, language switching, navigation, and mobile layouts work.
5. The contact form clearly communicates its consent and submission states. Test an actual submission only with an authorized test message.
6. No private credentials are committed or exposed through public `VITE_` variables.

Price observations are fetched on demand from Government of India OGD / AGMARKNET. They are not guaranteed real-time trading quotes; check each record's arrival date and source unit. Rate-GPT does not persist price history, and the historical trend endpoint is intentionally unavailable while storage is disabled.

Keep the release scope frozen during a submission cycle: fix regressions and documentation gaps, but defer new product features until after the hackathon.
