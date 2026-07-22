import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
    default: (props: Record<string, unknown>) => createElement("img", props),
}));

import { BoardRequestCard } from "@/app/(protected)/dashboard/board-requests/BoardRequestCard";
import type { BoardRequestAdminRow } from "@/app/actions/board-requests";

const baseRow: BoardRequestAdminRow = {
    id: "77777777-7777-4777-8777-777777777777",
    generationRequestId: "request-1",
    prompt: "تصميم صقر عربي",
    generationContext: {
        garmentType: "تيشيرت",
        garmentColor: "أسود",
        printPosition: "chest",
        printSize: "large",
    },
    boardImageUrl: "https://cdn.example/board.webp",
    provider: "genai",
    generationModel: "gemini-board",
    status: "ready",
    manualPrintStatus: "pending",
    createdAt: "2026-07-22T08:00:00.000Z",
    updatedAt: "2026-07-22T08:00:00.000Z",
    customer: {
        displayName: "عميل",
        username: "customer",
        email: "customer@example.com",
        phone: "+966500000000",
    },
};

describe("board requests admin rendering", () => {
    it("renders a ready WebP preview and manual print controls", () => {
        const html = renderToStaticMarkup(createElement(BoardRequestCard, {
            row: baseRow,
            onStatusChange: vi.fn(),
            isPending: false,
        }));

        expect(html).toContain("https://cdn.example/board.webp");
        expect(html).toContain("معاينة فقط");
        expect(html).toContain("قيد التنفيذ");
        expect(html).toContain("مكتمل");
        expect(html).toContain("generationContext الكامل");
    });

    it("renders failed requests diagnostically without image or mutation controls", () => {
        const html = renderToStaticMarkup(createElement(BoardRequestCard, {
            row: {
                ...baseRow,
                status: "failed",
                boardImageUrl: null,
                customer: null,
            },
            onStatusChange: vi.fn(),
            isPending: false,
        }));

        expect(html).toContain("فشل التوليد");
        expect(html).toContain("لم تُنتج لوحة");
        expect(html).toContain("سبب الفشل غير محفوظ في هذا الإصدار");
        expect(html).not.toContain("قيد التنفيذ");
        expect(html).not.toContain("مكتمل");
        expect(html).not.toContain("<img");
    });

    it("actually escapes customer-controlled HTML and blocks javascript/data image URLs", () => {
        for (const unsafeUrl of [
            "javascript:alert(document.domain)",
            "data:image/svg+xml,<svg onload=alert(1)></svg>",
        ]) {
            const html = renderToStaticMarkup(createElement(BoardRequestCard, {
                row: {
                    ...baseRow,
                    prompt: `<img src=x onerror="alert('prompt')">${"ط".repeat(300)}`,
                    generationContext: {
                        garmentType: "<script>alert('context')</script>",
                        customerDescription: "<svg/onload=alert('context')>",
                    },
                    boardImageUrl: unsafeUrl,
                    customer: {
                        ...baseRow.customer!,
                        displayName: "<script>alert('customer')</script>",
                    },
                },
                onStatusChange: vi.fn(),
                isPending: false,
            }));

            expect(html).toContain("&lt;script&gt;alert(&#x27;customer&#x27;)&lt;/script&gt;");
            expect(html).toContain("&lt;script&gt;alert(&#x27;context&#x27;)&lt;/script&gt;");
            expect(html).not.toContain("<script>");
            expect(html).not.toContain("<img src=x");
            expect(html).not.toContain("<svg/onload");
            expect(html).not.toContain("javascript:");
            expect(html).not.toContain("data:image");
            expect(html).not.toContain("<img");
            expect(html).toContain("…");
            expect(html).toContain("رابط اللوحة غير صالح");
        }
    });

    it("accepts only http and https board links", () => {
        for (const url of [
            "http://localhost:54321/storage/v1/object/public/board.webp",
            "https://cdn.example/board.webp",
        ]) {
            const html = renderToStaticMarkup(createElement(BoardRequestCard, {
                row: { ...baseRow, boardImageUrl: url },
                onStatusChange: vi.fn(),
                isPending: false,
            }));
            expect(html).toContain(url.replace(/&/g, "&amp;"));
            expect(html).toContain("<img");
        }
    });
});
