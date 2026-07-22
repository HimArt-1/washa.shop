import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const adminDatabaseUrl = process.env.BOARD_FALLBACK_DATABASE_URL
    ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const parsedDatabaseUrl = new URL(adminDatabaseUrl);
const localHosts = new Set(["127.0.0.1", "localhost", "::1"]);
const lifecycleDatabaseName = `board_fallback_lifecycle_${process.pid}_${Date.now().toString(36)}`;

if (!localHosts.has(parsedDatabaseUrl.hostname)) {
    throw new Error("Board migration lifecycle verification is restricted to a local database host.");
}
if (parsedDatabaseUrl.port !== "54322") {
    throw new Error("Board migration lifecycle verification must use the Supabase local database port 54322.");
}

const lifecycleDatabaseUrl = new URL(adminDatabaseUrl);
lifecycleDatabaseUrl.pathname = `/${lifecycleDatabaseName}`;

const upMigrationPath = resolve(
    "supabase/migrations/20260722000000_board_fallback_system.sql"
);
const downMigrationPath = resolve(
    "supabase/rollbacks/20260722000000_board_fallback_system.down.sql"
);

function runPsql(
    args,
    databaseUrl = lifecycleDatabaseUrl.toString(),
    { suppressStderr = false } = {}
) {
    return execFileSync(
        "psql",
        ["-X", databaseUrl, "-v", "ON_ERROR_STOP=1", ...args],
        {
            encoding: "utf8",
            stdio: suppressStderr ? ["ignore", "pipe", "pipe"] : undefined,
        }
    ).trim();
}

function queryScalar(sql) {
    return runPsql(["-A", "-t", "-c", sql]);
}

function queryLastScalar(sql) {
    const lines = runPsql(["-q", "-A", "-t", "-c", sql])
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    return lines.at(-1) ?? "";
}

function applySqlFile(path) {
    runPsql(["-f", path]);
}

function tableExists() {
    return queryScalar(
        "SELECT to_regclass('public.washa_board_requests') IS NOT NULL;"
    ) === "t";
}

function runAdminSql(sql) {
    return runPsql(["-c", sql], adminDatabaseUrl);
}

function quoteIdentifier(identifier) {
    return `"${identifier.replaceAll('"', '""')}"`;
}

function commandFails(sql) {
    try {
        runPsql(
            ["-q", "-c", sql],
            lifecycleDatabaseUrl.toString(),
            { suppressStderr: true }
        );
        return false;
    } catch {
        return true;
    }
}

function queryAsAuthenticated(clerkId, sql) {
    const claims = JSON.stringify({ sub: clerkId }).replaceAll("'", "''");
    return queryLastScalar(`
        SET ROLE authenticated;
        SELECT set_config('request.jwt.claims', '${claims}', false);
        ${sql}
        RESET ROLE;
    `);
}

function assertJsonState(actual, expected, label) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Unexpected ${label}: ${JSON.stringify(actual)}`);
    }
}

function dropLifecycleDatabase() {
    runAdminSql(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = '${lifecycleDatabaseName}'
          AND pid <> pg_backend_pid();
    `);
    runAdminSql(`DROP DATABASE ${quoteIdentifier(lifecycleDatabaseName)};`);
}

let databaseCreated = false;
let upApplied = false;
let lifecyclePassed = false;

