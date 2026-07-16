import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { verifyApprovedOrderAssetGraph } from "@/lib/washa-artwork/order-integrity";
import { sha256Hex } from "@/lib/washa-artwork/validation";

async function png(color: { r: number; g: number; b: number }) {
    return sharp({
        create: {
            width: 32,
            height: 32,
            channels: 4,
            background: { ...color, alpha: 0.8 },
        },
    }).png().toBuffer();
}

function mockSupabase(params: {
    master: Buffer;
    print: Buffer;
    revisionPrintPath?: string;
}) {
    const masterChecksum = sha256Hex(params.master);
    const printChecksum = sha256Hex(params.print);
    const rows: Record<string, unknown> = {
        washa_design_revisions: {
            id: "revision_1",
            design_request_id: "request_1",
            master_asset_id: "master_1",
            master_sha256_checksum: masterChecksum,
            print_asset_path: params.revisionPrintPath || "print/approved.png",
        },
        washa_design_master_assets: {
            id: "master_1",
            storage_bucket: "washa-design-assets",
            permanent_storage_path: "master/design-master.png",
            sha256_checksum: masterChecksum,
            alpha_channel_status: "verified",
        },
        washa_design_asset_derivatives: {
            storage_bucket: "washa-design-assets",
            storage_path: "print/approved.png",
            source_master_asset_id: "master_1",
            source_checksum: masterChecksum,
            derivative_sha256_checksum: printChecksum,
            derivative_type: "print_production",
        },
    };
    return {
        from(table: string) {
            return {
                select() { return this; },
                eq() { return this; },
                async maybeSingle() {
                    return { data: rows[table] || null, error: null };
                },
            };
        },
        storage: {
            from() {
                return {
                    async download(path: string) {
                        const buffer = path.includes("design-master")
                            ? params.master
                            : params.print;
                        return {
                            data: new Blob([new Uint8Array(buffer)]),
                            error: null,
                        };
                    },
                };
            },
        },
    };
}

describe("approved order asset integrity", () => {
    it("verifies revision, master, derivative and both stored checksums", async () => {
        const master = await png({ r: 200, g: 30, b: 40 });
        const print = await png({ r: 200, g: 30, b: 40 });
        const result = await verifyApprovedOrderAssetGraph(
            mockSupabase({ master, print }),
            {
                asset_schema_version: 1,
                production_readiness_status: "ready",
                design_request_id: "request_1",
                design_master_asset_id: "master_1",
                design_revision_id: "revision_1",
                master_checksum: sha256Hex(master),
                print_asset_path: "print/approved.png",
            }
        );

        expect(result.ok).toBe(true);
        if (result.ok) expect(result.printBuffer?.equals(print)).toBe(true);
    });

    it("blocks completion when the order print path differs from the immutable revision", async () => {
        const master = await png({ r: 200, g: 30, b: 40 });
        const print = await png({ r: 200, g: 30, b: 40 });
        const result = await verifyApprovedOrderAssetGraph(
            mockSupabase({ master, print, revisionPrintPath: "print/other.png" }),
            {
                asset_schema_version: 1,
                production_readiness_status: "ready",
                design_request_id: "request_1",
                design_master_asset_id: "master_1",
                design_revision_id: "revision_1",
                master_checksum: sha256Hex(master),
                print_asset_path: "print/approved.png",
            }
        );

        expect(result).toMatchObject({ ok: false });
    });
});
