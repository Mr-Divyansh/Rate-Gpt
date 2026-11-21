# Rate-GPT — Engineering & Release Readiness

**Status date:** 19 November 2026  
**Repository:** https://github.com/Mr-Divyansh/Rate-Gpt  
**Production URL:** https://rate-gpt.vercel.app/

> This report records the actual deployed release and completed checks. It does not claim universal daily mandi coverage, physical-device certification, or inbox receipt that has not been confirmed.

## 1. Release identity and CI

- Latest contact-fix production main commit: `003d63b710f0cf701513fd903d870c5d6f1755fa`.
- PR #123 (dependency security and production browser verification), PR #124 (Playwright-compatible production runner), and PR #126 (Web3Forms browser-side delivery) are merged.
- The full npm audit passed with **0 vulnerabilities** after upgrading Vite from 6.2.7 to **6.4.6** and regenerating `package-lock.json`.
- The contact-fix branch passed local verification: 79 unit tests, API integration tests, 86 site metadata checks, TypeScript lint, and production build.
- Vercel deployment **dpl_CTERDaKKHSVjeYbs918KF5DyGoLy** is READY for the latest main commit. The production alias includes `rate-gpt.vercel.app`.

## 2. Production verification

The previous production smoke workflow run **44446966345** passed:

- **45/45 public production smoke checks**
- **25/25 real-browser production checks**
- Exact production commit identity verified before running tests.
- Browser viewports: mobile 390px, tablet 768px and desktop 1440px.
- **147/147** deployed commodity photographs returned successful image responses.

The contact-fix deployment was additionally checked:
- `/contact.html` returns HTTP 200.
- The deployed contact JavaScript bundle includes the Web3Forms endpoint and the configured public access key.
- Production CSP allows `https://api.web3forms.com` in `connect-src` and `form-action`.
- Vercel reports the new production deployment as READY.

## 3. Dependency security

- Vite upgraded from 6.2.7 to 6.4.6.
- `package.json` and `package-lock.json` are synchronized.
- The previous non-blocking development audit was replaced with a blocking `npm audit --audit-level=high`.
- The full npm audit passed with zero reported vulnerabilities.

## 4. Web3Forms contact delivery

- Web3Forms documentation identifies its form Access Key as a public form identifier that is safe for browser-side use; it is not an account password or private API secret.
- The previous implementation sent requests from a Vercel server function. A controlled production request returned HTTP 502, and a direct provider request from the server environment returned HTTP 403 with Web3Forms' message that server-side calls require a Pro plan and server-IP safelisting.
- PR #126 changes the public contact page to use Web3Forms' standard browser-side submission flow.
- Vercel Production now has the public build variable `VITE_WEB3FORMS_ACCESS_KEY` configured. It is intentionally exposed in the built browser bundle.
- The production build and CSP changes are deployed and verified.
- The site owner confirmed that two test submissions appeared in the configured Web3Forms inbox (13 and 19 November 2026). This confirms the browser-side delivery path at the owner-observed level; the assistant did not independently access the private inbox. The earlier verification sandbox could not launch Chromium because its runtime image lacked required browser shared libraries.

The form continues to require consent and includes a honeypot. Contact submissions are not written to a Rate-GPT database. The optional server-side API proxy requires Web3Forms Pro and server-IP safelisting.

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
| Production mobile/tablet/desktop browser checks | Complete — 25/25 on previous verified release |
| Public production smoke checks | Complete — 45/45 on previous verified release |
| Web3Forms browser-side integration fix | Complete — PR #126 merged and deployed |
| Public key configured in Vercel Production build | Complete |
| Production contact-page and CSP checks | Complete |
| Web3Forms provider acceptance and inbox receipt | Confirmed by site owner: two test submissions received |
| Inbox receipt | Confirmed by site owner |

**Current verdict:** The Web3Forms integration has been corrected, merged and deployed, and the site owner has confirmed two submissions in the configured inbox. The previous claim that the public Web3Forms Access Key had to be rotated solely because it was visible was incorrect; Web3Forms documents these form keys as public. This owner confirmation is not an independent audit of inbox configuration or provider retention.
