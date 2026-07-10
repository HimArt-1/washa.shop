import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const {
    mockRequireDtfRouteAccess,
    mockEnforceDtfRouteRateLimit,
    mockParseAndValidateDtfJson,
    mockCurrentUser,
    mockPrepareCartItem,
    mockLogDiagnosticWarning,
} = vi.hoisted(() => ({
    mockRequireDtfRouteAccess: vi.fn(),
    mockEnforceDtfRouteRateLimit: vi.fn(),
    mockParseAndValidateDtfJson: vi.fn(),
    mockCurrentUser: vi.fn(),
    mockPrepareCartItem: vi.fn(),
    mockLogDiagnosticWarning: vi.fn(),
}));

vi.mock("@/app/api/washa-dtf-studio/utils/route-runtime", () => ({
    requireDtfRouteAccess: mockRequireDtfRouteAccess,
    enforceDtfRouteRateLimit: mockEnforceDtfRouteRateLimit,
    parseAndValidateDtfJson: mockParseAndValidateDtfJson,
}));

vi.mock("@clerk/nextjs/server", () => ({
    currentUser: mockCurrentUser,
}));

vi.mock("@/app/api/washa-dtf-studio/services/dtf-order.service", () => ({
    DtfOrderService: {
        prepareCartItem: mockPrepareCartItem,
    },
}));

vi.mock("@/app/api/washa-dtf-studio/utils/api-error", async () => {
    const actual = await vi.importActual<typeof import("@/app/api/washa-dtf-studio/utils/api-error")>(
        "@/app/api/washa-dtf-studio/utils/api-error"
    );

    return {
        ...actual,
        logDiagnosticWarning: mockLogDiagnosticWarning,
    };
});

import { POST } from "@/app/api/washa-dtf-studio/submit-order/route";

describe("submit-order route", () => {
    beforeEach(() => {
        mockRequireDtfRouteAccess.mockReset();
        mockEnforceDtfRouteRateLimit.mockReset();
        mockParseAndValidateDtfJson.mockReset();
        mockCurrentUser.mockReset();
        mockPrepareCartItem.mockReset();
        mockLogDiagnosticWarning.mockReset();

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
                garmentType: "تيشيرت",
                garmentColor: "أسود",
                style: "حديث",
                technique: "DTF",
                paletteId: "palette_1",
                mockupDataUrl: "data:image/png;base64,AAAA",
            },
        });
        mockCurrentUser.mockResolvedValue({
            id: "clerk_1",
            firstName: "Test",
            lastName: "User",
            emailAddresses: [{ emailAddress: "test@example.com" }],
        });
        mockPrepareCartItem.mockResolvedValue({
            data: {
                cartItem: {
                    id: "dtf-1",
                    title: "تصميم DTF مخصص — تيشيرت أسود",
                    price: 139,
                },
            },
        });
    });

    it("returns the access response unchanged when access is denied", async () => {
        mockRequireDtfRouteAccess.mockResolvedValue({
            response: NextResponse.json(
                { error: "غير مصرح لك باستخدام استوديو DTF" },
                { status: 403 }
            ),
        });

        const response = await POST(new Request("http://localhost/api/dtf/submit") as NextRequest);

        expect(response.status).toBe(403);
        await expect(response.json()).resolves.toEqual({
            error: "غير مصرح لك باستخدام استوديو DTF",
        });
    });

    it("returns rate limit responses unchanged", async () => {
        mockEnforceDtfRouteRateLimit.mockResolvedValue(
            NextResponse.json(
                { error: "تم تجاوز حد إرسال التصاميم للسلة" },
                { status: 429 }
            )
        );

        const response = await POST(new Request("http://localhost/api/dtf/submit") as NextRequest);

        expect(response.status).toBe(429);
        await expect(response.json()).resolves.toEqual({
            error: "تم تجاوز حد إرسال التصاميم للسلة",
        });
        expect(mockParseAndValidateDtfJson).not.toHaveBeenCalled();
        expect(mockPrepareCartItem).not.toHaveBeenCalled();
    });

    it("returns validation failures unchanged", async () => {
        mockParseAndValidateDtfJson.mockResolvedValue({
            response: NextResponse.json(
                { error: "بيانات الطلب غير صالحة" },
                { status: 400 }
            ),
        });

        const response = await POST(new Request("http://localhost/api/dtf/submit") as NextRequest);

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({
            error: "بيانات الطلب غير صالحة",
        });
        expect(mockPrepareCartItem).not.toHaveBeenCalled();
    });

    it("preserves service error responses", async () => {
        mockPrepareCartItem.mockResolvedValue({
            error: "فشل إنشاء الطلب",
            status: 500,
        });

        const response = await POST(new Request("http://localhost/api/dtf/submit") as NextRequest);

        expect(response.status).toBe(500);
        expect(response.headers.get("X-Trace-Id")).toBeTruthy();
        await expect(response.json()).resolves.toEqual({
            error: "فشل إنشاء الطلب",
        });
    });

    it("returns the success payload unchanged", async () => {
        const response = await POST(new Request("http://localhost/api/dtf/submit") as NextRequest);

        expect(response.status).toBe(200);
        expect(response.headers.get("X-Trace-Id")).toBeTruthy();
        await expect(response.json()).resolves.toMatchObject({
            cartItem: {
                id: "dtf-1",
                title: "تصميم DTF مخصص — تيشيرت أسود",
                price: 139,
            },
        });
    });

    it("requires a Clerk profile before preparing the cart item", async () => {
        mockCurrentUser.mockRejectedValue(new Error("clerk unavailable"));

        const response = await POST(new Request("http://localhost/api/dtf/submit") as NextRequest);

        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toEqual({
            error: "يجب تسجيل الدخول قبل إضافة تصميم WASHA AI إلى السلة.",
        });
        expect(mockLogDiagnosticWarning).toHaveBeenCalledWith(
            "fetch-user-profile-clerk",
            expect.any(Error)
        );
        expect(mockPrepareCartItem).not.toHaveBeenCalled();
    });
});
