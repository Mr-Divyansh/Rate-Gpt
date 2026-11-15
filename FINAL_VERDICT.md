# Rate-GPT — Current Engineering & Release Readiness

**Status date:** 15 November 2026  
**Repository:** https://github.com/Mr-Divyansh/Rate-Gpt  
**Production URL:** https://rate-gpt.vercel.app/

> Production release verification is now complete for the checks listed below. This is not a claim of universal daily mandi coverage, physical-device certification, or verified contact-provider delivery.

## 1. Repository, merge and CI

- Latest verified production main commit: e038c0b7008e3b8fe5a63a31a36ed026a4578bae.
- PR #60 (canonical state aliases for live price queries) is merged.
- GitHub Actions CI run 43740037244 passed all 15 job steps: dependency audit, unit/service tests, API integration, API contract/OpenAPI, AGMARKNET service/catalogue, SEO metadata, responsive source regression, release-gate regression, TypeScript and production build.
- Production smoke workflow run 43740121570 passed its release-identity gate and all **41/41** public production checks.
- The latest main commit is deployed to Vercel production deployment dpl_DLThkE2Gj5ykGTokn5b1Gt4Pik2u (READY), built from the exact same SHA. Production aliases include rate-gpt.vercel.app.
- GitHub check runs for the deployed SHA report both “Tests, typecheck and production build” and “Verify deployed Rate-GPT” as completed successfully.

## 2. Production verification performed

Direct requests against the production custom domain and the GitHub production-smoke workflow verified:

| Check | Observed result |
|---|---|
| GET /api/v1/ | HTTP 200; discovery reports the exact deployed SHA and priceStorage=disabled |
| GET /api/v1/health | HTTP 200; status ok |
| GET /api/v1/meta/filters | HTTP 200; official administrative catalogue returned |
| GET /api/v1/meta/filters?state=Himachal Pradesh | HTTP 200; complete reported directory scope: 13 districts and 47 markets |
| GET /api/v1/prices?limit=5 | HTTP 200; five real OGD observations, valid timestamps and explicit source-unit field |
| GET /api/v1/prices?state=Himachal Pradesh&limit=100 | HTTP 200; 42 live observations returned during this verification |
| GET /api/v1/prices?state=Himachal Pradesh&commodity=Potato&limit=100 | HTTP 200; two observations returned |
| GET /api/v1/prices?state=Delhi&limit=100 | HTTP 200; 37 observations; source state spelling is NCT of Delhi |
| GET /api/v1/prices?state=Kerala&limit=100 | HTTP 200; 223 total observations; source state spelling is Keralam |
| GET /api/v1/prices?state=Chhattisgarh&limit=100 | HTTP 200; six observations; source state spelling is Chattisgarh |
| GET /api/v1/prices?state=Puducherry&limit=100 | HTTP 200; zero matching observations in the checked source response |
| GET /api/v1/prices?state=Andaman%20and%20Nicobar%20Islands&limit=100 | HTTP 200; zero matching observations in the checked source response |
| GET /api/v1/prices/compare?commodity=Potato&date=2026-11-15 | HTTP 200; 100 rows on first page, 112 total; pagination reports more rows |
| GET /api/v1/commodities/search?q=potato&limit=10 | HTTP 200; two source-derived suggestions |
| GET /api/v1/sync-status | HTTP 200; on-demand mode, scheduler disabled, bulk sync disabled, price storage disabled |
| GET /api/v1/prices/trend | HTTP 410 with documented HISTORICAL_STORAGE_DISABLED response; intentional in no-history architecture |
| GET /openapi.json, GET /llms.txt, GET /mandi-prices.html | HTTP 200; published API contract, AI guide and mandi page served |
| Security headers | Production page sends CSP, HSTS and X-Content-Type-Options: nosniff |

The production smoke workflow also verified Himachal Pradesh filter/price consistency, pagination metadata, exact arrival-date query acceptance, live source provenance, price record schema, page selectors and required security headers.

The production API discovery SHA matches the Vercel deployment source SHA. This verifies that the production alias is serving the intended release, rather than an older deployment.

## 3. State alias behavior

The merged alias normalization now maps canonical UI labels to the exact spellings used by the OGD price API:

- Delhi → NCT of Delhi
- Kerala → Keralam
- Chhattisgarh → Chattisgarh
- Andaman and Nicobar Islands → Andaman and Nicobar
- Puducherry → Pondicherry

