# Rate-GPT — Current Engineering & Release Readiness

**Status date:** 15 November 2026  
**Repository:** https://github.com/Mr-Divyansh/Rate-Gpt  
**Production URL:** https://rate-gpt.vercel.app/

> This document is the current release status. It intentionally does not declare the product complete until the latest `main` commit is deployed to the production domain and the production smoke suite passes.

## 1. Current repository state

- Latest `main` commit: `a50fac5cf03b8c84db643126099055a194948a49`
- PR #49 (mobile navigation keyboard-focus restoration) is merged.
- PR #49 CI check: passed.
- Merged-main CI run `43729810208`: passed, including dependency audit, unit/service tests, API integration, AGMARKNET catalogue tests, site metadata, responsive regression checks, TypeScript and production build.
- No open pull requests or GitHub issues were present at the last repository audit.

## 2. Production deployment status

**Production is behind the latest source commit.**

Latest Vercel deployment explicitly targeting production at the last audit:

- Deployment: `dpl_7E6PVs7AFT3o6Q7skYkCPg2XgHDx`
- State: `READY`
- Branch: `main`
- Deployed commit: `70fe7bc560b6a5b3e8a2f3444f01cf84fca989bb`

Latest repository `main` is `a50fac5cf03b8c84db643126099055a194948a49`, so the production deployment does not yet contain the latest merged work.

A separate `READY` Vercel deployment for `fix/mobile-navigation-focus-restoration` is a preview deployment. It is not evidence that the production domain has been updated.

Vercel reported the free deployment quota limit and a 24-hour retry cooldown. Do not bypass the limit or repeatedly retry. The scheduled deployment verification is set for **16 November 2026, 8:45 PM IST**. The deployment must be checked again then.

A GitHub production smoke workflow for the current merge was still running at the time of this status snapshot. Its result must be recorded after it completes; do not assume it passed.

## 3. Live government data — what is and is not verified

### Implemented

- Price observations are fetched on demand from the Government of India's OGD resource:
  `9ef84268-d588-465a-a308-a864a43d0070`.
- Price records are not persisted in a database by the application.
- The production Vercel environment has a `DATA_GOV_API_KEY` secret configured. The secret value was not read or exposed during this audit.
- The public AGMARKNET 2.0 filters endpoint supplies the administrative state, district, market and commodity directory.
- The directory cache applies only to selector metadata. It does not cache price observations.
- The UI and API preserve the source unit. If the upstream observation has no unit, the application must show that the unit was not provided rather than assume a unit.
- Missing prices must remain missing; the application must not synthesize or invent observations.

### External source limitations

- The AGMARKNET 2.0 price-report endpoint returned `TOKEN_OR_CAPTCHA_REQUIRED` during prior testing. Rate-GPT must not bypass or automate that CAPTCHA/token gate.
- The OGD feed's actual returned rows do not prove complete daily coverage of every registered mandi.
- “Live” means a fresh request for the latest government-published observation available from the upstream source. It does not mean an instantaneous auction/trading quote.
- Broader coverage requires another official, documented, unattended government price-data source. Do not label all-India or state coverage complete without measured source evidence.

See [live-data coverage and source limitations](docs/live-data-coverage.md).

## 4. Product quality and UI

- The codebase has a responsive desktop/mobile layout, mobile price cards, filters, paging, CSV export, Hindi/English labels and reduced-motion styling.
- The approved design baseline is Forest Green + Warm Ivory + Harvest Gold, with readable surfaces and restrained accents.
- PR #49 restores keyboard focus to the mobile menu trigger after Escape/backdrop dismissal and adds source-level regression assertions.
- Responsive source-level checks pass in CI.
- Real browser/device visual testing has not yet been demonstrated by the available CI suite. Do not claim physical-device validation from CSS/source checks alone.

## 5. Release gates still required

| Gate | Current state | Completion evidence |
|---|---|---|
| Main-branch CI | Passed | GitHub Actions run for commit `a50fac5` |
| Dependency audit | Passed at `--audit-level=high` | CI audit step; does not exclude low/moderate advisories |
| Production deployment | Pending latest main | Vercel production deployment READY with SHA `a50fac5...` |
| Production domain alias | Pending | `rate-gpt.vercel.app` resolves to that deployment |
| Production API smoke | Pending latest release | Production smoke suite passes against the custom domain |
| Live price verification | Pending latest release | Real API response, valid source metadata and timestamps; no fabricated rows |
| Browser visual QA | Not yet evidenced | Test key pages at mobile, tablet and desktop viewports in a real browser |
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

**Current verdict: engineering checks pass on main, but the latest main commit is not yet verified in production. Release completion remains pending deployment and production verification.**