try {
    runAdminSql(`CREATE DATABASE ${quoteIdentifier(lifecycleDatabaseName)};`);
    databaseCreated = true;

    runPsql(["-c", `
        CREATE EXTENSION IF NOT EXISTS pgcrypto;

        CREATE TABLE public.profiles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            clerk_id TEXT NOT NULL UNIQUE
        );

        CREATE TABLE public.site_settings (
            key TEXT PRIMARY KEY,
            value JSONB NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE FUNCTION public.update_updated_at_column()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        BEGIN
            NEW.updated_at := now();
            RETURN NEW;
        END;
        $$;
    `]);

    if (tableExists()) {
        throw new Error("Board table unexpectedly exists before applying the up migration.");
    }
    console.log(`[board-migration] preflight to_regclass: null (temporary database ${lifecycleDatabaseName})`);

    console.log(`[board-migration] apply up: ${upMigrationPath}`);
    applySqlFile(upMigrationPath);
    upApplied = true;

    const catalogState = JSON.parse(queryScalar(`
        SELECT json_build_object(
            'table_exists', to_regclass('public.washa_board_requests') IS NOT NULL,
            'primary_key', EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conrelid = 'public.washa_board_requests'::regclass
                  AND contype = 'p'
                  AND conname = 'washa_board_requests_pkey'
            ),
            'generation_request_unique', EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conrelid = 'public.washa_board_requests'::regclass
                  AND contype = 'u'
                  AND conname = 'washa_board_requests_generation_request_id_key'
            ),
            'rls_enabled', COALESCE((
                SELECT relrowsecurity
                FROM pg_class
                WHERE oid = 'public.washa_board_requests'::regclass
            ), false),
            'profile_nullable', COALESCE((
                SELECT NOT attnotnull
                FROM pg_attribute
                WHERE attrelid = 'public.washa_board_requests'::regclass
                  AND attname = 'profile_id'
                  AND NOT attisdropped
            ), false),
            'profile_fk', EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conrelid = 'public.washa_board_requests'::regclass
                  AND contype = 'f'
                  AND conname = 'washa_board_requests_profile_id_fkey'
            ),
            'profile_delete_action', COALESCE((
                SELECT CASE confdeltype
                    WHEN 'n' THEN 'SET NULL'
                    ELSE confdeltype::text
                END
                FROM pg_constraint
                WHERE conrelid = 'public.washa_board_requests'::regclass
                  AND contype = 'f'
                  AND conname = 'washa_board_requests_profile_id_fkey'
            ), 'missing'),
            'status_check', EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conrelid = 'public.washa_board_requests'::regclass
                  AND conname = 'washa_board_requests_status_check'
            ),
            'manual_status_check', EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conrelid = 'public.washa_board_requests'::regclass
                  AND conname = 'washa_board_requests_manual_print_status_check'
            ),
            'context_object_check', EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conrelid = 'public.washa_board_requests'::regclass
                  AND conname = 'washa_board_requests_generation_context_object'
            ),
            'required_not_null_columns', (
                SELECT count(*)
                FROM pg_attribute
                WHERE attrelid = 'public.washa_board_requests'::regclass
                  AND attname IN (
                      'id',
                      'generation_request_id',
                      'prompt',
                      'generation_context',
                      'status',
                      'manual_print_status',
                      'created_at',
                      'updated_at'
                  )
                  AND attnotnull
                  AND NOT attisdropped
            ),
            'updated_at_trigger', EXISTS (
                SELECT 1
                FROM pg_trigger
                WHERE tgrelid = 'public.washa_board_requests'::regclass
                  AND tgname = 'set_washa_board_requests_updated_at'
                  AND tgenabled <> 'D'
                  AND NOT tgisinternal
            ),
            'owner_select_policies', (
                SELECT count(*)
                FROM pg_policies
                WHERE schemaname = 'public'
                  AND tablename = 'washa_board_requests'
                  AND cmd = 'SELECT'
                  AND qual LIKE '%clerk_id%'
            ),
            'write_policies', (
                SELECT count(*)
                FROM pg_policies
                WHERE schemaname = 'public'
                  AND tablename = 'washa_board_requests'
                  AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
            ),
            'required_indexes', (
                SELECT count(*)
                FROM pg_indexes
                WHERE schemaname = 'public'
                  AND tablename = 'washa_board_requests'
                  AND indexname IN (
                      'idx_washa_board_requests_profile_created',
                      'idx_washa_board_requests_manual_status_created'
                  )
            )
        );
    `));

    const expectedCatalogState = {
        table_exists: true,
        primary_key: true,
        generation_request_unique: true,
        rls_enabled: true,
        profile_nullable: true,
        profile_fk: true,
        profile_delete_action: "SET NULL",
        status_check: true,
        manual_status_check: true,
        context_object_check: true,
        required_not_null_columns: 8,
        updated_at_trigger: true,
        owner_select_policies: 1,
        write_policies: 0,
        required_indexes: 2,
    };

    assertJsonState(catalogState, expectedCatalogState, "board migration catalog state");

    console.log(`[board-migration] catalog verification: ${JSON.stringify(catalogState)}`);

    runPsql(["-c", `
        GRANT USAGE ON SCHEMA public TO authenticated;
        GRANT SELECT ON TABLE public.profiles TO authenticated;
        GRANT SELECT, INSERT, UPDATE, DELETE
            ON TABLE public.washa_board_requests
            TO authenticated;

        INSERT INTO public.profiles (id, clerk_id) VALUES
            ('00000000-0000-0000-0000-000000000001', 'owner-clerk'),
            ('00000000-0000-0000-0000-000000000002', 'other-clerk'),
            ('00000000-0000-0000-0000-000000000003', 'deleted-clerk');

        INSERT INTO public.washa_board_requests (
            profile_id,
            generation_request_id,
            prompt,
            generation_context
        ) VALUES
            (
                '00000000-0000-0000-0000-000000000001',
                'owner-request',
                'owner prompt',
                '{"source":"lifecycle"}'::jsonb
            ),
            (
                '00000000-0000-0000-0000-000000000002',
                'other-request',
                'other prompt',
                '{"source":"lifecycle"}'::jsonb
            ),
            (
                '00000000-0000-0000-0000-000000000003',
                'retained-after-profile-delete',
                'retained prompt',
                '{"source":"lifecycle"}'::jsonb
            );
    `]);

    const ownerVisibleRows = Number(queryAsAuthenticated(
        "owner-clerk",
        "SELECT count(*) FROM public.washa_board_requests WHERE generation_request_id = 'owner-request';"
    ));
    const nonOwnerVisibleRows = Number(queryAsAuthenticated(
        "other-clerk",
        "SELECT count(*) FROM public.washa_board_requests WHERE generation_request_id = 'owner-request';"
    ));
    const authenticatedInsertDenied = commandFails(`
        SET ROLE authenticated;
        SELECT set_config('request.jwt.claims', '{"sub":"owner-clerk"}', false);
        INSERT INTO public.washa_board_requests (
            profile_id,
            generation_request_id,
            prompt,
            generation_context
        ) VALUES (
            '00000000-0000-0000-0000-000000000001',
            'authenticated-write-must-fail',
            'denied prompt',
            '{"source":"authenticated"}'::jsonb
        );
    `);

    runPsql(["-c", `
        DELETE FROM public.profiles
        WHERE id = '00000000-0000-0000-0000-000000000003';
    `]);
    const profileSetNullRows = Number(queryScalar(`
        SELECT count(*)
        FROM public.washa_board_requests
        WHERE generation_request_id = 'retained-after-profile-delete'
          AND profile_id IS NULL;
    `));

    const rlsBehavior = {
        owner_visible_rows: ownerVisibleRows,
        non_owner_visible_rows: nonOwnerVisibleRows,
        authenticated_insert_denied: authenticatedInsertDenied,
        profile_set_null_rows: profileSetNullRows,
    };
    const expectedRlsBehavior = {
        owner_visible_rows: 1,
        non_owner_visible_rows: 0,
        authenticated_insert_denied: true,
        profile_set_null_rows: 1,
    };
    assertJsonState(rlsBehavior, expectedRlsBehavior, "board migration behavior");
    console.log(`[board-migration] RLS/FK behavior: ${JSON.stringify(rlsBehavior)}`);

    runPsql(["-c", `
        INSERT INTO public.site_settings (key, value)
        VALUES ('generation_mode', to_jsonb('fallback'::text));
    `]);

    console.log(`[board-migration] apply down: ${downMigrationPath}`);
    applySqlFile(downMigrationPath);
    upApplied = false;

    const rollbackState = {
        rollback_generation_mode: queryScalar(`
            SELECT value #>> '{}'
            FROM public.site_settings
            WHERE key = 'generation_mode';
        `),
        final_to_regclass: queryScalar(
            "SELECT COALESCE(to_regclass('public.washa_board_requests')::text, 'null');"
        ),
    };
    const expectedRollbackState = {
        rollback_generation_mode: "primary",
        final_to_regclass: "null",
    };
    assertJsonState(rollbackState, expectedRollbackState, "board rollback state");

    console.log(`[board-migration] rollback verification: ${JSON.stringify(rollbackState)}`);
    console.log(`[board-migration] final to_regclass: ${rollbackState.final_to_regclass}`);
    lifecyclePassed = true;
    console.log("[board-migration] PASS");
} catch (error) {
    if (upApplied) {
        try {
            applySqlFile(downMigrationPath);
        } catch {
            // Preserve the original verification failure.
        }
    }
    throw error;
} finally {
    if (databaseCreated) {
        dropLifecycleDatabase();
        if (lifecyclePassed) {
            console.log(`[board-migration] cleanup: dropped temporary database ${lifecycleDatabaseName}`);
        }
    }
}
