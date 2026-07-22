// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const seams = vi.hoisted(() => ({
    refresh: vi.fn(),
    updateStatus: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ refresh: seams.refresh }),
}));
vi.mock("@/app/actions/board-requests", () => ({
    updateBoardManualPrintStatus: seams.updateStatus,
}));

import { BoardRequestsClient } from "@/app/(protected)/dashboard/board-requests/BoardRequestsClient";

const row = {
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
    status: "ready" as const,
    manualPrintStatus: "pending" as const,
    createdAt: "2026-07-22T08:00:00.000Z",
    updatedAt: "2026-07-22T08:00:00.000Z",
    customer: null,
};

function findButton(container: HTMLElement, label: string) {
    const button = [...container.querySelectorAll("button")]
        .find((candidate) => candidate.textContent === label);
    if (!button) throw new Error(`Button not found: ${label}`);
    return button as HTMLButtonElement;
}

describe("board requests client updates", () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(async () => {
        Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
        seams.refresh.mockReset();
        seams.updateStatus.mockReset();
        seams.updateStatus.mockResolvedValue({ success: true });
        container = document.createElement("div");
        document.body.appendChild(container);
        root = createRoot(container);
        await act(async () => {
            root.render(createElement(BoardRequestsClient, {
                rows: [row],
                status: "ready",
                manualPrintStatus: "pending",
            }));
        });
    });

    afterEach(async () => {
        await act(async () => root.unmount());
        container.remove();
    });

    it("submits the chosen manual status and refreshes only after server success", async () => {
        expect(container.querySelector('a[aria-current="page"]')?.textContent)
            .toContain("الجاهزة");
        expect(container.querySelector('[aria-label="فلترة حالة التركيب اليدوي"]'))
            .not.toBeNull();

        await act(async () => findButton(container, "قيد التنفيذ").click());

        expect(seams.updateStatus).toHaveBeenCalledWith({
            boardRequestId: row.id,
            manualPrintStatus: "in_progress",
        });
        expect(seams.refresh).toHaveBeenCalledOnce();
    });

    it("keeps the rendered status and reports an action failure without refresh", async () => {
        seams.updateStatus.mockResolvedValue({
            success: false,
            error: "تعذّر تحديث حالة طلب اللوحة.",
        });

        await act(async () => findButton(container, "مكتمل").click());

        expect(seams.refresh).not.toHaveBeenCalled();
        expect(container.querySelector('[role="alert"]')?.textContent)
            .toContain("تعذّر تحديث حالة طلب اللوحة.");
        expect(findButton(container, "بانتظار التنفيذ").disabled).toBe(true);
    });

    it("submits pending from another current state with the exact enum", async () => {
        await act(async () => {
            root.render(createElement(BoardRequestsClient, {
                rows: [{ ...row, manualPrintStatus: "in_progress" }],
                status: "ready",
                manualPrintStatus: "all",
            }));
        });

        await act(async () => findButton(container, "بانتظار التنفيذ").click());

        expect(seams.updateStatus).toHaveBeenCalledWith({
            boardRequestId: row.id,
            manualPrintStatus: "pending",
        });
    });

    it("renders the failed tab without manual filters or mutation buttons", async () => {
        await act(async () => {
            root.render(createElement(BoardRequestsClient, {
                rows: [{
                    ...row,
                    status: "failed",
                    boardImageUrl: null,
                }],
                status: "failed",
                manualPrintStatus: "pending",
            }));
        });

        expect(container.querySelector('a[aria-current="page"]')?.textContent)
            .toContain("الفاشلة");
        expect(container.querySelector('[aria-label="فلترة حالة التركيب اليدوي"]'))
            .toBeNull();
        expect([...container.querySelectorAll("button")]).toHaveLength(0);
        expect(container.textContent).toContain("فشل التوليد");
    });
});
