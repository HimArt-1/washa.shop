# Phase B0 — Board fallback infrastructure

## Status and approval gate

This document is the complete design checkpoint for Phase B0. No migration,
runtime module, route branch, provider call, quota mutation, UI, or deployment
is part of this checkpoint. Implementation starts only after explicit approval
of this document. Completed B0 implementation will stop for a second review;
it will not be merged, deployed, or activated without separate explicit
permission.

The phase branch is `washa/board-B0-infrastructure`, based directly on `main`.
Fallback remains inactive in every environment throughout B0.

## Scope

B0 introduces only the inert foundation required by later phases:

- an isolated `public.washa_board_requests` table and a safe teardown script;
- uncached, fail-safe reads for generation mode and quota charging policy;
- typed, normalized top-level `site_settings` keys for
  `generation_mode`, `board_prompt_template`, and `quota_charging`;
- database/type definitions and tests for those contracts.

B0 does **not** call or modify `DesignAssetService.generate`,
`persistMasterAsset`, `normalizeGeneratedArtworkForPrint`,
`verifyArtworkTextPolicy`, any Master/Derivative/Checksum table, or
`public.washa_design_requests`. It does not add the B1 provider service, the B2
route/UI branch, the B3 Telegram/admin surfaces, or a storage bucket.

Because no route imports the new decision module in B0, the production request
path remains byte-for-byte on its current primary behavior.

## Verified repository facts

- `site_settings.key` is unique and `value` is JSONB. The current aggregate
  settings reader is cached for 120 seconds, so it is unsuitable for an
  emergency switch.
- `src/lib/operational-rules.ts` establishes the local uncached-read pattern:
  a server-only service-role client reads one setting directly and returns a
  safe default when configuration or lookup fails.
- `src/app/actions/settings.ts` currently normalizes a closed set of top-level
  keys in `buildSiteSettings`; unknown rows are discarded from the returned
  object.
- The current schema uses `public.profiles.clerk_id`, not
  `profiles.clerk_user_id`. Owner RLS policies compare it with the JWT `sub`
  claim. The B0 policy must use the real column name and the same defensive JWT
  expression used by the WASHA asset tables.
- The repository has no down-migration convention. A `*.down.sql` file cannot
  live in `supabase/migrations`, because the Supabase migration runner would
  apply it as a forward migration and immediately remove the table.

## Migration design

### Files

- Up: `supabase/migrations/20260722000000_board_fallback_system.sql`
- Down: `supabase/rollbacks/20260722000000_board_fallback_system.down.sql`

`supabase/rollbacks` is intentionally outside the forward migration directory.
The down script is an explicit operator action, never an automatically applied
migration.

### Up migration

The forward migration creates this table in `public`:

```sql
CREATE TABLE public.washa_board_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID
        REFERENCES public.profiles(id) ON DELETE SET NULL,
    generation_request_id TEXT NOT NULL UNIQUE,
    prompt TEXT NOT NULL,
    generation_context JSONB NOT NULL
        CHECK (jsonb_typeof(generation_context) = 'object'),
    board_image_url TEXT,
    provider TEXT,
    generation_model TEXT,
    status TEXT NOT NULL DEFAULT 'processing'
        CHECK (status IN ('processing', 'ready', 'failed')),
    manual_print_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (manual_print_status IN ('pending', 'in_progress', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

The repository has four active profile-deletion paths: Clerk `user.deleted`,
single-user admin deletion, bulk admin deletion, and duplicate-profile merge.
The foreign key is therefore nullable with `ON DELETE SET NULL`; `RESTRICT`
would break those flows. The board request remains available to the service-
role staff queue for manual print work, while owner RLS naturally denies access
after `profile_id` becomes null. `CASCADE` is rejected because it could erase
unfinished staff work. This table has no foreign key to any primary-generation
asset or request.

The migration also creates:

- `idx_washa_board_requests_profile_created` on
  `(profile_id, created_at DESC)` for owner history;
- `idx_washa_board_requests_manual_status_created` on
  `(manual_print_status, created_at DESC)` for the B3 staff queue;
- a `BEFORE UPDATE` trigger using the existing
  `public.update_updated_at_column()` function;
- table/column comments documenting that the image is preview-only and the
  saved JSON context is the production source of truth for dimensions;
- a final `NOTIFY pgrst, 'reload schema'`.

The status columns use database `CHECK` constraints rather than relying only on
TypeScript unions. `generation_context` must be a JSON object so B1 cannot
persist a scalar or array accidentally.

### RLS and write boundary

RLS is enabled, then one `SELECT` policy is created:

```sql
CREATE POLICY "WASHA board requests owner read"
    ON public.washa_board_requests
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.profiles AS p
            WHERE p.id = washa_board_requests.profile_id
              AND p.clerk_id = (
                  COALESCE(
                      NULLIF(current_setting('request.jwt.claims', true), ''),
                      '{}'
                  )::JSONB ->> 'sub'
              )
        )
    );
