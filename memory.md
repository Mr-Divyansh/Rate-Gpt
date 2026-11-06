# Rate GPT — Decisions Log

Update this file whenever a durable project decision changes.

## Product
- Name: Rate GPT.
- Purpose: simplify discovery of agricultural mandi prices.
- Data source: Government OGD Platform / AGMARKNET.
- Dataset: Current Daily Price of Various Commodities from Various Markets (Mandi).
- Resource ID: `9ef84268-d588-465a-a308-a864a43d0070`.

## Design
- Minimal, simple interface.
- Light: white background and black text.
- Dark: dark background and white text.
- No extra theme palettes or decorative effects in the initial version.

## Planned stack
- React, TypeScript, Vite, Tailwind CSS.
- Node.js, Express.js, TypeScript.
- SQLite (better-sqlite3).
- Zod, Helmet, express-rate-limit.
- Recharts if historical chart is included.

## Planned internal endpoints
- `GET /health`
- `GET /meta/filters`
- `GET /prices`
- `GET /prices/trend`
- `GET /commodities/search`
- `POST /admin/sync`

## Constraints
- Government API key stays secret and server-side.
- Verify exact field names and units from live response.
- Historical trends depend on stored records.
- GPS nearby search, weather and AI predictions are outside initial MVP.

## Pending
- Verify live API response and pagination.
- Confirm stable source record identifier.
- Confirm hosting and production domain.
- Decide Hindi localization timing.
