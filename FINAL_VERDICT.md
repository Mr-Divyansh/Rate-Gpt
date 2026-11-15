# Rate-GPT — Current Engineering & Release Readiness

**Status date:** 15 November 2026  
**Repository:** https://github.com/Mr-Divyansh/Rate-Gpt  
**Production URL:** https://rate-gpt.vercel.app/

> This document is the current release status. It does not declare the product complete until the latest `main` commit is deployed to the production domain and the production smoke suite passes.

## 1. Current repository state

- Latest verified `main` commit: `98a53ec4c866e1e3c89a87c8ee94f48e69093dfb`.
- PR #49: mobile navigation keyboard-focus restoration — merged.
- PR #50: accurate release-readiness documentation — merged.
- PR #51: five-column mandi empty-state alignment — merged.
- PR #52: release status refresh — merged.
- PR #53: production smoke release gate — merged.
- PR #53 makes the production smoke workflow fail explicitly when production still serves an older release or the deployment is rate-limited. It no longer treats a skipped public smoke suite as a successful release verification.
- CI for PR #53 passed: dependency audit, unit/service tests, API integration tests, AGMARKNET catalogue checks, site metadata, responsive regression checks, release-gate regression checks, TypeScript and production build.
- The release-gate regression test checks the stale-release failure path and required release markers.
- No open pull requests or GitHub issues were present at the last repository audit.

## 2. Production deployment status

**Production is not yet verified against the latest main commit.**

Last known Vercel production deployment from the deployment audit:

- Deployment: `dpl_7E6PVs7AFT3o6Q7skYkCPg2XgHDx`
- State: `READY`
- Branch: `main`
- Deployed commit: `70fe7bc560b6a5b3e8a2f3444f01cf84fca989bb`

Latest `main` is `98a53ec4c866e1e3c89a87c8ee94f48e69093dfb`; therefore, the last known production deployment is behind the repository.

A separate `READY` Vercel deployment for a feature branch is a preview deployment, not evidence that the production domain has been updated.

Vercel reported the free deployment quota limit and a 24-hour retry cooldown on 15 November 2026. The recorded retry time is **16 November 2026, 8:42 PM IST or later**. A scheduled verification is set for **16 November 2026, 8:45 PM IST**. Do not bypass the limit, create duplicate deployments, or repeatedly retry before the cooldown expires.

The earlier production smoke workflow completed while its public smoke step was skipped because release markers had not reached production. That run did not verify the production API or frontend. PR #53 now makes this condition fail the workflow instead of showing a misleading green result.

## 3. Live government data — verified implementation and external limits

### Implemented

- Price observations are fetched on demand from the Government of India's OGD resource: `9ef84268-d588-465a-a308-a864a43d0070`.
- Price records are not persisted in a database by the application.
- The public AGMARKNET 2.0 filters endpoint supplies the administrative state, district, market and commodity directory.
- The directory cache applies only to selector metadata. It does not cache price observations.
- The UI and API preserve the source unit. If the upstream observation has no unit, the application reports that the unit was not provided rather than assuming a unit.
- Missing prices remain missing; the application must not synthesize or invent observations.
- Price responses distinguish the successful API fetch timestamp from the government-reported arrival date and upstream update timestamp when supplied.

### External source limitations

- The AGMARKNET 2.0 price-report endpoint returned `TOKEN_OR_CAPTCHA_REQUIRED` during prior testing. Rate-GPT must not bypass or automate that CAPTCHA/token gate.
- The OGD feed's actual returned rows do not prove complete daily coverage of every registered mandi.
- “Live” means a fresh request for the latest government-published observation available from the upstream source. It does not mean an instantaneous auction/trading quote.
- Broader coverage requires another official, documented, unattended government price-data source. Do not label all-India or state price coverage complete without measured source evidence.

See [live-data coverage and source limitations](docs/live-data-coverage.md).

## 4. Product quality and UI

- The codebase has responsive desktop/mobile layouts, mobile price cards, filters, paging, CSV export, Hindi/English labels and reduced-motion styling.
- The approved design baseline is Forest Green + Warm Ivory + Harvest Gold, with readable surfaces and restrained accents.
- Mobile navigation restores keyboard focus to its trigger after Escape/backdrop dismissal.
- Responsive and accessibility-related source-level regression assertions pass in CI.
- Real browser/device visual testing has not yet been demonstrated by the available CI suite. Do not claim physical-device validation from CSS/source checks alone.

## 5. Release gates still required

| Gate | Current state | Completion evidence |
|---|---|---|
| Main-branch CI | Passed on latest PR #53 changes | All PR #53 CI steps passed |
| Dependency audit | Passed at `--audit-level=high` | CI audit step; does not exclude low/moderate advisories |
| Latest production deployment | Pending | Vercel production deployment READY with SHA `98a53ec...` |
| Production domain alias | Pending verification | `rate-gpt.vercel.app` resolves to that exact deployment |
| Production API smoke | Pending latest release | Production smoke suite passes against the custom domain |
| Live price verification | Pending latest release | Real API response, valid source metadata and timestamps; no fabricated rows |
| Browser visual QA | Not yet evidenced | Key pages tested at mobile, tablet and desktop viewports in a real browser |
| Physical-device QA | Not yet evidenced | Manual check on actual mobile devices |
| Hackathon/admin submission | Separate external task | Requires authorized access to the relevant submission portal |

## 6. Definition of done

Rate-GPT can be called production-ready for this release only when all of the following are true:

1. Latest `main` commit is deployed as a Vercel **production** deployment.
2. The production custom domain is aliased to that exact deployment.
3. Production smoke tests pass against `https://rate-gpt.vercel.app/`.
4. The live price endpoint returns real upstream observations where available, correct provenance, timestamps, pagination and explicit unknown units.
5. No fake prices, fabricated coverage claims, persistent price records or CAPTCHA bypasses are introduced.
6. Key user flows work across desktop/mobile browser viewports, with remaining physical-device limitations clearly reported.
7. Documentation matches the actual deployed code and data-source capabilities.

**Current verdict: latest main-branch engineering CI passes, but the latest main commit is not yet verified in production. Release completion remains pending deployment, production API/data checks and browser QA.**
