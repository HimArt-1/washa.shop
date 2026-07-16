import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const { mockRequireDtfRouteAccess, mockGetQuotaStatus, mockGetRequestClientIdentifier } = vi.hoisted(() => ({
    mockRequireDtfRouteAccess: vi.fn(),
    mockGetQuotaStatus: vi.fn(),
    mockGetRequestClientIdentifier: vi.fn(),
}));

vi.mock("@/app/api/washa-dtf-studio/utils/route-runtime", async (importOriginal) => ({
    ...await importOriginal<typeof import("@/app/api/washa-dtf-studio/utils/route-runtime")>(),
    requireDtfRouteAccess: mockRequireDtfRouteAccess,
}));

vi.mock("@/app/api/washa-dtf-studio/services/dtf-telemetry.service", () => ({
    DtfTelemetryService: { getQuotaStatus: mockGetQuotaStatus },
}));

vi.mock("@/lib/request-client", () => ({
    getRequestClientIdentifier: mockGetRequestClientIdentifier,
}));

import { GET } from "@/app/api/washa-dtf-studio/quota-status/route";

describe("quota-status route", () => {
    beforeEach(() => {
        mockRequireDtfRouteAccess.mockReset();
        mockGetQuotaStatus.mockReset();
        mockGetRequestClientIdentifier.mockReset();
        mockGetRequestClientIdentifier.mockReturnValue("guest:127.0.0.1");
        mockRequireDtfRouteAccess.mockResolvedValue({
            access: { allowed: true, role: "guest" },
        });
    });

    it("returns 401 instead of treating a missing authenticated identity as transient", async () => {
        const request = new Request("http://localhost/api/washa-dtf-studio/quota-status", {
            headers: { "x-washa-auth-state": "authenticated" },
        }) as NextRequest;

        const response = await GET(request);

        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toMatchObject({
            code: "AUTH_REQUIRED",
            message: "يلزم تسجيل الدخول لإكمال العملية.",
            guest: false,
        });
        expect(mockGetQuotaStatus).not.toHaveBeenCalled();
    });

    it("still permits a genuine guest quota lookup", async () => {
        mockGetQuotaStatus.mockResolvedValue({
            audience: "guest",
            unlimited: false,
            blocked: false,
            freeLimit: 1,
            freeUsed: 0,
            freeRemaining: 1,
            paidBalance: 0,
            canPurchase: false,
        });

        const response = await GET(new Request(
            "http://localhost/api/washa-dtf-studio/quota-status"
        ) as NextRequest);

        expect(response.status).toBe(200);
        expect(mockGetQuotaStatus).toHaveBeenCalledWith(undefined, "guest", {
            guestIdentifier: "guest:127.0.0.1",
        });
    });
});
