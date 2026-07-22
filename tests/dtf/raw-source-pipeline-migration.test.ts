import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
    resolve("supabase/migrations/20260722233000_washa_ai_raw_source_pipeline.sql"),
    "utf8"
);

describe("WASHA AI raw-source pipeline migration", () => {
    it("stores immutable provider bytes before any print preparation", () => {
        expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.washa_design_source_assets");
        expect(migration).toContain("permanent_storage_path TEXT NOT NULL UNIQUE");
        expect(migration).toContain("sha256_checksum TEXT NOT NULL");
        expect(migration).toContain("trg_washa_source_assets_immutable");
        expect(migration).toContain("idx_washa_master_assets_source_checksum");
    });

    it("lets generation succeed with a source preview while prepress remains pending", () => {
        expect(migration).toContain("ALTER COLUMN master_asset_id DROP NOT NULL");
        expect(migration).toContain("preview_kind IN ('mockup', 'source')");
        expect(migration).toContain("'pending_prepress'");
        expect(migration).toContain("'source_preview'");
    });

    it("pins the source identity into approvals and orders", () => {
        expect(migration).toContain("washa_design_revisions");
        expect(migration).toContain("source_sha256_checksum");
        expect(migration).toContain("design_source_asset_id UUID");
        expect(migration).toContain("source_checksum TEXT");
        expect(migration).toContain("asset_schema_version");
    });

    it("promotes legacy masters without mislabeling them as untouched provider output", () => {
        expect(migration).toContain("legacy_promoted_master");
        expect(migration).toContain("UPDATE public.washa_design_requests AS request");
        expect(migration).toContain("UPDATE public.custom_design_orders AS design_order");
        expect(migration).not.toContain("UPDATE public.washa_design_master_assets AS master");
        expect(migration).not.toContain("UPDATE public.washa_design_revisions AS revision");
    });
});
