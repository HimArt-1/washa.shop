import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const {
    mockRequireDtfRouteAccess,
    mockEnforceDtfRouteRateLimit,
    mockParseAndValidateDtfJson,
    mockExtractDesign,
    mockLogActivity,
    mockGetWashaDtfErrorDetails,
} = vi.hoisted(() => ({
    mockRequireDtfRouteAccess: vi.fn(),
    mockEnforceDtfRouteRateLimit: vi.fn(),
    mockParseAndValidateDtfJson: vi.fn(),
    mockExtractDesign: vi.fn(),
    mockLogActivity: vi.fn(),
    mockGetWashaDtfErrorDetails: vi.fn(),
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
    beforeEach(() => {
        mockRequireDtfRouteAccess.mockReset();
        mockEnforceDtfRouteRateLimit.mockReset();
        mockParseAndValidateDtfJson.mockReset();
        mockExtractDesign.mockReset();
        mockLogActivity.mockReset();
        mockGetWashaDtfErrorDetails.mockReset();

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

    it("preserves normalized provider failures", async () => {
        mockExtractDesign.mockRejectedValue(new Error("provider timeout"));
        mockGetWashaDtfErrorDetails.mockReturnValue({
            message: "انتهت مهلة الاستخراج من المزود الخارجي.",
            status: 504,
        });

        const response = await POST(new Request("http://localhost/api/dtf/extract") as NextRequest);

        expect(response.status).toBe(504);
        expect(response.headers.get("X-Trace-Id")).toBeTruthy();
        await expect(response.json()).resolves.toEqual({
            error: "انتهت مهلة الاستخراج من المزود الخارجي.",
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
