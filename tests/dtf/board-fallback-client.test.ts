import { afterEach, describe, expect, it, vi } from "vitest";
import {
    generateMockup,
    QUOTA_CHANGED_EVENT,
    QUOTA_EXCEEDED_EVENT,
} from "../../washa-dtf-studio/src/services/geminiService";

function installWindowEventRecorder() {
    const events: Array<{ type: string; detail: unknown }> = [];
    class RecordedCustomEvent {
        constructor(
            readonly type: string,
            readonly init: { detail: unknown },
        ) {}

        get detail() {
            return this.init.detail;
        }
    }
    vi.stubGlobal("CustomEvent", RecordedCustomEvent);
    vi.stubGlobal("window", {
        dispatchEvent(event: { type: string; detail: unknown }) {
            events.push({ type: event.type, detail: event.detail });
            return true;
        },
    });
    return events;
}

describe("board fallback client response", () => {
    afterEach(() => vi.unstubAllGlobals());

    it("accepts a WebP board preview without inventing primary print assets", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
            ok: true,
            requestId: "request-board-client",
            mode: "fallback",
            boardImageUrl: "https://cdn.example/board-preview.webp",
            boardRequestId: "77777777-7777-4777-8777-777777777777",
            disclaimer: "preview_only",
            quotaCharged: false,
            remainingPoints: null,
            freeRemaining: null,
            paidBalance: null,
            consumedSource: null,
            guest: false,
        }), {
            status: 200,
            headers: { "content-type": "application/json" },
        })));

        const result = await generateMockup(
            "تيشيرت",
            "أسود",
            "صقر هندسي",
            "DTF",
            "هندسي",
            "ذهبي",
            undefined,
            undefined,
            undefined,
            { sessionToken: "session-token" }
        );

        expect(result).toEqual({
            mode: "fallback",
            boardImageUrl: "https://cdn.example/board-preview.webp",
            boardRequestId: "77777777-7777-4777-8777-777777777777",
            disclaimer: "preview_only",
            quotaCharged: false,
        });
        expect(result).not.toHaveProperty("masterAssetId");
        expect(result).not.toHaveProperty("masterAssetUrl");
        expect(result).not.toHaveProperty("masterChecksum");
        expect(result).not.toHaveProperty("placement");
    });

    it("forces preview disclosure when either fallback signal is present", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
            ok: true,
            requestId: "request-board-disclaimer",
            boardImageUrl: "https://cdn.example/board-preview.webp",
            boardRequestId: "77777777-7777-4777-8777-777777777777",
            disclaimer: "preview_only",
            quotaCharged: false,
        }), {
            status: 200,
            headers: { "content-type": "application/json" },
        })));

        await expect(generateMockup(
            "تيشيرت",
            "أسود",
            "صقر هندسي",
            "DTF",
            "هندسي",
            "ذهبي",
            undefined,
            undefined,
            undefined,
            { sessionToken: "session-token" }
        )).resolves.toMatchObject({
            mode: "fallback",
            disclaimer: "preview_only",
        });
    });

    it("lets the route decide quota and emits the Credits event only for a quota rejection", async () => {
        const events = installWindowEventRecorder();
        const fetchMock = vi.fn(async () => new Response(JSON.stringify({
            error: "نفدت الحصة",
            code: "quota_exceeded",
            canPurchase: true,
            freeRemaining: 0,
            paidBalance: 0,
            guest: false,
        }), {
            status: 403,
            headers: { "content-type": "application/json" },
        }));
        vi.stubGlobal("fetch", fetchMock);

        await expect(generateMockup(
            "تيشيرت",
            "أسود",
            "صقر هندسي",
            "DTF",
            "هندسي",
            "ذهبي",
            undefined,
            undefined,
            undefined,
            { sessionToken: "session-token" }
        )).rejects.toMatchObject({
            data: expect.objectContaining({ code: "quota_exceeded" }),
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(events).toContainEqual({
            type: QUOTA_EXCEEDED_EVENT,
            detail: {
                reason: "exhausted",
                canPurchase: true,
                freeRemaining: 0,
                paidBalance: 0,
                guest: false,
            },
        });
    });

    it("returns a no-charge board and never emits the Credits-exhausted event", async () => {
        const events = installWindowEventRecorder();
        vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
            ok: true,
            mode: "fallback",
            boardImageUrl: "https://cdn.example/board-preview.webp",
            boardRequestId: "77777777-7777-4777-8777-777777777777",
            disclaimer: "preview_only",
            quotaCharged: false,
            freeRemaining: null,
            paidBalance: null,
            guest: false,
        }), {
            status: 200,
            headers: { "content-type": "application/json" },
        })));

        await expect(generateMockup(
            "تيشيرت",
            "أسود",
            "صقر هندسي",
            "DTF",
            "هندسي",
            "ذهبي",
            undefined,
            undefined,
            undefined,
            { sessionToken: "session-token" }
        )).resolves.toMatchObject({
            mode: "fallback",
            quotaCharged: false,
        });

        expect(events.some((event) => event.type === QUOTA_EXCEEDED_EVENT)).toBe(false);
        expect(events.some((event) => event.type === QUOTA_CHANGED_EVENT)).toBe(true);
    });
});