```

There is no client `INSERT`, `UPDATE`, or `DELETE` policy. B1 and B3 writes use
server-side service-role code after their own application authorization. The
service role bypasses RLS; ordinary authenticated clients can only read rows
owned by their profile.

### No setting writes in B0

The forward migration does not insert, update, or delete `site_settings` rows.
Missing rows are valid and resolve through the application defaults described
below. This preserves any pre-existing operator values and lets B0 roll back
without leaving seeded configuration behind. Later admin saves persist the
three documented keys in `site_settings`; absence continues to mean the safe
default.

### Down migration

The operator must first disable the feature, even if a later phase is already
deployed:

```sql
UPDATE public.site_settings
SET value = to_jsonb('primary'::text), updated_at = now()
WHERE key = 'generation_mode';

DROP TABLE IF EXISTS public.washa_board_requests;

NOTIFY pgrst, 'reload schema';
```

`DROP TABLE` removes the table-owned policy, indexes, checks, and trigger. It
does not use `CASCADE`; unexpected external dependencies should stop teardown
instead of being deleted silently. It does not drop the shared
`update_updated_at_column()` function.

B0 itself creates no setting rows. The update is a no-op when
`generation_mode` is absent; if a later approved phase has persisted the key,
it is forced to `primary` before the table is dropped. Other pre-existing or
later operator-managed settings are not deleted by the B0 rollback.

## Runtime decision module

### Public contract

New file: `src/lib/washa-generation-mode.ts`.

```typescript
export type GenerationMode = "primary" | "fallback";
export type QuotaManualOverride = "enabled" | "disabled" | null;

export interface QuotaChargingConfig {
    /** true means quota charging follows GenerationMode. */
    auto: boolean;
    /** Explicit charging state used only when auto is false. */
    manual_override: QuotaManualOverride;
}

export async function getGenerationMode(): Promise<GenerationMode>;
export async function getQuotaChargingConfig(): Promise<QuotaChargingConfig>;
export async function shouldChargeQuota(mode: GenerationMode): Promise<boolean>;
```

The module is `server-only`. It owns immutable mode/quota defaults and their
pure normalizers so the operational reader and aggregate settings reader share
one interpretation:

```typescript
const DEFAULT_GENERATION_MODE: GenerationMode = "primary";
const DEFAULT_QUOTA_CHARGING_CONFIG: QuotaChargingConfig = {
    auto: true,
    manual_override: null,
};
```

### Uncached read

The implementation creates the same non-persistent, service-role Supabase
client shape used by `operational-rules.ts`. A private reader performs one
query against one exact key:

```text
site_settings
  -> select value
  -> eq key
  -> maybeSingle
