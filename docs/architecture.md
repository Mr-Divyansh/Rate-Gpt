# Rate GPT — System Architecture

## 1. High-Level Data Flow

```text
Government of India OGD / AGMARKNET API
  (Resource: 9ef84268-d588-465a-a308-a864a43d0070)
               │
               ▼
  [Server-Side Data Sync Service]
  (src/server/services/mandiDataService.ts)
  - Timeouts & Bounded Retries
  - Date normalization (YYYY-MM-DD)
  - Numeric sanitization (Missing preserved as null)
               │
               ▼
     [Relational Database]
     - Prisma Schema (prisma/schema.prisma)
     - SQLite engine via better-sqlite3 (rategpt.db) / PostgreSQL
     - Idempotent upsert via dedup_key
               │
               ▼
    [Express REST API (/api/v1/*)]
    - Zod query & payload validation
    - Standard JSON envelope
    - Centralized error handler
               │
               ▼
     [React 19 SPA Frontend]
     - Tailwind CSS dual theme tokens
     - Cascading filters & Autocomplete
     - Mandi Price Board, Comparison, Trend views
```

## 2. Security Boundaries
1. **Private API Keys**: `DATA_GOV_API_KEY` is strictly confined to the backend server environment. No client code, JavaScript bundle, or browser request ever receives or uses the secret key.
2. **Upstream Request Isolation**: The frontend exclusively communicates with `/api/v1/*`.
3. **Auditability**: Every sync request is recorded in `sync_logs` with record counts and error messages.

## 3. Deduplication & Idempotency Strategy
A stable composite key is generated for every mandi observation:
`dedup_key = ${state}|${district}|${market}|${commodity}|${variety}|${arrival_date}` (all normalized to lower-case).
When a record already exists with the same `dedup_key`:
- Modal, min, max prices and grade are updated.
- `last_fetched_at` timestamp is updated.
- Duplicate rows are prevented.