Delhi, Kerala and Chhattisgarh returned live rows during the production check. Puducherry and Andaman-Nicobar returned zero price rows at that time; HTTP 200 with an empty array is an honest no-observation result, not evidence that the alias mapping is broken. A source directory entry is not a guarantee of a daily price report.

## 4. Government data source and honest limitations

### Implemented

- Price observations are fetched on demand from Government of India OGD resource 9ef84268-d588-465a-a308-a864a43d0070.
- The public AGMARKNET 2.0 filters endpoint supplies administrative state, district, market and commodity directory data.
- Price records are not persisted by Rate-GPT. Temporary in-process caching applies to filter/directory metadata only.
- Missing prices remain missing; no synthetic observations are added.
- Source units are preserved. Where OGD does not provide a unit, the response says “Not provided by source”. The UI disables the unit selector unless source unit data supports it.
- Responses distinguish API fetch time from government arrival date and upstream update time where supplied.
- “Live” means a fresh request for the latest government-published observations available from the source, not an instantaneous auction/trading quote.

### External limitations

- The AGMARKNET 2.0 price-report endpoint previously returned TOKEN_OR_CAPTCHA_REQUIRED. Rate-GPT must not bypass or automate this access gate.
- An administrative directory entry does not prove that a market has a price observation on a given day.
- Observed row counts are snapshots at verification time, not proof that every registered mandi reported prices.
- OGD observations checked did not include a source unit. Do not label them ₹/quintal or ₹/kg without a verified unit.
- /api/v1/sync-status explicitly reports schedulerEnabled: false and bulkSyncEnabled: false. Price fetching is on-demand, not automatic background sync.
- Historical trend storage is intentionally disabled; the API returns HTTP 410 rather than inventing a history.
- Broader unattended coverage requires another official, documented government price source that is accessible without CAPTCHA/token bypass.

See [live-data coverage and source limitations](docs/live-data-coverage.md).

## 5. Product QA and remaining release tasks

- Responsive layouts, mobile price cards, filters, paging, CSV export, Hindi/English labels and reduced-motion styling have source-level regression coverage in CI.
- The production mandi page HTML, JavaScript bundle, required controls and security headers were fetched successfully.
- GitHub CI responsive tests and the production smoke suite passed. They are not equivalent to manual real-browser interaction at mobile, tablet and desktop sizes or physical-device QA; those have not been demonstrated in this audit.
- The production environment contains a WEB3FORMS_ACCESS_KEY variable entry, but the secret value was not inspected and a real contact submission was not sent. Contact-provider delivery therefore remains unverified.
- The Vercel environment-variable note says the previous Web3Forms key was exposed in public source and should be rotated after migration. Rotate it in the provider dashboard and update the Vercel production variable without sharing the key in chat or committing it.
- A production runtime-error scan found two SyntaxError events on an older deployment dpl_9y8SVKcLtUS2QsgDLCqbbazMfA2R at 13:11 UTC, before the current release. No error/fatal runtime log entries were returned for the latest 30-minute window. Hobby-plan log retention prevented a wider raw-log scan.
- Hackathon/admin portal submission is a separate external task and requires authorized portal access.

## 6. Definition of done

1. Latest main commit is deployed as a Vercel production deployment — **verified**.
2. Production custom domain serves the exact deployed SHA — **verified**.
3. Production API smoke suite completes successfully against the custom domain — **41/41 passed**.
4. Live price observations return valid source provenance, timestamps, pagination and explicit unknown units where needed — **verified for the sampled requests**.
5. No fabricated prices, unsupported coverage claims, persistent price records or CAPTCHA bypasses are introduced — **verified by code/docs and current API behavior**.
6. Key user flows pass real browser tests at mobile, tablet and desktop viewports — **not yet demonstrated; source-level responsive checks passed**.
7. Contact delivery is verified with the configured provider — **not yet verified; provider key rotation and a controlled end-to-end delivery test remain**.
8. Documentation matches deployed code and actual government-source capabilities — **this report refreshed to the current deployed release**.

**Current verdict:** The latest release is merged, CI-green, production-deployed on the exact expected SHA, and its production smoke suite passed 41/41. The production API and sampled state-alias queries also passed. Rate-GPT should not be called universally or operationally 100% complete until real-browser/device QA and controlled contact-provider delivery verification are completed, and the previously exposed contact-provider key has been rotated. Government-source limitations also prevent a guarantee of price data for every mandi every day.