```

It does not import or call `getSiteSettings`, `unstable_cache`, React cache, or
the 120-second aggregate settings cache. Every public invocation performs a
fresh database lookup. Missing Supabase environment variables, a returned
Supabase error, a missing row, an invalid value, and a thrown/timeout error all
resolve to the safe default; no internal error text is exposed.

`generation_mode` accepts only the exact strings `primary` and `fallback`.
Everything else becomes `primary`.

`quota_charging` is validated as one policy, not field by field. Automatic mode
is valid when `auto === true`; its manual value is normalized to `null` because
it is inactive. Manual mode is valid only when `auto === false` and
`manual_override` is exactly `enabled` or `disabled`. A missing field, invalid
manual value, returned database error, or thrown lookup invalidates the whole
policy and returns the automatic default. In particular,
`{ auto: false, manual_override: "invalid" }` cannot disable charging in
primary mode.

### Quota decision

`shouldChargeQuota` always receives the already-resolved mode. It does not read
the mode again, preventing a toggle between two database calls from producing
a mode/quota mismatch.

```typescript
const config = await getQuotaChargingConfig();
if (config.auto) return mode === "primary";
return config.manual_override === "enabled";
```

Because a quota lookup failure normalizes to the automatic default, the same
code is the required fail-safe: primary returns `true`; fallback returns
`false`. There is no catch branch that can accidentally charge fallback.

## Settings integration

`SiteSettingsType` and `DEFAULT_SITE_SETTINGS` gain required top-level fields:

```typescript
generation_mode: GenerationMode;
board_prompt_template: BoardPromptTemplate;
quota_charging: QuotaChargingConfig;
```

`buildSiteSettings` calls strict normalizers for these three keys. It imports
the mode/quota defaults and pure normalizers from
`washa-generation-mode.ts`, so their behavior is not duplicated. The keys are
not placed inside `washa_ai` and do not change
`normalizeWashaAiSettings`, because their persisted keys are top-level rows in
`site_settings`. The defaults are `primary`, the approved board template, and
automatic quota charging.

The approved template and a small `BoardPromptTemplate` branded type remain in
the settings domain for B0; the mode/quota decision module does not own prompt
content. The read normalizer accepts only a non-empty string containing all
seven required placeholders. Invalid persisted content returns the full
approved template. The update path rejects an invalid template without an
upsert and identifies the missing placeholders, so an operator cannot persist
a template that B1 would be unable to fill.

The two relevant loose declarations in `settings.ts` are tightened from
`Record<string, any>` to `Record<string, unknown>` while collecting/building
rows. `updateSiteSetting` accepts `unknown`, retains the existing admin/dev
authorization, and normalizes the three new keys before upsert. Existing key
behavior is unchanged. This is needed because `generation_mode` is a scalar
JSON string, while the current action signature incorrectly permits objects
only.

The `site_settings.value` database type is widened from object/array-only to a
recursive JSON value type so JSONB strings are represented honestly. The new
`washa_board_requests` Row/Insert/Update/relationship definitions are added to
`src/types/database.ts`, using closed status unions and no new `any` or
`@ts-ignore`.

The cached aggregate `getSiteSettings()` remains appropriate for displaying
admin drafts. Operational mode/quota decisions use only the new uncached
module.

## Test plan and agreed seams

The specification's acceptance criteria already identify the public seams, so
tests will target those seams rather than private query helpers.

### 1. Decision behavior — `tests/dtf/washa-generation-mode.test.ts`

Mock the Supabase client at its public query boundary and cover:

- absent environment, missing row, invalid mode, Supabase error, and thrown
  lookup all return `primary`;
- an exact persisted `fallback` returns `fallback`;
- missing/invalid quota data returns
  `{ auto: true, manual_override: null }`;
- the decision matrix includes both modes with automatic policy, both modes
  with manual `enabled`, and both modes with manual `disabled`;
- `{ auto: false, manual_override: "invalid" }`, a missing manual override,
  and a rejected lookup all prove the required mode-based fail-safe: primary
  charges and fallback does not;
- two getter invocations produce two Supabase reads, proving no module-level or
  Next cache is present.

Each red/green cycle will add one externally visible case and only the minimum
implementation needed for it.

### 2. Settings normalization — extend `tests/settings.visibility.test.ts`

Through the exported `getSiteSettings()` seam, verify:

- absent keys yield primary/automatic/template defaults;
- valid persisted keys survive normalization;
- invalid values are replaced with safe defaults;
- the approved default prompt matches the specification in full after
  normalizing line endings—not merely its placeholders—and an update missing
  any required placeholder is rejected without an upsert;
- the scalar generation mode can pass through the existing admin update action
  without weakening its admin/dev check.

### 3. Migration contract — `tests/dtf/board-fallback-migration.test.ts`

Read both SQL artifacts and assert the table shape, status checks, nullable
profile FK with `ON DELETE SET NULL`, indexes, updated-at trigger, RLS owner policy using
`profiles.clerk_id`, and lack of client write policies. Assert that the up
migration makes no `site_settings` write, while the down script only forces an
already-present mode to `primary` before dropping
`public.washa_board_requests`. Assert that neither SQL file alters
`washa_design_requests` or Master/Derivative/Checksum tables.

The SQL lifecycle is a mandatory acceptance check, not an optional supplement
to the text contract test. `npm run test:board-migration:lifecycle` creates a
uniquely named temporary database inside the local Supabase PostgreSQL instance
on `127.0.0.1:54322`, applies the real up file, verifies `to_regclass`,
constraints, indexes, nullability/delete action, RLS and `pg_policies`, and
executes owner/non-owner reads, a denied authenticated insert, and profile
deletion. It seeds `generation_mode=fallback`, applies the real down file, then
asserts that the mode is `primary` and
`to_regclass('public.washa_board_requests') IS NULL`. It drops only the database
created by that run in a `finally` block and refuses non-local hosts/ports. Its
catalog, behavior, rollback and final `to_regclass` results must be included in
the completion report. Reading SQL as text cannot satisfy this gate, and the
command is never run against staging or production.

### Verification order after approval

1. focused Vitest file after each red/green slice;
2. migration lifecycle check on disposable local Supabase;
3. `npm run test:unit`;
4. `npm run lint`;
5. `npm run build`.

No B0 implementation is accepted with a broken existing test, TypeScript
error, new `any`, or `@ts-ignore`.

## Failure behavior and observability

B0 deliberately fails closed without producing operational noise on every
request. Missing/invalid/error paths return the documented default and never
throw into the generation route. Tests observe behavior and call counts; they
do not assert private logging text.

Once B2 consumes the module, existing request tracing may record only the
resolved mode and `quotaCharged` boolean—never the prompt template, service-role
configuration, or raw database error. That tracing is outside B0.

## Risks and mitigations

- **Accidental activation:** the missing-row default, runtime default, and
  invalid-value fallback are all `primary`; B0 has no route consumer.
- **Stale emergency switch:** operational getters bypass the aggregate
  settings cache and read one row per invocation.
- **Wrong identity column:** the migration uses the verified `clerk_id` column
  and defensive `sub` extraction already used by WASHA tables.
- **Orphaned quota charge:** impossible in B0 because the module only returns a
  boolean and does not reserve, release, or decrement quota.
- **Primary-pipeline coupling:** the new table has no relation to primary
  request/assets, and no primary service or route is touched.
- **Destructive rollback:** teardown resets mode first, avoids `CASCADE`, and
  runs only on an explicitly selected database.
- **Prompt drift:** a full-content snapshot guards the approved default, and
  update validation rejects templates missing any required placeholder.

## Exit plan

To remove B0 before later phases:

1. set `generation_mode` to `primary`;
2. execute the reviewed down script against the explicit target database;
3. remove `src/lib/washa-generation-mode.ts`, its exported types/defaults/
   normalizers, and `tests/dtf/washa-generation-mode.test.ts`;
4. remove the three aggregate settings fields, the prompt default/branded
   type/validator, the B0 `updateSiteSetting` signature/normalization changes,
   and their additions to `tests/settings.visibility.test.ts`;
5. revert the B0-only `Record<string, unknown>` collection/build declarations
   and recursive JSON-value widening; remove `src/lib/json-value.ts` and
   `tests/dtf/json-value.test.ts`; and restore the three announcement writers
   that were adapted to the recursive JSON contract;
6. remove the board status/type/relationship definitions,
   `tests/dtf/board-fallback-migration.test.ts`,
   `scripts/verify-board-fallback-migration.mjs`, and its
   `test:board-migration:lifecycle` package script;
7. keep an already-applied forward migration in shared migration history, but
   remove unshipped SQL artifacts when abandoning the branch before merge;
8. leave any pre-existing operator-owned settings untouched; B0 created no
   setting rows of its own.

No primary table, generated asset, quota ledger, route, or provider code needs
restoration. After design approval, implementation remains limited to this B0
plan and will stop again before B1 and before merge.
