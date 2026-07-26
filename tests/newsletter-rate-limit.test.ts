import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    mockCheckRateLimit,
    mockGetSupabaseAdminClient,
    mockHeaders,
} = vi.hoisted(() => ({
    mockCheckRateLimit: vi.fn(),
    mockGetSupabaseAdminClient: vi.fn(),
    mockHeaders: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
    currentUser: vi.fn(),
}));

vi.mock("next/headers", () => ({
    headers: mockHeaders,
}));

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
    checkRateLimit: mockCheckRateLimit,
}));

vi.mock("@/lib/supabase", () => ({
    getSupabaseAdminClient: mockGetSupabaseAdminClient,
}));

vi.mock("@/lib/admin-notification-delivery", () => ({
    runRecoverableAdminPushDispatch: vi.fn(),
    runRecoverableAdminWebhookDispatch: vi.fn(),
}));

import { subscribeNewsletter } from "@/app/actions/forms";

describe("newsletter subscription rate limiting", () => {
    beforeEach(() => {
        mockCheckRateLimit.mockReset();
        mockGetSupabaseAdminClient.mockReset();
        mockHeaders.mockResolvedValue({
            get: vi.fn((name: string) => name === "x-forwarded-for" ? "203.0.113.10" : null),
        });
    });

    it("rejects a throttled IP before accessing subscriber data", async () => {
        mockCheckRateLimit.mockResolvedValue({
            success: false,
            remaining: 0,
            resetAt: Date.now() + 60_000,
        });
        const formData = new FormData();
        formData.set("email", "artist@example.com");

        const result = await subscribeNewsletter(formData);

        expect(result).toEqual({
            success: false,
            message: "تم تجاوز الحد المسموح به من الاشتراكات. الرجاء الانتظار قليلاً ثم المحاولة مجدداً.",
        });
        expect(mockCheckRateLimit).toHaveBeenCalledWith(
            "newsletter:203.0.113.10",
            5,
            10 * 60 * 1000
        );
        expect(mockGetSupabaseAdminClient).not.toHaveBeenCalled();
    });
});
