import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BoardPreviewDisclosure from "../../washa-dtf-studio/src/components/BoardPreviewDisclosure";
import StepResult from "../../washa-dtf-studio/src/components/steps/StepResult";
import {
    resolveGenerationPresentation,
} from "../../washa-dtf-studio/src/lib/generationPresentation";

const designContext = vi.hoisted(() => ({
    current: {} as Record<string, unknown>,
}));

vi.mock("../../washa-dtf-studio/src/context/DesignContext", () => ({
    useDesign: () => designContext.current,
}));
vi.mock("motion/react", () => ({
    AnimatePresence: ({ children }: { children?: unknown }) => children,
    motion: {
        div: "div",
        img: "img",
    },
}));
vi.mock("../../washa-dtf-studio/node_modules/motion/dist/es/react.mjs", () => ({
    AnimatePresence: ({ children }: { children?: unknown }) => children,
    motion: {
        div: "div",
        img: "img",
    },
}));

const primaryResult = {
    imageUrl: "https://cdn.example/mockup.webp",
    previewUrl: "https://cdn.example/mockup.webp",
    frontPreviewUrl: "https://cdn.example/mockup.webp",
    backPreviewUrl: null,
    designRequestId: "11111111-1111-4111-8111-111111111111",
    masterAssetId: "22222222-2222-4222-8222-222222222222",
    masterAssetUrl: "https://cdn.example/master.png",
    masterChecksum: "a".repeat(64),
    mockupSourceType: "reference" as const,
    placement: {
        side: "front" as const,
        x: 0.5,
        y: 0.5,
        scale: 1,
        rotation: 0,
        printWidthCm: 30,
        printHeightCm: 40,
        anchorX: 0.5,
        anchorY: 0.5,
        referenceMockupId: null,
        printAreaId: "front_default",
        transformVersion: 1,
    },
    transparencyVerificationStatus: "verified" as const,
    productionReadinessStatus: "ready" as const,
};

const boardResult = {
    mode: "fallback" as const,
    boardImageUrl: "https://cdn.example/board-preview.webp",
    boardRequestId: "77777777-7777-4777-8777-777777777777",
    disclaimer: "preview_only" as const,
    quotaCharged: false,
};

function makeDesignContext(result: typeof primaryResult | typeof boardResult) {
    const board = "mode" in result;
    return {
        mockupImage: board ? result.boardImageUrl : result.previewUrl,
        mockupState: null,
        isMockupCurrent: true,
        isGenerating: false,
        error: null,
        handleDownload: vi.fn(),
        setStep: vi.fn(),
        resetDesign: vi.fn(),
        isSubmittingOrder: false,
        orderResult: null,
        submitOrder: vi.fn(async () => true),
        handleGenerate: vi.fn(async () => undefined),
        state: {
            garmentType: "تيشيرت",
            garmentColor: "أسود",
            garmentColorHex: "#111111",
            garmentSize: "L",
            printPositionLabel: "الصدر",
            designPosition: "chest_large",
            style: "هندسي",
            technique: "DTF",
            palette: "ذهبي",
            designMethod: "text",
            calligraphyText: "",
            prompt: "صقر هندسي",
            removeBackground: true,
            avoidHardEdges: true,
        },
        generationResult: result,
        isBoardPreview: board,
        generationDisclaimer: board ? "preview_only" : null,
        structuredGenerationError: null,
        isGenerationRetryBlocked: false,
        showToast: vi.fn(),
    };
}

describe("board fallback presentation", () => {
    beforeEach(() => {
        designContext.current = makeDesignContext(primaryResult);
    });

    it("actually renders the fixed Arabic disclosure for a board preview", () => {
        const html = renderToStaticMarkup(createElement(BoardPreviewDisclosure, {
            visible: true,
        }));

        expect(html).toContain("role=\"status\"");
        expect(html).toContain(
            "⚠️ معاينة مبدئية — المقاسات والتفاصيل النهائية يؤكدها موظف خدمة العملاء بعد الطلب."
        );
    });

    it("renders no disclosure markup for primary generation", () => {
        expect(renderToStaticMarkup(createElement(BoardPreviewDisclosure, {
            visible: false,
        }))).toBe("");
    });

    it("disables final-production actions only for board previews", () => {
        expect(resolveGenerationPresentation(boardResult)).toEqual({
            isBoardPreview: true,
            resultLabel: "معاينة مبدئية",
            canRecompose: false,
            canExtract: false,
            canSubmitOrder: false,
            canDownloadPrintFile: false,
            previewDownloadName: "washa-board-preview.webp",
        });
        expect(resolveGenerationPresentation(primaryResult)).toEqual({
            isBoardPreview: false,
            resultLabel: "النتيجة النهائية",
            canRecompose: true,
            canExtract: true,
            canSubmitOrder: true,
            canDownloadPrintFile: true,
            previewDownloadName: "washa-mockup.png",
        });
    });

    it("renders StepResult as preview-only for board and preserves primary actions", () => {
        designContext.current = {
            ...makeDesignContext(boardResult),
            generationDisclaimer: null,
        };
        const boardHtmlFromMode = renderToStaticMarkup(createElement(StepResult));

        expect(boardHtmlFromMode).toContain("معاينة مبدئية");
        expect(boardHtmlFromMode).toContain(
            "⚠️ معاينة مبدئية — المقاسات والتفاصيل النهائية يؤكدها موظف خدمة العملاء بعد الطلب."
        );
        expect(boardHtmlFromMode).toContain("تحميل المعاينة");
        expect(boardHtmlFromMode).not.toContain("اعتماد وإضافة إلى السلة");
        expect(boardHtmlFromMode).not.toContain("يُستخدم نفس ملف التصميم المعتمد في المعاينة والطباعة");

        designContext.current = {
            ...makeDesignContext(boardResult),
            isBoardPreview: false,
        };
        const boardHtmlFromDisclaimer = renderToStaticMarkup(createElement(StepResult));
        expect(boardHtmlFromDisclaimer).toContain(
            "⚠️ معاينة مبدئية — المقاسات والتفاصيل النهائية يؤكدها موظف خدمة العملاء بعد الطلب."
        );

        designContext.current = makeDesignContext(primaryResult);
        const primaryHtml = renderToStaticMarkup(createElement(StepResult));

        expect(primaryHtml).toContain("النتيجة النهائية");
        expect(primaryHtml).toContain("اعتماد وإضافة إلى السلة");
        expect(primaryHtml).toContain("يُستخدم نفس ملف التصميم المعتمد في المعاينة والطباعة");
        expect(primaryHtml).not.toContain(
            "⚠️ معاينة مبدئية — المقاسات والتفاصيل النهائية يؤكدها موظف خدمة العملاء بعد الطلب."
        );
    });
});
