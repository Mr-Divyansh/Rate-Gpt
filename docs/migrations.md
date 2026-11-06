# Database Migrations — Rate-GPT

## Current state
- No formal migration system. Schema uses `CREATE TABLE IF NOT EXISTS` (local only, skipped on Vercel).
- Indexes created in same init block.

## Future: PostgreSQL (Neon) migration
### Plan
1. Provision managed Postgres (Neon) — requires owner approval + credentials.
2. Create PG schema mirroring SQLite columns with appropriate types (TEXT, DOUBLE PRECISION, DATE/TIMESTAMPTZ).
3. Preserve dedup_key UNIQUE constraint and all indexes.
4. Write idempotent migration script (SQLite → Postgres) with transaction + count verification.
5. Keep rategpt.db as immutable backup.
6. Switch via `DATABASE_URL` env var (feature flag).
7. Rollback: revert env var to SQLite (read-only mode).

### Safety rules
- Never overwrite original SQLite DB.
- Never run destructive migrations without approval.
- Never enable cron until durable storage verified.
- Test migration against staging/temp DB first.

### Blockers
- Neon CLI authentication incomplete.
- No durable storage configured in production.
- Owner approval required for provisioning.