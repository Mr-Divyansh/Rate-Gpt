# Rate GPT — Development Phases

## Phase 0 — Confirm requirements
Review docs, verify Government API key privately, make a successful sample request and inspect real JSON fields, units and pagination.
**Exit:** verified sample response.

## Phase 1 — Project foundation
Create repository structure, initialize frontend/backend, configure TypeScript and add `.env.example` and `.gitignore`.
**Exit:** both apps run locally.

## Phase 2 — Government API integration
Build server-side API client, timeouts, bounded retries, pagination, validation and normalization.
**Exit:** sample records fetched without exposing key.

## Phase 3 — Database
Configure PostgreSQL and Prisma, create MandiPrice and SyncLog, verify uniqueness and indexes, test idempotent upsert.
**Exit:** records store and update safely.

## Phase 4 — Backend API
Implement health, filters, prices, trend, commodity search and protected admin sync.
**Exit:** endpoints validated and tested.

## Phase 5 — Frontend
Build header/theme toggle, filters, search, responsive price results, pagination and UI states. Add chart only when history exists.
**Exit:** main user journey works on mobile and desktop.

## Phase 6 — Release readiness
Test upstream failures, validation, rate limits, secret handling, accessibility, responsive layout, deployment, HTTPS, logs and backups.
**Exit:** stable demo with source attribution and data freshness.

## Priority
Fetch → validate → store → query → display. Do not polish secondary features before this flow works.
