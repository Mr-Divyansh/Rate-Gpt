# Engineering rules

- Treat government API responses as untrusted and validate them before display.
- Keep keys on the server and out of Git, logs, responses, and browser bundles.
- Never replace a missing price with zero or invent a crop, market, date, or price.
- Keep every live API request bounded, paginated, and failure-aware.
- Do not add a database, persistent cache, background sync, or stale-price fallback.
- Keep interactive controls keyboard accessible and show loading, empty, and error states.
- Run the documented test, type-check, metadata, and build commands before release.
