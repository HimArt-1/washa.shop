import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
    mockRequireDtfRouteAccess,
    mockGetSupabaseAdminClient,
    mockDownloadStoredBuffer,
} = vi.hoisted(() => ({
    mockRequireDtfRouteAccess: vi.fn(),
    mockGetSupabaseAdminClient: vi.fn(),
    mockDownloadStoredBuffer: vi.fn(),
}));

vi.mock("@/app/api/washa-dtf-studio/utils/route-runtime", () => ({
    requireDtfRouteAccess: mockRequireDtfRouteAccess,
}));
vi.mock("@/lib/supabase", () => ({
    getSupabaseAdminClient: mockGetSupabaseAdminClient,
}));
vi.mock("@/app/api/washa-dtf-studio/services/storage.service", () => ({
    StorageService: {
        downloadStoredBuffer: mockDownloadStoredBuffer,
    },
}));

import { GET } from "@/app/api/washa-dtf-studio/assets/[kind]/[id]/route";

const MASTER_ID = "22222222-2222-4222-8222-222222222222";

function masterQuery(ownerProfileId: string) {
    return {
        select() { return this; },
        eq() { return this; },
        async maybeSingle() {
            return {
                data: {
                    profile_id: ownerProfileId,
                    storage_bucket: "washa-design-assets",
                    permanent_storage_path: "design-masters/profile/master/design-master.png",
                    mime_type: "image/png",
                },
                error: null,
            };
        },
    };
}

describe("private WASHA design asset delivery", () => {
    beforeEach(() => {
        mockRequireDtfRouteAccess.mockReset();
        mockGetSupabaseAdminClient.mockReset();
        mockDownloadStoredBuffer.mockReset();
        mockRequireDtfRouteAccess.mockResolvedValue({
            access: {
                allowed: true,
                profileId: "profile_owner",
                role: "user",
            },
        });
        mockGetSupabaseAdminClient.mockReturnValue({
            from: () => masterQuery("profile_owner"),
        });
        mockDownloadStoredBuffer.mockResolvedValue(Buffer.from("exact-private-png-bytes"));
    });

    it("streams exact bytes only through the authenticated owner route", async () => {
        const response = await GET(
            new NextRequest(`http://localhost/api/washa-dtf-studio/assets/master/${MASTER_ID}`),
            { params: Promise.resolve({ kind: "master", id: MASTER_ID }) }
        );

        expect(response.status).toBe(200);
        expect(response.headers.get("cache-control")).toContain("private");
        expect(Buffer.from(await response.arrayBuffer()).toString()).toBe("exact-private-png-bytes");
    });

    it("does not expose another customer's master asset", async () => {
        mockGetSupabaseAdminClient.mockReturnValue({
            from: () => masterQuery("profile_someone_else"),
        });

        const response = await GET(
            new NextRequest(`http://localhost/api/washa-dtf-studio/assets/master/${MASTER_ID}`),
            { params: Promise.resolve({ kind: "master", id: MASTER_ID }) }
        );

        expect(response.status).toBe(403);
        expect(mockDownloadStoredBuffer).not.toHaveBeenCalled();
    });
});
