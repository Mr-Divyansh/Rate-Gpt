# Rate-GPT — Frontend cleanup and verification

## Public website

The public website is limited to:

- `index.html` — Home and the latest stored-price preview.
- `mandi-prices.html` — mandi selection, crop search and stored price records.
- `about.html` — platform purpose, data-source context and limitations.

The shared desktop/mobile header and footer link only to Home, Mandi Prices and About Us. Previous `/app` and `/market-price` entry points redirect to Mandi Prices.

## Cleanup

Removed the six requested pages (`calculator.html`, `comparison.html`, `crops.html`, `price-trends.html`, `watchlist.html`, `marketDashboard.html`), the unused React application and its page-specific components, duplicate/obsolete HTML entry points, their exclusive styles and scripts, and frontend-only framework dependencies.

The Express API, database adapters, synchronization service, API routes and backend tests remain in place. The three retained pages continue to use the existing `/api/v1` endpoints; no market values are fabricated when the service is unavailable.

## Verification

| Check | Result |
|---|---|
| `npm run lint` | Passed |
| `npm test` | Passed — 29 checks |
| `npm run test:integration` | Passed — 42 checks |
| `npm run build` | Passed — three HTML entry pages emitted |
| Production route checks | Passed — retained pages return 200, removed pages return 404, legacy market URLs redirect |
| `node --check` on retained browser scripts | Passed |
| Local page asset/link scan | Passed — no missing local references |
| Browser layout checks | Passed — no horizontal overflow on all three pages at 320, 390, 768 and 1365 px |
| Browser JavaScript exceptions | None observed |

## Environment limitation

The workspace `.env` PostgreSQL connection was refused during local browser checks. Consequently the Home preview, Mandi filters and sync-status requests returned server errors in that environment. The pages showed their unavailable/error states rather than fabricated data. Backend unit and API integration tests passed against their isolated test database; live PostgreSQL connectivity and upstream OGD synchronization were not verified.
