import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const {
    mockRequireDtfRouteAccess,
    mockEnforceDtfRouteRateLimit,
    mockParseAndValidateDtfJson,
    mockExtractDesign,
    mockLogActivity,
    mockGetWashaDtfErrorDetails,
    mockGetMasterAsset,
} = vi.hoisted(() => ({
    mockRequireDtfRouteAccess: vi.fn(),
    mockEnforceDtfRouteRateLimit: vi.fn(),
    mockParseAndValidateDtfJson: vi.fn(),
    mockExtractDesign: vi.fn(),
    mockLogActivity: vi.fn(),
    mockGetWashaDtfErrorDetails: vi.fn(),
    mockGetMasterAsset: vi.fn(),
}));

vi.mock("@/app/api/washa-dtf-studio/utils/route-runtime", () => ({
    requireDtfRouteAccess: mockRequireDtfRouteAccess,
    enforceDtfRouteRateLimit: mockEnforceDtfRouteRateLimit,
    parseAndValidateDtfJson: mockParseAndValidateDtfJson,
}));

vi.mock("@/app/api/washa-dtf-studio/services/ai-studio.service", () => ({
    AiStudioService: {
        extractDesign: mockExtractDesign,
    },
}));

vi.mock("@/app/api/washa-dtf-studio/services/design-asset.service", () => ({
    DesignAssetService: {
        getMasterAsset: mockGetMasterAsset,
    },
}));

vi.mock("@/app/api/washa-dtf-studio/services/dtf-telemetry.service", () => ({
    DtfTelemetryService: {
        logActivity: mockLogActivity,
    },
}));

vi.mock("@/lib/washa-dtf-studio", () => ({
    getWashaDtfErrorDetails: mockGetWashaDtfErrorDetails,
}));

import { POST } from "@/app/api/washa-dtf-studio/extract-design/route";

