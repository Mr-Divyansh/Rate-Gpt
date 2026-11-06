# Rate-GPT — Post-Cleanup Final Engineering Audit

Audit date: 2026-11-04

## Summary

This audit modified the cleaned ZIP based on the actual source files. It did not treat the previous cleanup report as authoritative. A new project ZIP was generated after the changes below.

**Important verification boundary:** the source edits and static checks are complete, but a clean dependency installation did not finish in this environment. Therefore the full TypeScript semantic check, automated test suite, production build, browser interaction tests, live OGD sync, and real PostgreSQL connectivity remain unverified. This report does not claim those checks passed.

## Material bugs found and fixed

1. **PostgreSQL adapter was bypassed.** API routes and the OGD service imported `database.ts` directly. Added `database-factory.ts` as the shared asynchronous adapter boundary. When `DATABASE_URL` is configured, it initializes and selects PostgreSQL; otherwise it selects SQLite for local development. Routes now await database reads, and sync service awaits upsert/log writes.
2. **PostgreSQL sync-log INSERT was broken.** `insertSyncLog()` had ten placeholders but supplied no parameter array. It now supplies all ten values.
3. **PostgreSQL upsert transaction used pool-level queries.** Converted the upsert transaction to a checked-out client, added rollback/release handling, and used `ON CONFLICT (dedup_key) DO UPDATE` to make duplicate handling safe under concurrent sync attempts.
4. **Cascading filter parity.** PostgreSQL filter metadata now applies the district selection when listing markets and applies the commodity search filter, matching the expected UI behavior more closely.
5. **Synthetic market prices were bundled.** The archive contained `src/server/db/rategpt.db` with 1,208 generated records and a `SUCCESS` sync log despite no verified live upstream sync. Removed that database from the deliverable and removed automatic synthetic seeding. Local SQLite schema is created empty; only source-fetched records should populate it.
6. **Date normalization accepted invalid dates.** Date normalization now rejects impossible calendar dates and no longer returns arbitrary unparseable date strings.
7. **Price parsing accepted partial numeric strings.** Parsing now validates the entire normalized number and preserves missing/non-numeric values as `null`.
8. **Admin secret placeholder could be accepted.** Admin sync now rejects the documented placeholder and keys shorter than 32 characters.
9. **Vercel without persistent storage could fall through to SQLite.** The factory now requires `DATABASE_URL` on Vercel rather than attempting ephemeral/read-only SQLite storage.
10. **Misleading test setup.** Removed the unrelated test-database initializer that opened a separate DB file. Replaced the verification script with deterministic tests that insert a uniquely named test record and test normalization, mapping, upsert deduplication, filters, and stats without making external API calls.

## Other files changed / removed

- Modified: `src/server/db/database-factory.ts`, `src/server/db/pg-database.ts`, `src/server/db/database.ts`, `src/server/routes/api.ts`, `src/server/services/mandiDataService.ts`, `src/server/tests/verify.ts`, and `README.md`.
- Removed the bundled synthetic `src/server/db/rategpt.db`.
- Removed unused recovery/repair artifacts `src/App.recovery.tsx`, `fix_pg_db.py`, and `fix_ts.cjs` after confirming they were not referenced by source code or configuration.
- Preserved `package-lock.json`, `.env.example`, deployment config, current API routes, the React dashboard, and the three root HTML entry points.
- The project contains exactly `index.html`, `mandiPrice.html`, and `app.html` at the root.

## Government OGD / AGMARKNET integration

- Resource ID remains `9ef84268-d588-465a-a308-a864a43d0070`.
- The API key remains server-side in `DATA_GOV_API_KEY`; it is not put in frontend JavaScript.
- Pagination uses `limit`/`offset`, with a 200-page safety cap and per-request timeout.
- Mapping rejects missing location/commodity/date fields, validates dates, and preserves unavailable prices as `null`.
- Upsert deduplication uses normalized state/district/market/commodity/variety/date identity.
- Sync attempts are written to the selected database adapter.
- **Live verification not performed:** no valid API key or successful live OGD response was available in this audit. API response field names and provider-side rate-limit behavior still need a real credentialed sync to confirm. No prices have been fabricated as a fallback.

## PostgreSQL status

The source path is now consistently wired through the async database factory, and the missing SQL parameters and transaction handling defects were fixed. However, **PostgreSQL is not certified end-to-end** because no `DATABASE_URL`/database instance was available to execute migrations and API read/write/sync flows. Configure a real PostgreSQL URL, then verify `/api/v1/health`, `/api/v1/prices`, and a protected sync plus audit-log retrieval before relying on it in production.

## Security audit

