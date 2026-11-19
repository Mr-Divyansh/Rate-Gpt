# Rate-GPT — Engineering & Release Readiness

**Status date:** 19 November 2026  
**Repository:** https://github.com/Mr-Divyansh/Rate-Gpt  
**Production URL:** https://rate-gpt.vercel.app/

> This report records the actual deployed release and completed checks. It does not claim universal daily mandi coverage, physical-device certification, or inbox receipt that has not been confirmed.

## 1. Release identity and CI

- Latest verified production main commit before this contact fix: `0b289b06e3711c7d8dab975c6e1ba1f9d2aede61`.
- PR #123 (dependency security and production browser verification) is merged.
- PR #124 (Playwright-compatible production runner) is merged.
- GitHub main CI run **44446711303** passed. This includes the blocking full dependency audit, unit/service tests, API integration, API contract/OpenAPI, AGMARKNET checks, site metadata, responsive checks, browser test setup, TypeScript and production build.
- The full npm audit passed with **0 vulnerabilities** after upgrading Vite from 6.2.7 to **6.4.6** and regenerating `package-lock.json`.
- Latest pre-contact-fix production deployment **dpl_5VGyRM9CP6fQCvF6Razk4zGtC3xB** is READY.

## 2. Production verification

Production smoke workflow run **44446966345** passed:

- **45/45 public production smoke checks**
- **25/25 real-browser production checks**
- Exact production commit identity verified before running tests.
- Browser viewports: mobile 390px, tablet 768px and desktop 1440px.
- **147/147** deployed commodity photographs returned successful image responses.

The browser suite verified the Mandi page, government state options, dependent district and mandi selectors, live-price or honest empty-state behavior, no horizontal overflow, and no uncaught browser JavaScript errors at all three viewports.

## 3. Dependency security

- Vite upgraded from 6.2.7 to 6.4.6.
- `package.json` and `package-lock.json` are synchronized.
- The previous non-blocking development audit was replaced with a blocking `npm audit --audit-level=high`.
- The full npm audit passed with zero reported vulnerabilities.

## 4. Web3Forms contact delivery

- Web3Forms documentation identifies its form Access Key as a public form identifier that is safe for browser-side use; it is not an account password or private API secret.
- The previous implementation sent requests from a Vercel server function. A controlled production request returned HTTP 502, and a direct provider request from the server environment returned HTTP 403 with Web3Forms' message that server-side calls require a Pro plan and server-IP safelisting.
- The contact page is being changed to submit directly from the browser, Web3Forms' standard supported integration. The Vercel CSP is being updated to allow `https://api.web3forms.com`.
- Vercel Production now has the public build variable `VITE_WEB3FORMS_ACCESS_KEY` configured. It is intentionally exposed in the built browser bundle.
- A successful provider response and receipt in the configured inbox must still be verified after the browser-side fix is deployed. No inbox receipt is claimed at this stage.

The form continues to require consent, has a honeypot, and sends contact details directly to Web3Forms. Contact submissions are not written to a Rate-GPT database. The optional server-side API proxy requires Web3Forms Pro and server-IP safelisting.

## 5. Government data source and honest limitations

### Implemented

- Price observations are fetched on demand from Government of India OGD resource `9ef84268-d588-465a-a308-a864a43d0070`.
- The public AGMARKNET 2.0 filters endpoint supplies administrative state, district, market and commodity directory data.
- Rate-GPT does not persist price observations. Temporary in-process caching applies to filter/directory metadata only.
- Missing prices remain missing; no synthetic observations are added.
- Source units are preserved. Where OGD does not provide a unit, the API says so instead of inventing ₹/quintal or ₹/kg.
- Responses distinguish API fetch time from government arrival date and upstream update time where supplied.

### External limitations

- The AGMARKNET 2.0 price-report endpoint previously returned TOKEN_OR_CAPTCHA_REQUIRED. Rate-GPT must not bypass or automate this access gate.
- An administrative directory entry does not prove that a market has a price observation on a given day.
- “Live” means a fresh request for the latest government-published observations available from the source, not an instantaneous auction quote.
- `/api/v1/sync-status` reports scheduler and bulk sync disabled. Price fetching is on-demand.
- Historical trend storage is intentionally disabled; the API returns HTTP 410 rather than inventing history.
- Broader unattended coverage requires another official, documented government source accessible without CAPTCHA/token bypass.

See [live-data coverage and source limitations](docs/live-data-coverage.md).

## 6. Definition of done

| Task | Status |
|---|---|
| Vite security upgrade and lockfile refresh | Complete |
| Blocking full dependency audit | Complete — 0 vulnerabilities |
| Production mobile/tablet/desktop browser checks | Complete — 25/25 |
| Public production smoke checks | Complete — 45/45 |
| Web3Forms integration correction | Implemented on branch; awaiting CI, merge and production browser verification |
| Real provider acceptance and inbox receipt | Pending post-deployment verification |

**Current verdict:** Core Rate-GPT code release is merged, CI-green and production-verified. The contact delivery failure was traced to unsupported server-side Web3Forms calls on the current plan. The browser-side integration is now the selected fix; do not mark the contact task 100% complete until the deployed browser form receives a successful provider response and the configured inbox is checked.
