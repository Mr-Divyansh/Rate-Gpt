# Rate GPT — Engineering Rules

## Code quality
- Use TypeScript consistently.
- Prefer simple readable code.
- Keep frontend, backend and database responsibilities separate.
- Avoid unnecessary dependencies.

## Data and API
- Validate inputs with Zod.
- Treat Government API responses as untrusted.
- Handle null/missing fields safely.
- Never convert missing prices to zero.
- Preserve source arrival dates and units.
- Use pagination and cap page size.
- Make sync jobs idempotent.
- Never fabricate historical data.

## Security
- Never commit `.env`.
- Never share API keys in source, chat, screenshots or public issues.
- Use placeholders in `.env.example`.
- Keep Government API calls server-side.
- Protect admin endpoints and apply rate limiting.
- Never log secrets.

## UI
- Light mode: white background, black text.
- Dark mode: dark background, white text.
- Keep interface minimal and readable.
- Make controls keyboard accessible.
- Include loading, empty and error states.
- Show arrival date and last successful sync.
- Do not imply a modal price is a guaranteed sale price.

## Git and testing
Use meaningful commits. Keep `node_modules`, build output and secrets out of Git. Test malformed API responses, filters, pagination, duplicate syncs, both themes and upstream/database failures.
