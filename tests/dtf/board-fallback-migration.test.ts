import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const upMigration = readFileSync(
    resolve("supabase/migrations/20260722000000_board_fallback_system.sql"),
    "utf8"
);
const downMigration = readFileSync(
    resolve("supabase/rollbacks/20260722000000_board_fallback_system.down.sql"),
    "utf8"
);
const lifecycleVerifier = readFileSync(
    resolve("scripts/verify-board-fallback-migration.mjs"),
    "utf8"
);

describe("board fallback migration contract", () => {
    it("creates only the isolated board request table with constrained workflow states", () => {
        expect(upMigration).toContain("CREATE TABLE public.washa_board_requests");
        expect(upMigration).toContain("id UUID PRIMARY KEY DEFAULT gen_random_uuid()");
        expect(upMigration).toContain("ON DELETE SET NULL");
        expect(upMigration).toMatch(/profile_id UUID\s+REFERENCES public\.profiles\(id\)/);
        expect(upMigration).not.toMatch(/profile_id UUID NOT NULL/);
        expect(upMigration).toContain("generation_request_id TEXT NOT NULL UNIQUE");
        expect(upMigration).toContain("status IN ('processing', 'ready', 'failed')");
        expect(upMigration).toContain("manual_print_status IN ('pending', 'in_progress', 'completed')");
        expect(upMigration).toContain("jsonb_typeof(generation_context) = 'object'");
        expect(upMigration).toContain("idx_washa_board_requests_profile_created");
        expect(upMigration).toContain("idx_washa_board_requests_manual_status_created");
        expect(upMigration).toContain("CREATE TRIGGER set_washa_board_requests_updated_at");
        expect(upMigration).toContain("EXECUTE FUNCTION public.update_updated_at_column()");

        expect(upMigration).not.toContain("washa_design_requests");
        expect(upMigration).not.toContain("washa_design_master_assets");
        expect(upMigration).not.toContain("washa_design_asset_derivatives");
        expect(upMigration).not.toContain("site_settings");
    });

    it("allows owner reads while leaving all browser writes denied by RLS", () => {
        expect(upMigration).toContain("ALTER TABLE public.washa_board_requests ENABLE ROW LEVEL SECURITY");
        expect(upMigration).toContain('CREATE POLICY "WASHA board requests owner read"');
        expect(upMigration).toContain("FOR SELECT");
        expect(upMigration).toContain("p.clerk_id");
        expect(upMigration).toContain("request.jwt.claims");
        expect(upMigration.match(/CREATE POLICY/g)).toHaveLength(1);
        expect(upMigration).not.toMatch(/FOR\s+(INSERT|UPDATE|DELETE|ALL)/);
    });

    it("forces primary mode before dropping only the board table", () => {
        expect(downMigration).toContain("WHERE key = 'generation_mode'");
        expect(downMigration).toContain("to_jsonb('primary'::text)");
        expect(downMigration).toContain("DROP TABLE IF EXISTS public.washa_board_requests");
        expect(downMigration).not.toContain("CASCADE");
        expect(downMigration).not.toContain("washa_design_requests");
        expect(downMigration).not.toContain("washa_design_master_assets");
        expect(downMigration).not.toContain("washa_design_asset_derivatives");
    });

    it("uses a unique disposable database and verifies behavior, not catalog text alone", () => {
        expect(lifecycleVerifier).toContain("process.pid");
        expect(lifecycleVerifier).toContain("authenticated_insert_denied");
        expect(lifecycleVerifier).toContain("owner_visible_rows");
        expect(lifecycleVerifier).toContain("rollback_generation_mode");
        expect(lifecycleVerifier).not.toContain('const lifecycleDatabaseName = "board_fallback_lifecycle"');
    });
});
