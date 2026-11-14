# Deployment

Vercel serves the static Vite build and routes `/api/*` to `api/index.ts`. The function is pinned to `bom1` in `vercel.json`; legacy `/app` and `/market-price` URLs redirect to `mandi-prices.html`.

Before deploying, configure `DATA_GOV_API_KEY` server-side for the intended Vercel environment. Configure `WEB3FORMS_ACCESS_KEY` only when the contact form should deliver messages. Do not configure database URLs, storage services, sync jobs, or a cron secret for Rate-GPT.

Run `npm ci`, `npm test`, `npm run test:integration`, `npm run test:site`, `npm run lint`, and `npm run build` before a release. Verify `/api/v1/health`, a real filtered price request, and the Mandi Prices page after deployment without exposing environment values.
