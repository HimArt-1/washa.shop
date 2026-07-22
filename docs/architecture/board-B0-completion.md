# Phase B0 — Completion report

## Outcome

Phase B0 is implemented on `washa/board-B0-infrastructure`. It adds only the
isolated board-request persistence and rollback artifacts, uncached generation
mode/quota decisions, normalized settings contracts, database types, and their
tests. No fallback route, provider generation, Telegram/admin queue, primary
asset-pipeline change, merge, deployment, or fallback activation occurred.

## Profile deletion decision

The repository has active profile deletion in four paths:

- Clerk `user.deleted` webhook in `src/app/api/webhooks/clerk/route.ts`;
- single-user admin deletion in `src/app/actions/admin.ts`;
- bulk admin deletion in `src/app/actions/admin.ts`;
- duplicate-profile merge cleanup in `src/app/actions/clerk-users.ts`.

`ON DELETE RESTRICT` would block those paths. The board foreign key is therefore
nullable with `ON DELETE SET NULL`, matching the retention approach already
used by primary WASHA request/master records. A deleted account loses owner-RLS
access because `profile_id` becomes null, while the service-role staff queue can
retain unfinished manual print work. `CASCADE` was rejected because it could
erase that work.

## Mandatory local migration lifecycle

Command:

```text
npm run test:board-migration:lifecycle
```

The verifier is restricted to `127.0.0.1:54322`. It created a disposable
database inside the local Supabase PostgreSQL container, prepared only the
pre-B0 dependencies, executed the checked-in up and down SQL files, and removed
the disposable database afterward.

Result:

```text
> wusha@1.0.0 test:board-migration:lifecycle
> node scripts/verify-board-fallback-migration.mjs

[board-migration] preflight to_regclass: null (temporary database board_fallback_lifecycle_44436_mrvhifrf)
[board-migration] apply up: /Users/him.art/Desktop/WUSHA7.07-codex-20260316/supabase/migrations/20260722000000_board_fallback_system.sql
psql:/Users/him.art/Desktop/WUSHA7.07-codex-20260316/supabase/migrations/20260722000000_board_fallback_system.sql:48: NOTICE:  policy "WASHA board requests owner read" for relation "public.washa_board_requests" does not exist, skipping
[board-migration] catalog verification: {"table_exists":true,"primary_key":true,"generation_request_unique":true,"rls_enabled":true,"profile_nullable":true,"profile_fk":true,"profile_delete_action":"SET NULL","status_check":true,"manual_status_check":true,"context_object_check":true,"required_not_null_columns":8,"updated_at_trigger":true,"owner_select_policies":1,"write_policies":0,"required_indexes":2}
[board-migration] RLS/FK behavior: {"owner_visible_rows":1,"non_owner_visible_rows":0,"authenticated_insert_denied":true,"profile_set_null_rows":1}
[board-migration] apply down: /Users/him.art/Desktop/WUSHA7.07-codex-20260316/supabase/rollbacks/20260722000000_board_fallback_system.down.sql
[board-migration] rollback verification: {"rollback_generation_mode":"primary","final_to_regclass":"null"}
[board-migration] final to_regclass: null
[board-migration] PASS
[board-migration] cleanup: dropped temporary database board_fallback_lifecycle_44436_mrvhifrf
```

The project-wide `supabase db reset --local --no-seed` was also attempted. It
stops in the pre-existing `001_site_settings.sql` before reaching B0 because
that migration creates a trigger using `update_updated_at_column()` before the
function exists. The dedicated lifecycle test avoids treating that historical
ordering defect as proof for or against B0; the actual B0 files were still
executed and catalog-verified on local Supabase PostgreSQL.

## Verification

```text
npx tsc --noEmit
  PASS

npm run test:unit
  Test Files  91 passed (91)
  Tests       493 passed (493)

npm run lint
  PASS

npm run build
  PASS — Next.js production build completed; WASHA AI build verified (3 assets)
```

Focused verification ran 34 tests across the decision matrix,
fail-safe read failures, fresh uncached reads, settings normalization and
prompt completeness, SQL contract, RLS/write denial, and rollback targeting.

The recursive `JsonValue` correction also exposed the existing announcement
array writer. Its values now pass through a shared JSON serializer that retains
normal JSON behavior (including omission of undefined optional fields) before
the typed upsert; this is a compatibility adaptation only.

The ignored local `review-bundle` artifact is outside B0 and no project
compiler exception was committed for it. It is temporarily isolated only while
running the local production build, then restored without modification.

## Safety state

- Missing or invalid mode resolves to `primary`.
- Missing, invalid, or failed quota lookup resolves by mode: primary charges;
  fallback does not.
- B0 writes no default rows to `site_settings` and has no route consumer.
- The primary generation path and its Master/Derivative/Checksum services are
  untouched.
- Work stops here before B1, merge, deployment, or activation.
