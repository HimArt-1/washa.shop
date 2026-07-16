import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { hasOrderDeliverables } from "@/lib/smart-store-core";

const legacyBase = {
    result_design_url: null,
    result_mockup_url: null,
    result_pdf_url: null,
    modification_design_url: null,
};

describe("design order asset compatibility", () => {
    it("keeps legacy orders viewable without silently inventing a revision", () => {
        expect(hasOrderDeliverables({
            ...legacyBase,
            dtf_mockup_url: "https://cdn.example/legacy-mockup.png",
            dtf_extracted_url: "https://cdn.example/legacy-extracted.png",
            asset_schema_version: 0,
        })).toBe(true);
    });

    it("requires the master, revision, checksum, preview and print asset for schema v1 completion", () => {
        expect(hasOrderDeliverables({
            ...legacyBase,
            dtf_mockup_url: "https://cdn.example/mockup.webp",
            dtf_extracted_url: "https://cdn.example/print.png",
            design_request_id: "request",
            design_master_asset_id: "master",
            design_revision_id: null,
            master_checksum: "a".repeat(64),
            print_asset_path: "print.png",
            asset_schema_version: 1,
            production_readiness_status: "ready",
        })).toBe(false);

        expect(hasOrderDeliverables({
            ...legacyBase,
            dtf_mockup_url: "https://cdn.example/mockup.webp",
            dtf_extracted_url: "https://cdn.example/print.png",
            design_request_id: "request",
            design_master_asset_id: "master",
            design_revision_id: "revision",
            master_checksum: "a".repeat(64),
            print_asset_path: "print.png",
            asset_schema_version: 1,
            production_readiness_status: "ready",
        })).toBe(true);
    });

    it("downloads approved production bytes without Canvas resizing or background removal", () => {
        const workspace = readFileSync(
            resolve("src/components/admin/design-orders/DesignOrderWorkspace.tsx"),
            "utf8"
        );
        const downloadRoute = readFileSync(
            resolve("src/app/api/dashboard/design-orders/[id]/dtf-download/route.ts"),
            "utf8"
        );

        expect(workspace).not.toContain("downloadTransparentDesignAsPng");
        expect(workspace).not.toContain("removeEdgeBackground");
        expect(downloadRoute).toContain("verifyApprovedOrderAssetGraph");
    });
});