- No real `.env` file is included; `.env.example` contains placeholders only.
- No database dump, SQLite file, backup file, or private key was found in the final source tree.
- `.gitignore` excludes `.env*` except `.env.example`, database files, build output, logs, and scratch files.
- The only credential-shaped string found by the scan is the example PostgreSQL URL with literal `USER:PASSWORD` placeholders.
- Admin sync requires a non-placeholder key of at least 32 characters.
- The OGD key is still sent to the government service as its required query parameter, but only by server-side code. It is not intentionally logged or exposed to the browser.

## Test results

| Check | Result | Details |
|---|---|---|
| `npm ci` | **BLOCKED — timed out** | Installation attempt exceeded the 300-second tool timeout; dependencies were not installed. |
| `npm run lint` | **BLOCKED** | TypeScript reports missing `node` and `vite/client` type definitions because dependencies are absent. This is not a successful type check. |
| `npm test` | **BLOCKED** | `tsx: not found` because dependency installation did not complete. The revised tests were not executed. |
| `npx tsc --noEmit` | **BLOCKED** | Same missing type-definition issue as lint. |
| `npm run build` | **BLOCKED** | `vite: not found` because dependencies were not installed. |
| `node --check script/landing.js` | **PASS** | JavaScript syntax check. |
| `node --check script/mandiPrice.js` | **PASS** | JavaScript syntax check. |
| TypeScript syntax transpilation | **PASS** | 31 TypeScript/TSX files parsed via the globally available TypeScript transpiler; zero syntax diagnostics. This is syntax-only, not semantic type checking. |
| Root HTML / local asset scan | **PASS** | Exactly three root HTML pages; no missing relative `href`/`src` assets found. |
| Secret/database artifact scan | **PASS with noted placeholder** | No real env file, DB dump, private key, or repair scratch files found; only placeholder DB URL in `.env.example`. |
| Browser viewport/interactions | **NOT RUN** | No browser automation was available. |
| Live OGD API | **NOT RUN** | No successful credentialed upstream call. |
| PostgreSQL integration | **NOT RUN** | No PostgreSQL service/`DATABASE_URL` supplied. |

## Final folder structure (high-level)

```text
Rate-GPT-Clean-Project/
├── .env.example
├── .gitignore
├── README.md
├── package.json
├── package-lock.json
├── vite.config.ts
├── tsconfig.json
├── server.ts
├── server.dev.ts
├── vercel.json
├── index.html
├── mandiPrice.html
├── app.html
├── api/index.ts
├── script/
│   ├── landing.js
│   └── mandiPrice.js
├── style/
│   ├── landing.css
│   └── mandi-price-page.css
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/
│   ├── context/
│   ├── hooks/
│   ├── i18n/
│   ├── services/
│   ├── types/
│   ├── utils/
│   └── server/
│       ├── db/
│       │   ├── database.ts
│       │   ├── database-factory.ts
│       │   └── pg-database.ts
│       ├── routes/api.ts
│       ├── services/mandiDataService.ts
│       ├── tests/verify.ts
│       └── openapi.ts
├── public/
├── Images/
├── docs/
└── project documentation (*.md)
```

## Local setup (Windows PowerShell)

1. Extract the ZIP and open the `Rate-GPT-Clean-Project` directory in VS Code.
2. Use Node.js 20+ (the current project specifies Node `>=20`).
3. In the terminal:

   ```powershell
   Copy-Item .env.example .env
   npm ci
   npm run dev
   ```

4. Edit `.env` before using sync: set `DATA_GOV_API_KEY` to your own valid OGD key. Set `ADMIN_SYNC_KEY` to a cryptographically random secret of at least 32 characters. Do not commit `.env`.
5. Open:
   - `http://localhost:3000/`
   - `http://localhost:3000/mandiPrice.html`
   - `http://localhost:3000/app.html`
   - `http://localhost:3000/api/v1/health`
6. For a persistent PostgreSQL deployment, set `DATABASE_URL` to a valid PostgreSQL connection string. Vercel explicitly requires `DATABASE_URL`; SQLite is intended for local development only.
7. After `npm ci` succeeds, run all verification commands again:

   ```bash
   npm run lint
   npm test
   npx tsc --noEmit
   npm run build
   ```

The dev server can choose a subsequent port if 3000 is occupied; use the URL printed in the terminal.

## Remaining limitations / next steps

1. Complete dependency installation in a network-enabled environment and run the blocked commands.
2. Run the new test suite; if it reveals defects, fix and rerun.
3. Test the actual browser pages at 360, 390, 430, 768, 1024, 1366, and 1920 px and inspect console/network errors.
4. With a valid OGD key, run a small sync first, inspect audit logs, and confirm returned field names/date format/record counts against the real resource.
5. With a real PostgreSQL instance, verify schema creation and end-to-end reads, writes, duplicate upserts, transaction rollback, sync logs, and connection behavior.

No Git push, hard reset, or destructive Git command was performed.
