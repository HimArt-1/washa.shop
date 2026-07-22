import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockSendTelegramMessage } = vi.hoisted(() => ({
    mockSendTelegramMessage: vi.fn(),
}));

vi.mock("@/lib/telegram-bot", () => ({
    sendTelegramMessage: mockSendTelegramMessage,
}));

import { notifyBoardRequestReady } from "@/lib/board-request-telegram";

const input = {
    boardRequestId: "77777777-7777-4777-8777-777777777777",
    boardImageUrl: "https://cdn.example/board-preview.webp",
    customerDescription: "صقر عربي هندسي",
    generationContext: {
        garmentType: "تيشيرت",
        garmentColor: "أسود",
        printPosition: "chest" as const,
        printSize: "large" as const,
        printScale: 85,
    },
};

describe("board request Telegram notification", () => {
    beforeEach(() => {
        mockSendTelegramMessage.mockReset();
        mockSendTelegramMessage.mockResolvedValue({ ok: true, status: 200 });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("sends the operational board summary with escaped and bounded customer text", async () => {
        const result = await notifyBoardRequestReady({
            ...input,
            customerDescription: `<script>alert("xss")</script>${"و".repeat(2_000)}`,
            generationContext: {
                ...input.generationContext,
                garmentColor: "أسود & ذهبي",
            },
        });

        expect(result).toEqual({ ok: true });
        expect(mockSendTelegramMessage).toHaveBeenCalledOnce();
        const message = mockSendTelegramMessage.mock.calls[0]?.[0];
        expect(message).toMatchObject({
            parseMode: "HTML",
            disableWebPagePreview: true,
        });
        expect(message.text).toContain("⚠️ طلب احتياطي يحتاج تركيب طباعة يدوي");
        expect(message.text).toContain(input.boardRequestId);
        expect(message.text).toContain("القطعة: تيشيرت");
        expect(message.text).toContain("اللون: أسود &amp; ذهبي");
        expect(message.text).toContain("الموضع: الصدر الأمامي");
        expect(message.text).toContain("الأبعاد المطلوبة: كبير — المقياس 85%");
        expect(message.text).toContain(input.boardImageUrl);
        expect(message.text).toContain("&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;");
        expect(message.text).not.toContain("<script>");
        expect(message.text.length).toBeLessThan(4_096);
        expect(message.text).toContain("…");
    });

    it("returns delivery_failed instead of throwing when Telegram rejects the message", async () => {
        mockSendTelegramMessage.mockResolvedValue({
            ok: false,
            status: 429,
            error: "Too Many Requests",
        });

        await expect(notifyBoardRequestReady(input)).resolves.toEqual({
            ok: false,
            reason: "delivery_failed",
        });
    });

    it("classifies missing Telegram configuration without throwing", async () => {
        mockSendTelegramMessage.mockResolvedValue({
            ok: false,
            error: "TELEGRAM_CHAT_ID is not configured",
        });

        await expect(notifyBoardRequestReady(input)).resolves.toEqual({
            ok: false,
            reason: "not_configured",
        });
    });

    it("contains unexpected Telegram errors inside the best-effort boundary", async () => {
        mockSendTelegramMessage.mockRejectedValue(new Error("network down"));

        await expect(notifyBoardRequestReady(input)).resolves.toEqual({
            ok: false,
            reason: "delivery_failed",
        });
    });

    it("bounds a stalled Telegram request with a timeout", async () => {
        vi.useFakeTimers();
        mockSendTelegramMessage.mockReturnValue(new Promise(() => undefined));

        const notification = notifyBoardRequestReady(input);
        await vi.advanceTimersByTimeAsync(2_500);

        await expect(notification).resolves.toEqual({
            ok: false,
            reason: "timed_out",
        });
    });
});
