import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const { mockGetSupabaseAdminClient, mockUpload } = vi.hoisted(() => ({
    mockGetSupabaseAdminClient: vi.fn(),
    mockUpload: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
    getSupabaseAdminClient: mockGetSupabaseAdminClient,
}));

vi.mock("@/app/api/washa-dtf-studio/utils/api-error", () => ({
    logDiagnosticWarning: vi.fn(),
}));

import { StorageService } from "@/app/api/washa-dtf-studio/services/storage.service";

describe("master asset storage", () => {
    beforeEach(() => {
        mockUpload.mockReset();
        mockGetSupabaseAdminClient.mockReset();
        mockUpload.mockResolvedValue({
            data: { path: "design-masters/profile/master/design-master.png" },
            error: null,
        });
        mockGetSupabaseAdminClient.mockReturnValue({
            storage: {
                from: () => ({
                    upload: mockUpload,
                }),
            },
        });
    });

    it("stores design-master.png at an immutable path without upsert or optimization", async () => {
        const buffer = Buffer.from("exact-png-bytes");
        const result = await StorageService.uploadImmutableBuffer(
            buffer,
            "design-masters/profile/master/design-master.png",
            {
                mimeType: "image/png",
                accessUrl: "https://washa.shop/api/washa-dtf-studio/assets/master/22222222-2222-4222-8222-222222222222",
                metadata: { checksum: "a".repeat(64) },
            }
        );

        expect(result).toMatchObject({
            path: "design-masters/profile/master/design-master.png",
            url: "https://washa.shop/api/washa-dtf-studio/assets/master/22222222-2222-4222-8222-222222222222",
            mimeType: "image/png",
        });
        expect(mockUpload).toHaveBeenCalledWith(
            "design-masters/profile/master/design-master.png",
            buffer,
            {
                cacheControl: "31536000",
                upsert: false,
                contentType: "image/png",
                metadata: { checksum: "a".repeat(64) },
            }
        );
    });

    it("does not silently replace an existing master asset", async () => {
        mockUpload.mockResolvedValueOnce({
            data: null,
            error: { message: "The resource already exists" },
        });

        await expect(StorageService.uploadImmutableBuffer(
            Buffer.from("new-bytes"),
            "design-masters/profile/master/design-master.png",
            {
                mimeType: "image/png",
                accessUrl: "https://washa.shop/api/washa-dtf-studio/assets/master/22222222-2222-4222-8222-222222222222",
            }
        )).resolves.toMatchObject({
            status: 409,
        });
    });

    it("keeps the customer artwork bucket private with no public object-read policy", () => {
        const migration = readFileSync(
            resolve("supabase/migrations/20260716120000_washa_ai_single_source_assets.sql"),
            "utf8"
        );

        expect(migration).toContain("VALUES ('washa-design-assets', 'washa-design-assets', false)");
        expect(migration).not.toContain('CREATE POLICY "Public read WASHA design assets"');
    });
});
