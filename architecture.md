# Rate GPT — System Architecture

## 1. Data flow
```text
Government OGD / AGMARKNET API
          ↓
Node.js data-fetch / sync service
          ↓
Validation and normalization
          ↓
PostgreSQL
          ↓
Express REST API
          ↓
Next.js frontend
```
The browser must never call the Government API with the private API key.

## 2. Planned stack
- Frontend: React, TypeScript, Vite, Tailwind CSS.
- Backend: Node.js, Express.js, TypeScript, Zod.
- Database: SQLite (better-sqlite3). Prisma/PostgreSQL is not used in the current implementation.
- Security: Helmet, express-rate-limit.
- Charts: Recharts.

## 3. Backend responsibilities
Keep API key server-side, fetch source pages, validate and normalize records, handle upstream errors, upsert without duplicates, log sync attempts and serve paginated endpoints.

## 4. Frontend responsibilities
Render filters and prices, call only Rate GPT endpoints, handle loading/empty/error states and provide the two approved themes.

## 5. Database outline
### MandiPrice
id, sourceRecordId (nullable), state, district, market, commodity, variety, grade, arrivalDate, minPrice, maxPrice, modalPrice, sourceUnit, createdAt, updatedAt.

### SyncLog
id, status, requestedDate, stateFilter, recordsFetched, recordsInserted, recordsUpdated, errorMessage, startedAt, completedAt.

Confirm exact source schema and stable identity before defining unique constraints.

## 6. Candidate indexes
- `(state, district, market)`
- `(commodity)`
- `(arrivalDate)`
- `(state, commodity, arrivalDate)`
- `(market, commodity, arrivalDate)`

Review indexes against actual query patterns.

## 7. Sync strategy
Use bounded retries and timeouts. Fetch all required pages, validate records, upsert idempotently and record completion. Keep source arrival date separate from sync time. Do not assume a scheduled run means new source data exists.

## 8. Historical trends
Trend endpoint reads stored records over a date range. History accumulates through successful syncs. Never invent or interpolate missing prices.

## 9. Security and deployment
Use environment variables, exclude `.env` from Git, validate inputs, rate-limit public endpoints, protect admin sync, avoid logging secrets, use HTTPS and configure backups and monitoring.
