# Rate-GPT Engineering Audit — Initial Repository Pass

**Date:** 14 November 2026  
**Repository:** `Mr-Divyansh/Rate-Gpt`  
**Base:** `main`  
**Audit branch:** `audit/complete-engineering-review-2026-11`  
**Status:** Initial source inspection; not a completed production audit.

## Scope and evidence

Inspected the GitHub repository tree, package scripts, README, production server, Vercel function entry point/configuration, API router, live mandi service, contact form handler/markup, database architecture notes, security notes, test sources, shared CSS, and page source files.

The two requested PDF audit reports were not available in the conversation's uploaded-file search. Their findings therefore cannot yet be verified or merged into this report. The live website could not be retrieved through the available page-fetch route in this pass. No claim is made here about current live response headers, live page rendering, Lighthouse scores, or production API availability.

GitHub repository metadata reports default branch `main`, public repository, and write permission. The remote branch list contains 18 branches at inspection time. A separate audit branch was created; no changes were made to `main`.

## Confirmed architecture

- Frontend: multi-page HTML, CSS, browser JavaScript, built with Vite.
- Backend: Express + TypeScript, exposed on Vercel through `api/index.ts`.
- Government source: data.gov.in / AGMARKNET resource `9ef84268-d588-465a-a308-a864a43d0070`.
- Data path: on-demand server-side upstream requests; `DATA_GOV_API_KEY` is read server-side.
- Database code: SQLite local fallback and PostgreSQL when `DATABASE_URL` or `POSTGRES_URL` is configured. Documentation says live mandi price/filter requests do not persist observations; database tables and sync code are retained legacy functionality.
- Tests/scripts declared: `npm test`, `npm run test:integration`, `npm run lint` (TypeScript no-emit), `npm run build`.
- Deployment: Vercel function configured for `api/index.ts`, region `bom1`, with API rewrite.

## Confirmed findings

### P0 — Evidence gaps that prevent sign-off

1. **Browser audit PDFs unavailable.** The requested WebAudit and QA PDFs were not returned by uploaded-file search. The reported 916 KB CSS transfer and 11 small controls remain unverified against the source or live waterfall.
2. **Live production checks not completed.** Current production response headers, CSP, CORS, redirect behavior, page rendering, API health, and deployed environment configuration were not verified. Do not mark security or production QA as passed.
3. **No local checkout/runtime was available in this pass.** `npm ci`, test scripts, TypeScript, build, browser automation, responsive checks, accessibility scans, and Lighthouse were not executed. GitHub source reads are not a substitute for executing the project.

### P1 — Documentation and architecture clarity

1. **README page inventory is stale.** README currently says the public site has three pages, but the Vite build inputs include six: Home, Mandi Prices, About, Contact, Terms, and Privacy.
2. **Security documentation conflicts with current server code.** `docs/security.md` describes a 20-request admin limiter and a 30-second public GET cache policy. Current `server.ts` configures general API limit 300/15 min, live-data limit 100/15 min, contact limit 5/15 min, and applies `Cache-Control: no-store` to all `/api` responses. The security document should be reconciled with actual routes/configuration.
3. **Database documentation needs to remain explicit about legacy status.** `database.md` and `live-mandi-migration.md` state that legacy `mandi_prices` and `sync_logs` tables remain but live prices are not stored. Do not describe the database as the active live-price source or remove it without a separately approved data review.

### P1 — Live data behavior and coverage

1. **Filter coverage is intentionally bounded.** The filters route documents that distinct values come from a bounded live result page and market options may be partial. This is not an exhaustive national market/commodity catalogue.
2. **Market comparison is explicitly first-page only.** The compare route requests up to 100 records at offset zero and exposes `comparisonMayBePartial` when another page exists. Any UI must preserve this limitation rather than imply all markets were compared.
3. **Pagination metadata is based on upstream raw page length/total.** The service validates returned offset, limit and total, deduplicates mapped records, and advances by raw page length. This deserves integration coverage for duplicate-heavy pages, missing totals, and upstream count/total inconsistencies.
4. **Retry and timeout logic exists.** Upstream requests have an 8-second timeout and up to three attempts, including 429/5xx retry handling. Verify actual behavior through tests/runtime before changing it.
5. **Freshness wording is appropriately cautious in core service/docs.** `fetchedAt` is the proxy fetch time and is not a source publication timestamp. The UI/legal text must continue to distinguish these.

### P1 — Contact form and privacy

1. **Consent is enforced server-side.** The contact schema requires `consent: true`; the integration test source includes a missing-consent rejection assertion.
2. **Contact delivery is third-party processing.** The server forwards contact data to Web3Forms using `WEB3FORMS_ACCESS_KEY`, with a server-side timeout. Privacy disclosures and retention wording should be checked against the actual Web3Forms account/configuration and the operator's retention practices.
3. **Legal owner details cannot be inferred from source.** Any legal entity/name, postal address, retention period, or privacy contact that is not verified must be requested from the site owner, not invented.

### P2 — CSS/performance and accessibility review

1. **The repository contains shared and page-specific stylesheets.** Source files include `base.css`, `global-nav.css`, `style.css`, `mandi-prices.css`, `about.css`, and `contact-legal.css`. Raw source sizes do not prove the reported transfer size; inspect the deployed network waterfall and generated `dist` output before deciding whether splitting or removal is warranted.
2. **Shared CSS already defines a visible focus style, skip link, and `.sr-only`.** Preserve these. Several controls have 44–48px minimum heights, but every interactive control still needs an actual rendered-size and keyboard review.
3. **Color contrast requires computed-style measurement.** Tokens such as `--muted`, `--green`, and footer text must be measured against their actual backgrounds; do not make global token changes without checking all surfaces.

## Prioritized repair plan

1. Obtain both PDF reports and reconcile each finding against source and live behavior.
2. Establish reproducible baseline: install from lockfile, run lint/unit/integration/build, capture exact outputs, and record deployed page/API/header checks.
3. Correct stale documentation (page inventory, security limits/cache policy, active-vs-legacy database description).
4. Fix confirmed accessibility issues from rendered contrast/target/keyboard checks while preserving `.sr-only` and focus behavior.
5. Inspect production CSS/JS network transfer and generated bundle; remove/split only proven redundant or oversized assets.
6. Review canonical/Open Graph/Twitter/schema/robots/sitemap across all six pages.
7. Review response headers on HTML and API routes separately; test CSP in report-only before enforcement and document required third-party origins.
8. Expand tests around pagination, date filtering, upstream timeouts/429/5xx, partial prices, contact consent, and invalid inputs.
9. Review privacy disclosures with verified Web3Forms configuration and owner-provided legal details.
10. Open a reviewable PR; keep merge and production deployment approval-gated.

## Not performed / not claimed

- No production database reads/writes, migrations, or cleanup.
- No secret values were requested or exposed.
- No production deployment or merge.
- No test, build, Lighthouse, WCAG, SEO crawler, live header, or browser result is reported as passed.
- No prices, market coverage, source publication times, legal owner details, or production credentials have been fabricated.

## Inputs needed to complete the audit

- Upload both PDF reports (or provide their contents).
- Provide an approved local runtime/repository workspace or CI run access for executable checks.
- For legal review: confirm the actual data retention practice, Web3Forms account settings/retention, and the correct legal/privacy contact details.
- Do not send API keys, database URLs, or other secrets in chat; configure them directly in the deployment environment.
