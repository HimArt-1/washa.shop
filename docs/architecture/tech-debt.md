# Architecture technical debt

## TD-001 — Clean database rebuild is blocked by `001_site_settings.sql`

**Status:** Open

**Priority:** Must be resolved before creating any independent staging database

**Discovered:** 2026-07-22 during the mandatory B0 local migration lifecycle check

### Problem

`supabase/migrations/001_site_settings.sql` creates the
`set_site_settings_updated_at` trigger before the migration history has defined
`public.update_updated_at_column()`:

```sql
CREATE TRIGGER set_site_settings_updated_at
BEFORE UPDATE ON site_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

Consequently, `supabase db reset --local --no-seed` fails while applying
`001_site_settings.sql` and never reaches later migrations. Reading or applying
an individual recent migration can succeed, but the repository cannot currently
reconstruct a clean database from the complete checked-in migration history.

### Current production state

Production is healthy because its schema was built incrementally and the
function exists in the accumulated database state. This does **not** prove that
the migration chain is reproducible from zero.

### Impact

- A clean local or CI database cannot be rebuilt solely from migrations.
- A new standalone staging environment cannot be provisioned safely from this
  migration history.
- Migration validation can miss ordering defects when it runs only against an
  already-evolved database.

### Required future remediation

Before provisioning any independent staging database, repair the historical
ordering so `public.update_updated_at_column()` exists before the trigger is
created, then prove the complete chain with a clean `supabase db reset` and a
fresh-environment migration test. The remediation must account for already-
applied production migration history rather than rewriting it casually.

### Scope guard

This debt is deliberately **not fixed in B0 or B1**. Those phases only document
the defect and use isolated lifecycle verification for their own migrations.