describe("extract-design route", () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    beforeEach(() => {
        mockRequireDtfRouteAccess.mockReset();
        mockEnforceDtfRouteRateLimit.mockReset();
        mockParseAndValidateDtfJson.mockReset();
        mockExtractDesign.mockReset();
        mockLogActivity.mockReset();
        mockGetWashaDtfErrorDetails.mockReset();
        mockGetMasterAsset.mockReset();
        vi.stubEnv("WASHA_DTF_LEGACY_EXTRACTION_ENABLED", "true");

        mockRequireDtfRouteAccess.mockResolvedValue({
            access: {
                allowed: true,
                profileId: "profile_1",
                clerkId: "clerk_1",
                role: "subscriber",
            },
        });
        mockEnforceDtfRouteRateLimit.mockResolvedValue(null);
        mockParseAndValidateDtfJson.mockResolvedValue({
            data: {
                prompt: "استخرج التصميم فقط",
                mockupImage: "BASE64_IMAGE",
                mimeType: "image/png",
            },
        });
        mockExtractDesign.mockResolvedValue("data:image/png;base64,EXTRACTED");
        mockLogActivity.mockResolvedValue(true);
        mockGetWashaDtfErrorDetails.mockReturnValue({
            message: "خدمة Washa AI تحت ضغط مؤقت الآن. أعد المحاولة بعد قليل.",
            status: 503,
        });
        mockGetMasterAsset.mockResolvedValue({
            masterAssetId: "22222222-2222-4222-8222-222222222222",
            imageUrl: "https://cdn.example/design-master.png",
            permanentStoragePath: "design-masters/profile/master/design-master.png",
            masterChecksum: "a".repeat(64),
            mimeType: "image/png",
            width: 1024,
            height: 1024,
        });
    });

    it("returns the access response unchanged when access is denied", async () => {
        mockRequireDtfRouteAccess.mockResolvedValue({
            response: NextResponse.json(
                { error: "غير مصرح لك باستخدام استوديو DTF" },
                { status: 403 }
            ),
        });

        const response = await POST(new Request("http://localhost/api/dtf/extract") as NextRequest);

        expect(response.status).toBe(403);
        expect(response.headers.get("X-Trace-Id")).toBeTruthy();
        await expect(response.json()).resolves.toEqual({
            error: "غير مصرح لك باستخدام استوديو DTF",
        });
    });

    it("returns validation failures unchanged", async () => {
        mockParseAndValidateDtfJson.mockResolvedValue({
            response: NextResponse.json(
                { error: "الصورة مطلوبة" },
                { status: 400 }
            ),
        });

        const response = await POST(new Request("http://localhost/api/dtf/extract") as NextRequest);

        expect(response.status).toBe(400);
        expect(response.headers.get("X-Trace-Id")).toBeTruthy();
        await expect(response.json()).resolves.toEqual({
            error: "الصورة مطلوبة",
        });
        expect(mockExtractDesign).not.toHaveBeenCalled();
    });

    it("returns the current success payload shape", async () => {
        const response = await POST(new Request("http://localhost/api/dtf/extract") as NextRequest);

        expect(response.status).toBe(200);
        expect(response.headers.get("X-Trace-Id")).toBeTruthy();
        await expect(response.json()).resolves.toEqual({
            imageUrl: "data:image/png;base64,EXTRACTED",
        });
        expect(mockExtractDesign).toHaveBeenCalledWith(
            "استخرج التصميم فقط",
            "BASE64_IMAGE",
            "image/png",
            expect.objectContaining({
                traceId: expect.any(String),
                timeoutMs: 45_000,
            })
        );
        expect(mockLogActivity).toHaveBeenCalledWith(
            expect.objectContaining({
                action: "extract-design",
                status: "success",
            })
        );
    });

    it("returns the stored immutable master without invoking an image model", async () => {
        mockParseAndValidateDtfJson.mockResolvedValue({
            data: {
                masterAssetId: "22222222-2222-4222-8222-222222222222",
                prompt: "",
                mockupImage: "",
                mimeType: "image/png",
            },
        });

        const response = await POST(new Request("http://localhost/api/dtf/extract") as NextRequest);

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toMatchObject({
            masterAssetId: "22222222-2222-4222-8222-222222222222",
            imageUrl: "https://cdn.example/design-master.png",
            masterChecksum: "a".repeat(64),
        });
        expect(mockGetMasterAsset).toHaveBeenCalledWith(
            "profile_1",
            "22222222-2222-4222-8222-222222222222"
        );
        expect(mockExtractDesign).not.toHaveBeenCalled();
    });

    it("disables generative extraction from mockups by default", async () => {
        vi.stubEnv("WASHA_DTF_LEGACY_EXTRACTION_ENABLED", "false");

        const response = await POST(new Request("http://localhost/api/dtf/extract") as NextRequest);

        expect(response.status).toBe(410);
        await expect(response.json()).resolves.toMatchObject({
            code: "LEGACY_EXTRACTION_DISABLED",
        });
        expect(mockExtractDesign).not.toHaveBeenCalled();
    });

    it("returns a public provider failure", async () => {
        mockExtractDesign.mockRejectedValue(new Error("provider timeout"));
        mockGetWashaDtfErrorDetails.mockReturnValue({
            message: "انتهت مهلة الاستخراج من المزود الخارجي.",
            status: 504,
        });

        const response = await POST(new Request("http://localhost/api/dtf/extract") as NextRequest);

        expect(response.status).toBe(504);
        expect(response.headers.get("X-Trace-Id")).toBeTruthy();
        await expect(response.json()).resolves.toEqual({
            error: "تعذر تجهيز التصميم للطباعة الآن. جرّب مرة أخرى بعد لحظات.",
        });
        expect(mockLogActivity).toHaveBeenCalledWith(
            expect.objectContaining({
                action: "extract-design",
                status: "timeout",
                errorMessage: "انتهت مهلة الاستخراج من المزود الخارجي.",
            })
        );
    });
});
