// @vitest-environment jsdom

import {
    act,
    createElement,
    type ReactNode,
    useEffect,
} from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    CreditsProvider,
    useCredits,
} from "../../washa-dtf-studio/src/context/CreditsContext";
import {
    DesignProvider,
    useDesign,
} from "../../washa-dtf-studio/src/context/DesignContext";
import { QUOTA_EXCEEDED_EVENT } from "../../washa-dtf-studio/src/services/geminiService";
import { FALLBACK_DTF_CONFIG } from "../../washa-dtf-studio/src/types";

const seams = vi.hoisted(() => ({
    fetchConfig: vi.fn(),
    fetchQuotaStatus: vi.fn(),
    generateMockup: vi.fn(),
    getToken: vi.fn(async () => "session-token"),
    validateGeneratedImage: vi.fn(),
}));

vi.mock("@clerk/clerk-react", () => ({
    useAuth: () => ({
        getToken: seams.getToken,
        isLoaded: true,
        isSignedIn: true,
    }),
}));
vi.mock("../../washa-dtf-studio/node_modules/@clerk/clerk-react/dist/index.mjs", () => ({
    useAuth: () => ({
        getToken: seams.getToken,
        isLoaded: true,
        isSignedIn: true,
    }),
}));
vi.mock("../../washa-dtf-studio/src/services/configService", () => ({
    fetchDtfStudioConfig: seams.fetchConfig,
}));
vi.mock("../../washa-dtf-studio/src/services/creditsService", async (importOriginal) => ({
    ...await importOriginal<typeof import("../../washa-dtf-studio/src/services/creditsService")>(),
    fetchQuotaStatus: seams.fetchQuotaStatus,
}));
vi.mock("../../washa-dtf-studio/src/services/geminiService", async (importOriginal) => ({
    ...await importOriginal<typeof import("../../washa-dtf-studio/src/services/geminiService")>(),
    generateMockup: seams.generateMockup,
}));
vi.mock("../../washa-dtf-studio/src/lib/generationExperience", async (importOriginal) => ({
    ...await importOriginal<typeof import("../../washa-dtf-studio/src/lib/generationExperience")>(),
    validateGeneratedImage: seams.validateGeneratedImage,
}));

function CreditsProbe() {
    const { purchaseOpen, noticeReason } = useCredits();
    return createElement(
        "output",
        { "data-testid": "credits-state" },
        `${purchaseOpen ? "open" : "closed"}:${noticeReason ?? "none"}`,
    );
}

function TestTree({ children }: { children?: ReactNode }) {
    return createElement(CreditsProvider, null, children);
}

let latestCredits: ReturnType<typeof useCredits> | null = null;
let latestDesign: ReturnType<typeof useDesign> | null = null;

function GenerationProbe() {
    const credits = useCredits();
    const design = useDesign();
    useEffect(() => {
        latestCredits = credits;
        latestDesign = design;
    }, [credits, design]);
    return createElement(
        "output",
        null,
        `${credits.purchaseOpen ? "open" : "closed"}:${design.mockupImage ?? "empty"}`,
    );
}

describe("board fallback Credits integration", () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
        const storage = new Map<string, string>();
        Object.defineProperty(window, "localStorage", {
            configurable: true,
            value: {
                clear: () => storage.clear(),
                getItem: (key: string) => storage.get(key) ?? null,
                key: (index: number) => [...storage.keys()][index] ?? null,
                removeItem: (key: string) => storage.delete(key),
                setItem: (key: string, value: string) => storage.set(key, value),
                get length() {
                    return storage.size;
                },
            },
        });
        latestCredits = null;
        latestDesign = null;
        seams.fetchConfig.mockResolvedValue(FALLBACK_DTF_CONFIG);
        seams.fetchQuotaStatus.mockResolvedValue({
            audience: "subscriber",
            guest: false,
            unlimited: false,
            blocked: false,
            freeLimit: 10,
            freeUsed: 10,
            freeRemaining: 0,
            paidBalance: 0,
            canPurchase: true,
        });
        seams.generateMockup.mockResolvedValue({
            mode: "fallback",
            boardImageUrl: "https://cdn.example/board-preview.webp",
            boardRequestId: "77777777-7777-4777-8777-777777777777",
            disclaimer: "preview_only",
            quotaCharged: false,
        });
        seams.validateGeneratedImage.mockResolvedValue({ valid: true });
        container = document.createElement("div");
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(async () => {
        await act(async () => root.unmount());
        container.remove();
        vi.restoreAllMocks();
    });

    it("opens the Credits state when the route rejects generation for exhausted quota", async () => {
        await act(async () => {
            root.render(createElement(TestTree, null, createElement(CreditsProbe)));
        });
        expect(container.textContent).toBe("closed:none");

        await act(async () => {
            window.dispatchEvent(new CustomEvent(QUOTA_EXCEEDED_EVENT, {
                detail: {
                    reason: "exhausted",
                    canPurchase: true,
                    paidBalance: 0,
                    guest: false,
                },
            }));
        });

        expect(container.textContent).toBe("open:exhausted");
    });

    it("still calls generation from DesignContext when the local Credits state is exhausted", async () => {
        await act(async () => {
            root.render(createElement(
                CreditsProvider,
                null,
                createElement(DesignProvider, null, createElement(GenerationProbe)),
            ));
        });
        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(latestCredits?.status).toMatchObject({
            freeRemaining: 0,
            paidBalance: 0,
        });

        await act(async () => {
            latestDesign?.updateState({
                garmentId: "garment-tshirt",
                garmentType: "تي شيرت",
                garmentColorId: "color-black",
                garmentColor: "أسود",
                garmentSizeId: "size-s",
                garmentSize: "S",
                styleId: FALLBACK_DTF_CONFIG.styles[0]?.id ?? null,
                style: FALLBACK_DTF_CONFIG.styles[0]?.name ?? "هندسي",
                techniqueId: FALLBACK_DTF_CONFIG.techniques[0]?.id ?? null,
                technique: FALLBACK_DTF_CONFIG.techniques[0]?.name ?? "DTF",
                paletteId: FALLBACK_DTF_CONFIG.palettes[0]?.id ?? null,
                palette: FALLBACK_DTF_CONFIG.palettes[0]?.name ?? "ذهبي",
                prompt: "صقر هندسي",
            });
        });
        expect(latestDesign?.state).toMatchObject({
            garmentType: "تي شيرت",
            garmentColor: "أسود",
            garmentSize: "S",
            prompt: "صقر هندسي",
        });
        await act(async () => {
            await latestDesign?.handleGenerate();
        });

        expect(seams.generateMockup).toHaveBeenCalledTimes(1);
        expect(latestDesign?.mockupImage).toBe("https://cdn.example/board-preview.webp");
        expect(latestDesign?.isBoardPreview).toBe(true);
    });
});
