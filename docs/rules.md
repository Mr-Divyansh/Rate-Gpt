# Rate GPT — Engineering Rules

## Code Quality & Architecture
- Maintain clean TypeScript types across all layers.
- Strictly separate frontend components, backend controllers, service layer, and database interactions.
- Avoid unnecessary runtime libraries.

## Data & API Rules
- Validate all incoming query and body payloads using Zod.
- Treat external Government API responses as untrusted.
- Preserve source arrival dates and units (`Rs/Quintal`).
- **Never convert missing or null prices to zero**. Preserve as null and render `—`.
- Keep sync jobs idempotent using composite deduplication keys (`dedup_key`).
- **Zero Fabricated Data**: Never generate synthetic historical trends or predicted prices.

## Security Rules
- Never commit `.env` or real API keys.
- Never expose `DATA_GOV_API_KEY` in frontend bundles or client network requests.
- Protect data sync endpoints with authorization tokens.
- Never log secrets or private query keys.

## UI & Design Rules
- Light mode: Pure `#FFFFFF` background, `#000000` text, `#D9D9D9` border.
- Dark mode: `#111111` background, `#FFFFFF` text, `#404040` border.
- Zero gradients, zero neon colors, zero decorative animations.
- Accessible focus outlines and keyboard operable controls.
- Display arrival dates prominently on all price displays.
