# Existing mandi-data cleanup plan (not executed)

The live API migration intentionally does not delete database tables or rows.
No cleanup or production database operation is performed by this plan.

Before any cleanup:

1. Obtain written approval identifying the exact database, environment, scope,
   and retention date. Do not copy production data into a local test fixture.
2. Confirm table sizes, date range, provenance, references, retention duties,
   and whether any consumers still need the legacy trend/comparison endpoints.
   Record counts and a schema-only report first.
3. Take a verified, access-controlled backup and test restoration in an
   isolated environment. Keep the backup under the same retention/access rules
   as the source.
4. Produce a dry-run list/count of only the approved records. Review it with
   the data owner; do not use a broad `TRUNCATE`, automatic migration, or
   deployment hook.
5. After a second explicit approval, remove only the identified rows in a
   transaction or through a reviewed, reversible migration. Verify row counts,
   application behavior, and backup recoverability before considering the
   cleanup complete.

The code change disables the ingest path and removes the recurring cron; it
does not attempt to infer whether legacy rows are safe to delete. Production
storage contents have not been inspected from this workspace.
