# Database Architecture — Rate-GPT

## Database selection
- **Local fallback:** SQLite via `better-sqlite3` (synchronous, single-process) when no PostgreSQL URL is configured.
- **Production:** PostgreSQL via `DATABASE_URL` or `POSTGRES_URL`. Vercel refuses to start database operations without PostgreSQL because its filesystem is ephemeral/read-only.
- PostgreSQL initialization and health checks connect to the configured database. A configured URL alone does not prove connectivity.
- **Legacy tables:** `mandi_prices`, `sync_logs`. Live price requests do not read or write these tables.
- **SQLite journal mode:** DELETE (default).

## Schema

### mandi_prices
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| source_record_id | TEXT | |
| state, district, market, commodity | TEXT NOT NULL | |
| variety, grade | TEXT | defaults |
| arrival_date | TEXT NOT NULL | ISO YYYY-MM-DD |
| min_price, max_price, modal_price | REAL | nullable (never 0 for missing) |
| source_unit | TEXT | default Rs/Quintal |
| dedup_key | TEXT UNIQUE NOT NULL | state\|district\|market\|commodity\|variety\|date |
| first_fetched_at, last_fetched_at | TEXT | ISO timestamps |

### sync_logs (legacy)
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| status | TEXT NOT NULL | SUCCESS, PARTIAL, FAILED, IN_PROGRESS, NOT_CONFIGURED |
| requested_date, state_filter | TEXT | |
| records_fetched, records_inserted, records_updated | INTEGER | |
| error_message | TEXT | |
| started_at, completed_at | TEXT | |

## Indexes
- idx_mandi_location (state, district, market)
- idx_mandi_commodity (commodity)
- idx_mandi_arrival_date (arrival_date)
- idx_mandi_state_commodity_date (state, commodity, arrival_date)
- idx_mandi_market_commodity_date (market, commodity, arrival_date)
- idx_sync_started_at (started_at)

## Live API storage policy

The on-demand OGD/AGMARKNET proxy does not store fetched pages or use a
database for live prices and filters. The old sync endpoints and scheduled
job have been removed. Existing rows and schema remain untouched; see
`live-mandi-migration.md` for an approval-gated cleanup plan.

## Production limitation
Vercel's bundled filesystem is read-only; `/tmp` is ephemeral. SQLite writes
cannot persist there. Use PostgreSQL for legacy trend/comparison reads that
depend on stored observations. Live prices, filters, health, commodity search,
and sync status do not require a database connection.

## Environment variables (names only)
- RATEGPT_DB_PATH / DB_PATH (optional override)
- DATA_GOV_API_KEY
- DATABASE_URL / POSTGRES_URL (PostgreSQL connection)