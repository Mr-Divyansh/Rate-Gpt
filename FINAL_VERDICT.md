# Rate-GPT — Engineering & Release Readiness

**Status date:** 19 November 2026  
**Repository:** https://github.com/Mr-Divyansh/Rate-Gpt  
**Production URL:** https://rate-gpt.vercel.app/

> This report records the actual deployed release and completed checks. It does not claim universal daily mandi coverage, physical-device certification, or verified Web3Forms delivery.

## 1. Release identity and CI

- Latest verified production main commit: `0b289b06e3711c7d8dab975c6e1ba1f9d2aede61`.
- PR #123 (dependency security and production browser verification) is merged.
- PR #124 (Playwright-compatible production runner) is merged.
- GitHub main CI run **44446711303** passed. This includes the blocking full dependency audit, unit/service tests, API integration, API contract/OpenAPI, AGMARKNET checks, site metadata, responsive checks, browser test setup, TypeScript and production build.
- The full npm audit passed with **0 vulnerabilities** after upgrading Vite from 6.2.7 to **6.4.6** and regenerating `package-lock.json`.
- Vercel production deployment **dpl_z8GHHdpZRjW1KkCMT5y4CV39UpUk** is READY and built from the exact same main SHA. The production alias includes `rate-gpt.vercel.app`.

## 2. Production verification

Production smoke workflow run **44446966345** passed:

- **45/45 public production smoke checks**
- **25/25 real-browser production checks**
- Exact production commit identity verified before running tests.
- Browser viewports: mobile 390px, tablet 768px and desktop 1440px.

The browser suite verified:

| Area | Result |
|---|---|
| Mandi page loads | Passed at all 3 viewports |
| Government state options | Passed |
| State selection loads districts | Passed |
| District selection loads mandi choices | Passed |
| Mandi selection requests live prices | Passed |
| Price or honest empty-state UI | Passed |
| No horizontal overflow | Passed at all 3 viewports |
| No uncaught browser JavaScript errors | Passed at all 3 viewports |
| Deployed commodity photographs | 147/147 returned successful image responses |

The 45 public checks also verified API discovery, exact deployed SHA, health, live-only mode, government location catalogue, Himachal Pradesh filter/price consistency, pagination, price record schema, OpenAPI, AI usage guide, mandi page and security headers.

## 3. Dependency security

- Vite upgraded from 6.2.7 to 6.4.6.
- `package.json` and `package-lock.json` are synchronized.
- The previous non-blocking development audit was replaced with a blocking `npm audit --audit-level=high`.
- Both the dependency-refresh validation and main CI completed successfully with zero reported vulnerabilities.

## 4. Contact form security — owner action still required

- Contact submissions are handled server-side through Web3Forms; the key is not intentionally exposed in the browser bundle.
- The Vercel project has a `WEB3FORMS_ACCESS_KEY` environment-variable entry. Its secret value was not inspected.
- A previous Web3Forms key was exposed in public source and must be treated as compromised.
- **Rotation and real provider delivery are not verified yet.** No live contact message was sent as part of this audit.
- The account owner must revoke/rotate the old key in Web3Forms, update the Vercel Production `WEB3FORMS_ACCESS_KEY` value, redeploy, and submit one controlled test through the public form. Verify receipt in the configured inbox.
- Never paste the replacement key into chat, source code, a commit, or a public issue.

The contact route's existing server-side validation, consent check, honeypot and mocked integration coverage remain in place. Mocked provider tests do not prove real email delivery.

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
| Documentation consistency | This report updated to the deployed release |
| Web3Forms key rotation | **Pending account owner** |
| Real contact-provider delivery test | **Pending account owner** |

**Current verdict:** Rate-GPT's code release is merged, CI-green, production-deployed on the exact expected SHA, and production verification passed 45/45 public checks plus 25/25 browser checks. The project is not honestly 100% complete until the previously exposed Web3Forms key is rotated and a controlled real delivery is confirmed. No key should be shared in chat to complete that step.
