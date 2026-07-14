import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCreateClient, mockCurrentUser } = vi.hoisted(() => ({
    mockCreateClient: vi.fn(),
    mockCurrentUser: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
    createClient: mockCreateClient,
}));

vi.mock("@clerk/nextjs/server", () => ({
    currentUser: mockCurrentUser,
}));

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

import { submitDesignOrder } from "@/app/actions/smart-store";

describe("public design-order submission", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockCurrentUser.mockResolvedValue(null);
        mockCreateClient.mockImplementation(() => {
            throw new Error("database must not be reached without authentication");
        });
    });

    it("rejects an unauthenticated request before reserving inventory or opening the database", async () => {
        await expect(submitDesignOrder({
            garment_name: "تيشيرت",
            color_name: "أسود",
            color_hex: "#000000",
            size_name: "L",
            design_method: "from_text",
            text_prompt: "تكوين عربي معاصر",
            print_position: "chest",
            print_size: "large",
        })).resolves.toEqual({
            error: "يجب تسجيل الدخول قبل إرسال طلب التصميم.",
        });

        expect(mockCurrentUser).toHaveBeenCalledTimes(1);
        expect(mockCreateClient).not.toHaveBeenCalled();
    });
});
