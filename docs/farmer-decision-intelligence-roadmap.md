# Rate-GPT Farmer Decision Intelligence Roadmap

## Product goal

Evolve Rate-GPT from a government-reported mandi-price discovery website into a transparent farmer decision-support platform. Every decision-support result must preserve the distinction between government-reported arrival observations and a current sale offer. Never invent prices, historical observations, weather conditions, or guaranteed outcomes.

## Current repository facts (verified before implementation)

- The production data path is Browser -> Express API -> Government of India OGD / AGMARKNET.
- The API exposes live price observations through `GET /api/v1/prices`, with pagination and source/fetch metadata.
- `GET /api/v1/prices/trend` currently returns `410 HISTORICAL_STORAGE_DISABLED`.
- `GET /api/v1/prices/compare` currently returns `410 HISTORICAL_DATE_UNAVAILABLE`; do not treat this as a working comparison API.
- The app currently has a Weather page and browser-side weather experience; inspect and verify it before extending it.
- Price records are not persistently stored. The 60-second Vercel edge cache is not a historical database.
- The repository uses Vite, TypeScript, Express, Zod, and Vercel. Existing test commands are documented in package.json and README.

## Delivery rules

1. Work on this feature branch; do not commit experimental changes directly to main.
2. Keep existing mandi-price discovery behavior intact.
3. Use real source data only. Clearly show source, arrival date, unit, fetch time, and stale/unavailable states.
4. Never present arrival observations as guaranteed current offers.
5. Never claim AI-generated recommendations are predictions. Explain the inputs and calculations behind every recommendation.
6. Do not add API keys to frontend code or commit secrets.
7. Every phase needs unit/integration tests, responsive checks, accessibility checks, and a production build.
8. A phase is complete only when implementation, tests, documentation, and deployment verification pass.

## Phase 0 — Baseline and safety gates

- [ ] Confirm current branch and production baseline.
- [ ] Run existing test, lint, build, API-contract, responsive, and release-gate suites.
- [ ] Verify current public API envelopes and price metadata.
- [ ] Record baseline failures before feature work.
- [ ] Inspect current Weather implementation and environment requirements.

## Phase 1 — Farmer decision tools

### 1. Smart mandi comparison
- [ ] Build a comparison flow using actual live records for the same commodity.
- [ ] Allow state/district/market filters and pagination-aware data collection.
- [ ] Compare only records with compatible units and clearly display arrival dates.
- [ ] Label results as reported observations, not live offers.
- [ ] Do not compare records with missing modal prices as zero.
- [ ] Avoid implying national completeness when only a subset/page was retrieved.

### 2. Net profit calculator
- [ ] Accept quantity, unit, transport, loading/unloading, and optional other costs.
- [ ] Validate non-negative values and supported units.
- [ ] Calculate gross revenue, expenses, net estimate, and break-even price.
- [ ] Show the selected mandi record's source date and source unit alongside the estimate.
- [ ] Make clear that quality deductions, commissions, taxes, negotiation, and other costs may not be included unless entered.

### 3. AI-powered mandi assistant
- [ ] First implement a grounded decision assistant that uses only retrieved records and calculator inputs.
- [ ] Explain why a mandi appears in a comparison, cite the exact record date, and expose assumptions.
- [ ] Say when evidence is insufficient; never fabricate an answer.
- [ ] Only add a hosted LLM after server-side provider configuration, privacy review, rate limits, prompt-injection defenses, and deterministic fallback tests are in place.

## Phase 2 — Historical intelligence and alerts

### 4. Historical price analytics
- [ ] Select a compliant persistence strategy and document retention/deletion policy.
- [ ] Build scheduled ingestion with idempotency, source identifiers, and provenance.
- [ ] Backfill only from an authorized and verifiable historical source; otherwise start collecting forward in time.
- [ ] Expose 7/30/90-day charts only when enough stored observations exist.
- [ ] Distinguish missing days from zero prices and show coverage gaps.

### 5. Smart price alerts
- [ ] Add opt-in subscriptions with verified delivery destinations.
- [ ] Store threshold, crop, market, unit, consent, and notification status securely.
- [ ] Trigger only from newly ingested, validated observations.
- [ ] Prevent duplicate notifications and provide unsubscribe/delete controls.
- [ ] Explain that alerts are based on reported arrivals, not guaranteed offers.

## Phase 3 — Farming intelligence and language access

### 6. Weather intelligence
- [ ] Audit and complete the existing Weather page rather than duplicating it.
- [ ] Verify provider, API configuration, attribution, time zone, location consent, and error handling.
- [ ] Add forecast periods only if the provider plan/API actually supports them.
- [ ] Keep weather guidance informational and avoid unsupported agronomic claims.

### 7. Multilingual support
- [ ] Audit translation-key coverage and language-switch persistence.
- [ ] Add Punjabi, Marathi, Gujarati, and other languages incrementally.
- [ ] Review translations with fluent speakers; do not rely solely on machine translation for critical warnings.
- [ ] Localize dates, numbers, units, accessibility labels, and error messages.

## Phase 4 — Accessibility and offline access

### 8. Offline PWA
- [ ] Add a manifest, installability checks, and carefully scoped service-worker caching.
- [ ] Cache only static assets and user-requested/saved observations.
- [ ] Display the original arrival date and last-fetched time for cached observations.
- [ ] Never present cached data as current; provide a clear offline/stale indicator.
- [ ] Test update lifecycle, storage limits, and recovery from failed requests.

### 9. Voice assistant
- [ ] Add accessible voice input with typed-search fallback.
- [ ] Request microphone permission only after an explicit user action.
- [ ] Confirm recognized crop/location before querying.
- [ ] Announce results accessibly and avoid automatic voice recording/storage.

## Phase 5 — Personalized farmer dashboard

### 10. Farmer dashboard
- [ ] Define a privacy-minimizing profile model and optional sign-in only if needed.
- [ ] Let users save crops, markets, comparisons, and calculator scenarios.
- [ ] Provide clear data export and account/data deletion controls.
- [ ] Keep personalized insights explainable and grounded in source records.

## Final release gate

- [ ] All automated tests pass.
- [ ] TypeScript lint and production build pass.
- [ ] API contract and security checks pass.
- [ ] Desktop, mobile, keyboard, and screen-reader checks pass.
- [ ] No secrets or personal data are exposed.
- [ ] Source attribution, data freshness, units, and limitations are visible.
- [ ] Production deployment matches the tested commit.
- [ ] Demo uses verified records and clearly labelled illustrative assumptions.

## Progress tracking

This document is the implementation checklist, not evidence that a feature is already shipped. Check an item only after its acceptance criteria and tests pass.
