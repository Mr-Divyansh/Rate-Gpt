# Environment variables

Use `.env.example` as the template. Keep `.env` local and never use a public client-side prefix for a secret.

| Variable | Required | Purpose |
|---|---:|---|
| `DATA_GOV_API_KEY` | Yes for live data | Server-side credential for OGD / AGMARKNET. |
| `DATA_GOV_API_BASE_URL` | No | Defaults to `https://api.data.gov.in/resource`. Useful for isolated tests. |
| `DATA_GOV_RESOURCE_ID` | No | Defaults to AGMARKNET resource `9ef84268-d588-465a-a308-a864a43d0070`. |
| `WEB3FORMS_ACCESS_KEY` | Only for contact delivery | Server-side Web3Forms credential. Without it, the contact API returns 503. |
| `PORT` | No | Local server port; defaults to 3000. |
| `NODE_ENV` | No | Use `production` in production. |

No database URL, storage path, sync secret, cron secret, or Neon configuration is used by this application.
