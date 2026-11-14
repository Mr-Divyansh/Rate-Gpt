# Live mandi data architecture

## Product contract

- Mandi prices are fetched on demand from the Government of India OGD / AGMARKNET resource.
- Price observations are not persisted by the live API request path. Responses use `Cache-Control: no-store`.
- No bulk sync scheduler or recurring national-data import is enabled.
- The source publishes arrival-based market observations; it is not guaranteed real-time trading data.
- Price values are provided by the source in Rs/Quintal. The Mandi Prices UI can display the same observation in Rs/KG by dividing by 100. No second upstream request or database write is needed for unit conversion.
- Live market comparison requests one bounded page (up to 100 rows) and explicitly reports when further pages may exist.
- Historical trend is disabled with HTTP 410 because the app intentionally does not retain multi-day history. Legacy rows are not presented as live data.

## Storage and legacy data

The live request path does not call the legacy `upsertMandiPrices` functions. Legacy database tables and rows are not automatically deleted by this code change. No production database cleanup has been executed.

Before any cleanup:

1. Obtain approval for the exact database, environment, records, and retention scope.
2. Inspect table sizes, date range, provenance, references, and any remaining consumers.
3. Take and verify a restricted backup; test restoration in an isolated environment.
4. Prepare a dry-run count/list for owner review. Never use an unreviewed broad `TRUNCATE`.
5. Execute only after separate explicit approval, then verify row counts and application behavior.

## Verification still required

- Run `npm test`, `npm run test:integration`, `npm run lint`, and `npm run build` in CI or a Node.js 20+ environment.
- Verify the configured OGD resource and API key in the deployment environment without exposing credentials.
- Verify state/district/market filter coverage against real upstream pagination. The current filter endpoint uses a bounded page; it must not be described as an exhaustive catalogue of every market.
- Verify live data and KG/Quintal display in production after an approved deployment.
- Review and separately approve any production database cleanup.