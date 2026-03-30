import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const {
    mockResolveDesignPieceAccess,
    mockResolveDesignPieceApiState,
    mockGetDesignPieceAccessFailure,
    mockCheckRateLimit,
    mockGetRequestClientIdentifier,
} = vi.hoisted(() => ({
    mockResolveDesignPieceAccess: vi.fn(),
    mockResolveDesignPieceApiState: vi.fn(),
    mockGetDesignPieceAccessFailure: vi.fn(),
    mockCheckRateLimit: vi.fn(),
    mockGetRequestClientIdentifier: vi.fn(),
}));

vi.mock("@/lib/design-piece-access", () => ({
    resolveDesignPieceAccess: mockResolveDesignPieceAccess,
    getDesignPieceAccessFailure: mockGetDesignPieceAccessFailure,
}));

vi.mock("@/lib/design-piece-runtime", () => ({
    resolveDesignPieceApiState: mockResolveDesignPieceApiState,
}));

vi.mock("@/lib/rate-limit", () => ({
    checkRateLimit: mockCheckRateLimit,
}));

vi.mock("@/lib/request-client", () => ({
    getRequestClientIdentifier: mockGetRequestClientIdentifier,
}));

import {
    enforceDtfRouteRateLimit,
    parseAndValidateDtfJson,
    requireDtfRouteAccess,
} from "@/app/api/washa-dtf-studio/utils/route-runtime";
import { generateMockupSchema } from "@/app/api/washa-dtf-studio/validators/ai-studio.schema";
import { submitOrderSchema } from "@/app/api/washa-dtf-studio/validators/submit-order.schema";

describe("dtf route runtime", () => {
    beforeEach(() => {
        mockResolveDesignPieceAccess.mockReset();
        mockResolveDesignPieceApiState.mockReset();
        mockGetDesignPieceAccessFailure.mockReset();
        mockCheckRateLimit.mockReset();
        mockGetRequestClientIdentifier.mockReset();

        mockGetDesignPieceAccessFailure.mockReturnValue({
            message: "غير مصرح لك باستخدام استوديو DTF",
            status: 403,
        });
        mockGetRequestClientIdentifier.mockReturnValue("guest:127.0.0.1");
    });

    it("uses the public API state when public generation is enabled", async () => {
        mockResolveDesignPieceApiState.mockResolvedValue({
            access: {
                allowed: true,
                reason: "public_access",
            },
        });

        const result = await requireDtfRouteAccess({ allowPublicGeneration: true });

        expect(mockResolveDesignPieceApiState).toHaveBeenCalledTimes(1);
        expect(mockResolveDesignPieceAccess).not.toHaveBeenCalled();
        expect(result).toEqual({
            access: {
                allowed: true,
                reason: "public_access",
            },
        });
    });

    it("normalizes denied access into a JSON response", async () => {
        mockResolveDesignPieceAccess.mockResolvedValue({
            allowed: false,
            reason: "guest_needs_approval",
        });

        const result = await requireDtfRouteAccess();

        expect(result.response?.status).toBe(403);
        await expect(result.response?.json()).resolves.toEqual({
            error: "غير مصرح لك باستخدام استوديو DTF",
        });
    });

    it("returns a 400 response for malformed JSON payloads", async () => {
        const request = new Request("http://localhost/api/dtf", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: "{",
        }) as NextRequest;

        const result = await parseAndValidateDtfJson(request, generateMockupSchema, {
            invalidJsonMessage: "طلب غير صالح (JSON غير مقروء)",
            fallbackValidationMessage: "بيانات الطلب غير صالحة",
        });

        expect(result.response?.status).toBe(400);
        await expect(result.response?.json()).resolves.toEqual({
            error: "طلب غير صالح (JSON غير مقروء)",
        });
    });

    it("returns the first schema issue for invalid submit-order payloads", async () => {
        const request = new Request("http://localhost/api/dtf", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                garmentType: "تيشيرت",
                garmentColor: "أسود",
                style: "حديث",
                technique: "DTF",
                mockupDataUrl: "data:image/png;base64,AAAA",
            }),
        }) as NextRequest;

        const result = await parseAndValidateDtfJson(request, submitOrderSchema, {
            invalidJsonMessage: "طلب غير صالح (JSON غير مقروء)",
            fallbackValidationMessage: "بيانات الطلب غير صالحة",
        });

        expect(result.response?.status).toBe(400);
        await expect(result.response?.json()).resolves.toEqual({
            error: "الرجاء اختيار لوحة الألوان أو تحديد لوحة مخصصة",
        });
    });

    it("skips rate limiting for privileged roles", async () => {
        const request = new Request("http://localhost/api/dtf") as NextRequest;

        const response = await enforceDtfRouteRateLimit(
            request,
            {
                allowed: true,
                profileId: "profile_1",
                role: "admin",
            },
            {
                keyPrefix: "gen",
                limit: 6,
                windowMs: 60_000,
                message: "تم تجاوز الحد المسموح. يرجى الانتظار دقيقة والمحاولة مجدداً.",
            }
        );

        expect(response).toBeNull();
        expect(mockCheckRateLimit).not.toHaveBeenCalled();
    });

    it("returns a 429 response with reset header when the threshold is hit", async () => {
        mockCheckRateLimit.mockResolvedValue({
            success: false,
            remaining: 0,
            resetAt: Date.parse("2026-03-30T10:00:00.000Z"),
        });

        const request = new Request("http://localhost/api/dtf") as NextRequest;

        const response = await enforceDtfRouteRateLimit(
            request,
            {
                allowed: true,
                role: "subscriber",
            },
            {
                keyPrefix: "ext",
                limit: 6,
                windowMs: 60_000,
                message: "تم تجاوز الحد المسموح للاستخراج. يرجى الانتظار دقيقة والمحاولة مجدداً.",
            }
        );

        expect(mockCheckRateLimit).toHaveBeenCalledWith("ext-guest:127.0.0.1", 6, 60_000);
        expect(response?.status).toBe(429);
        expect(response?.headers.get("X-RateLimit-Reset")).toBe("2026-03-30T10:00:00.000Z");
        await expect(response?.json()).resolves.toEqual({
            error: "تم تجاوز الحد المسموح للاستخراج. يرجى الانتظار دقيقة والمحاولة مجدداً.",
        });
    });
});
