# Environment variables

Use `.env.example` as the template. Keep `.env` local. Variables prefixed with `VITE_` are compiled into public browser code and must never contain passwords or private server credentials.

| Variable | Required | Purpose |
|---|---:|---|
| `DATA_GOV_API_KEY` | Yes for live data | Server-side credential for OGD / AGMARKNET. |
| `DATA_GOV_API_BASE_URL` | No | Defaults to `https://api.data.gov.in/resource`. Useful for isolated tests. |
| `DATA_GOV_RESOURCE_ID` | No | Defaults to AGMARKNET resource `9ef84268-d588-465a-a308-a864a43d0070`. |
| `VITE_WEB3FORMS_ACCESS_KEY` | Yes for the public contact form | Public Web3Forms form access key. Web3Forms documents this key as safe for browser-side use; it is not an account password or secret API key. |
| `WEB3FORMS_ACCESS_KEY` | Only for optional server proxy | Used only by `POST /api/v1/contact`. Web3Forms requires a Pro plan and the Vercel server IP on its safelist for server-side submissions. The public contact page does not use this proxy. |
| `VITE_WEATHERAPI_KEY` | Optional | Public browser-side WeatherAPI key compiled into the Weather page. Vite `VITE_` values are visible to every visitor; restrict this key through WeatherAPI controls and never use it for a server-side secret. The current app retains a public fallback key until a replacement is configured. |
| `PORT` | No | Local server port; defaults to 3000. |
| `NODE_ENV` | No | Use `production` in production. |

No database URL, storage path, sync secret, cron secret, or Neon configuration is used by this application.
