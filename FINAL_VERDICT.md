# Rate-GPT — Current Engineering & Release Readiness

**Status date:** 15 November 2026  
**Repository:** https://github.com/Mr-Divyansh/Rate-Gpt  
**Production URL:** https://rate-gpt.vercel.app/

> This document distinguishes successful deployment and endpoint checks from full product completion. Rate-GPT is not declared universally complete while upstream source limitations and browser/device QA remain.

## 1. Repository and CI

- Latest verified `main` commit: `e18014a394d100af26284e3ca43b351c86ae19a7`.
- PR #57 (exact production commit identity in release checks) is merged.
- GitHub Actions run `43737678374` passed all 15 job steps: dependency audit, unit/service tests, API integration, API contract/OpenAPI, AGMARKNET service/catalogue, SEO metadata, responsive source regression, release-gate regression, TypeScript and production build.
- No open GitHub issues were present at the latest issue search.
- Production deployment is Vercel deployment `dpl_J7waXEhwFhfNFjr5NbcS6DXyhd` (READY), built from the same `main` SHA above. Its production aliases include `rate-gpt.vercel.app`.

## 2. Production verification performed

Direct requests were made against the production custom domain after deployment:

| Check | Observed result |
|---|---|
| `GET /api/v1/` | HTTP 200; discovery reports `commitSha=e18014a394d100af26284e3ca43b351c86ae19a7` and `priceStorage=disabled` |
| `GET /api/v1/health` | HTTP 200; status `ok` |
| `GET /api/v1/meta/filters` | HTTP 200; official administrative catalogue and crop directory returned |
| `GET /api/v1/meta/filters?state=Himachal Pradesh` | HTTP 200; AGMARKNET 2.0 directory reports 13 districts and 47 markets, 47/47 directory records scanned |
| `GET /api/v1/prices?limit=5` | HTTP 200; five real OGD observations returned; reported total 2,593; source unit explicitly says not provided |
| `GET /api/v1/prices?state=Himachal Pradesh&limit=100` | HTTP 200; 42 live observations returned for 15 Nov 2026 |
| `GET /api/v1/prices?state=Himachal Pradesh&commodity=Potato&limit=100` | HTTP 200; two observations returned (SMY Bhuntar and SMY Takoli) |
| `GET /api/v1/sync-status` | HTTP 200; on-demand mode, scheduler disabled, bulk sync disabled, price storage disabled |
| `GET /openapi.json` and `GET /llms.txt` | HTTP 200; published API contract and AI usage guide available |
| `GET /mandi-prices.html` | HTTP 200; page HTML and required selector/table elements present |

The API discovery SHA matches the Vercel deployment's source SHA. This verifies that the production alias is serving the intended release, rather than an older deployment.

These are direct endpoint checks, not a claim that the complete GitHub production-smoke workflow or real-browser interaction suite has run. The full production smoke workflow has not yet been confirmed as completed for this release.

## 3. Government data source and honest limitations

### Implemented

- Price observations are fetched on demand from Government of India OGD resource `9ef84268-d588-465a-a308-a864a43d0070`.
- The public AGMARKNET 2.0 filters endpoint supplies administrative state, district, market and commodity directory data.
- Price records are not persisted by Rate-GPT. Temporary in-process caching applies to filter/directory metadata only.
- Missing prices remain missing; no synthetic observations are added.
- Source units are preserved. Where OGD does not provide a unit, the response says `Not provided by source`.
- Responses distinguish API fetch time from government arrival date and upstream update time where supplied.
- “Live” means a fresh request for the latest government-published observations available from the source, not an instantaneous auction/trading quote.

### External limitations

- The AGMARKNET 2.0 price-report endpoint previously returned `TOKEN_OR_CAPTCHA_REQUIRED`. Rate-GPT must not bypass or automate this access gate.
- An administrative directory entry does not prove that a market has a price observation on a given day.
- The observed 42 Himachal Pradesh rows and two Potato rows are the source's returned observations at the time checked; they are not proof that every registered mandi reported prices.
- OGD observations checked did not include a source unit. Do not label them ₹/quintal or ₹/kg without a verified unit.
- `/api/v1/sync-status` explicitly reports `schedulerEnabled: false` and `bulkSyncEnabled: false`. Price fetching is on-demand, not an automatic background sync.
- Broader unattended coverage requires another official, documented government price source that is accessible without CAPTCHA/token bypass.

See [live-data coverage and source limitations](docs/live-data-coverage.md).

## 4. Product quality and remaining QA

- Responsive layouts, mobile price cards, filters, paging, CSV export, Hindi/English labels and reduced-motion styling are implemented.
- GitHub CI responsive regression checks pass, but source-level checks are not equivalent to real browser/device testing.
- The production mandi page HTML and key controls were fetched successfully. Full user-interaction testing in a real browser at mobile, tablet and desktop sizes has not yet been demonstrated.
- Physical-device QA has not been performed in this verification.
- Contact-form delivery requires the production `WEB3FORMS_ACCESS_KEY`; a successful live contact submission has not been tested in this audit.
- Historical trends are intentionally unavailable (HTTP 410) because price history is not stored.
- Hackathon/admin portal submission is a separate external task and requires authorized portal access.

## 5. Definition of done

1. Latest `main` commit is deployed as a Vercel production deployment.
2. Production custom domain resolves to that deployment and API discovery reports the exact deployed commit SHA.
3. Production API smoke suite completes successfully against the custom domain.
4. Live price observations return valid source provenance, timestamps, pagination and explicit unknown units where needed.
5. No fabricated prices, unsupported coverage claims, persistent price records or CAPTCHA bypasses are introduced.
6. Key user flows pass real browser tests at mobile, tablet and desktop viewports.
7. Contact delivery is verified with the configured provider, or clearly marked unavailable if configuration is absent.
8. Documentation matches deployed code and actual government-source capabilities.

**Current verdict:** Latest main CI passed; the exact latest commit is deployed to production; direct production API/data checks listed above passed. Full production-smoke workflow completion, real-browser interaction QA, physical-device QA and live contact-delivery verification remain unproven. Government-source limitations also prevent a guarantee of price data for every mandi every day. Therefore the project is not honestly classifiable as 100% complete yet.
