# Deployment

Vercel serves the static Vite build and routes `/api/*` to `api/index.ts`. The function is pinned to `bom1` in `vercel.json`; legacy `/app` and `/market-price` URLs redirect to `mandi-prices.html`.

Before deploying, configure `DATA_GOV_API_KEY` server-side for the intended Vercel environment and `VITE_WEB3FORMS_ACCESS_KEY` for the public contact form. The Web3Forms access key is a public form identifier and is embedded in the browser bundle by design. The optional server-side `WEB3FORMS_ACCESS_KEY` proxy requires a Web3Forms Pro plan and server-IP safelisting; the website contact page does not use it. Do not configure database URLs, storage services, sync jobs, or a cron secret for Rate-GPT.

Run `npm ci`, `npm test`, `npm run test:integration`, `npm run test:site`, `npm run lint`, and `npm run build` before a release. Verify `/api/v1/health`, a real filtered price request, the Mandi Prices page, and a browser-side contact submission after deployment.
