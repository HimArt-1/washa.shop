import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
    getCurrentUser: vi.fn(),
    resolveAdminAccess: vi.fn(),
    checkRateLimit: vi.fn(),
    releaseRateLimit: vi.fn(),
    canUseV4: vi.fn(),
    resolveProvider: vi.fn(),
    resolveApiKey: vi.fn(),
    buildPrompt: vi.fn(),
    generateImage: vi.fn(),
    decodeImage: vi.fn(),
    uploadImage: vi.fn(),
    getSupabase: vi.fn(),
    verifyBoardText: vi.fn(),
}));

vi.mock("@/lib/admin-access", () => ({
    getCurrentUserOrDevAdmin: mocks.getCurrentUser,
    resolveAdminAccess: mocks.resolveAdminAccess,
}));
vi.mock("@/lib/rate-limit", () => ({
    checkRateLimit: mocks.checkRateLimit,
    releaseRateLimit: mocks.releaseRateLimit,
}));
vi.mock("@/lib/washa-ai-v4-access", () => ({ canUseWashaAiV4: mocks.canUseV4 }));
vi.mock("@/lib/washa-ai-v4-provider", () => ({
    resolveWashaAiV4ProviderConfiguration: mocks.resolveProvider,
    resolveWashaAiV4ApiKey: mocks.resolveApiKey,
}));
vi.mock("@/lib/premium-design-request-prompt", () => ({
    buildPremiumDesignRequestPrompt: mocks.buildPrompt,
}));
vi.mock("@/app/api/washa-dtf-studio/services/board-image-provider.adapter", () => ({
    generateBoardProviderImage: mocks.generateImage,
    decodeBoardImageDataUrl: mocks.decodeImage,
}));
vi.mock("@/lib/storage/upload-optimized-image", () => ({
    uploadOptimizedImage: mocks.uploadImage,
}));
vi.mock("@/lib/supabase", () => ({ getSupabaseAdminClient: mocks.getSupabase }));
vi.mock("@/lib/washa-artwork/arabic-text-verification", () => ({
    isArtworkTextPolicyError: (value: unknown) => (
        value instanceof Error
        && "code" in value
        && value.code === "ARTWORK_TEXT_POLICY_FAILED"
    ),
}));
vi.mock("@/lib/washa-ai-v4-board-text-verification", () => ({
    verifyPremiumBoardArtworkTextPolicy: mocks.verifyBoardText,
}));
vi.mock("@/lib/washa-artwork/verification-error", () => ({
    isArtworkVerificationUnavailableError: (value: unknown) => (
        value instanceof Error
        && "code" in value
        && value.code === "ARTWORK_VERIFICATION_UNAVAILABLE"
    ),
}));
vi.mock("@/lib/washa-dtf-provider-config", () => ({
    sanitizeWashaDtfProviderMessage: (value: unknown) => String(value),
}));

import { createPremiumDesignBriefDefaults } from "@/lib/premium-design-request";
import { POST } from "@/app/api/washa-ai-v4/generate/route";

const validPayload = {
    requestId: "v4_request_20260722",
    brief: {
        ...createPremiumDesignBriefDefaults({ printPosition: "front", printSize: "large" }),
        designIdea: "صقر هندسي يعبر سماء هادئة بخطوط دقيقة",
        mainSubject: "صقر هندسي",
        detailOne: "العين والريش",
        detailTwo: "الخطوط عند الجناح",
    },
    garmentName: "Premium oversized box-fit t-shirt",
    garmentColorName: "Washed Black",
    garmentColorHex: "#1C1C1A",
    printPosition: "front",
    styleName: "Modern Saudi streetwear",
    artStyleName: "Technical ink illustration",
    artworkColors: [{ name: "Bone", hex: "#E7DFC9" }],
};

const VALID_PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64"
);

function request(body: unknown) {
    return new NextRequest("http://localhost/api/washa-ai-v4/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}

describe("WASHA AI v4 generation route", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getCurrentUser.mockResolvedValue({ id: "clerk-user" });
        mocks.resolveAdminAccess.mockResolvedValue({
            isAdmin: false,
            profile: { id: "11111111-1111-4111-8111-111111111111" },
        });
        mocks.canUseV4.mockResolvedValue(true);
        mocks.checkRateLimit.mockResolvedValue({ success: true, remaining: 3, resetAt: Date.now() + 60_000 });
        mocks.resolveProvider.mockReturnValue({
            configuredProvider: "genai",
            provider: "genai",
            model: "gemini-v4-board",
            credentialConfigured: true,
            fallbackEnabled: false,
        });
        mocks.resolveApiKey.mockReturnValue("v4-dedicated-key");
        mocks.buildPrompt.mockReturnValue("fixed v4 prompt");
        mocks.generateImage.mockResolvedValue({
            dataUrl: "data:image/webp;base64,UklGRgQAAABXRUJQ",
            provider: "genai",
            model: "gemini-v4-board",
        });
        mocks.decodeImage.mockReturnValue({
            buffer: VALID_PNG,
            contentType: "image/png",
        });
        mocks.verifyBoardText.mockResolvedValue({
            required: true,
            verified: true,
            mode: "forbidden",
            observedArtworkText: null,
            provider: "genai",
            model: "gemini-verifier",
        });
        mocks.getSupabase.mockReturnValue({ storage: {} });
        mocks.uploadImage.mockResolvedValue({
            publicUrl: "https://cdn.example/washa-ai-v4/board.webp",
            width: 3200,
            height: 4000,
        });
    });

    it("runs one direct board generation without extraction or recomposition", async () => {
        const response = await POST(request(validPayload));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toMatchObject({
            ok: true,
            imageUrl: "https://cdn.example/washa-ai-v4/board.webp",
            width: 3200,
            height: 4000,
        });
        expect(mocks.buildPrompt).toHaveBeenCalledOnce();
        expect(mocks.generateImage).toHaveBeenCalledOnce();
        expect(mocks.generateImage).toHaveBeenCalledWith(expect.objectContaining({
            genAiApiKey: "v4-dedicated-key",
        }));
        expect(mocks.verifyBoardText).toHaveBeenCalledWith({
            boardPng: expect.any(Buffer),
            expectedTexts: ["", ""],
            sourceModel: "gemini-v4-board",
            apiKey: "v4-dedicated-key",
        });
        expect(mocks.verifyBoardText.mock.invocationCallOrder[0])
            .toBeLessThan(mocks.uploadImage.mock.invocationCallOrder[0]);
        expect(mocks.uploadImage).toHaveBeenCalledWith(expect.objectContaining({
            profile: "board",
            uploadOriginal: false,
        }));
    });

    it("requires authentication before consuming provider capacity", async () => {
        mocks.getCurrentUser.mockResolvedValue(null);

        const response = await POST(request(validPayload));

        expect(response.status).toBe(401);
        expect(mocks.generateImage).not.toHaveBeenCalled();
    });

    it("blocks generation when the independent V4 switch is disabled", async () => {
        mocks.canUseV4.mockResolvedValue(false);

        const response = await POST(request(validPayload));

        expect(response.status).toBe(404);
        expect(mocks.checkRateLimit).not.toHaveBeenCalled();
    });

    it("returns a validation error before rate limiting for impossible placement dimensions", async () => {
        const response = await POST(request({
            ...validPayload,
            printPosition: "left_chest",
            brief: { ...validPayload.brief, designWidth: 40, designHeight: 27 },
        }));

        expect(response.status).toBe(400);
        expect(mocks.checkRateLimit).not.toHaveBeenCalled();
        expect(mocks.generateImage).not.toHaveBeenCalled();
    });

    it("does not refund the limiter after a paid provider call when storage fails", async () => {
        mocks.uploadImage.mockRejectedValue(new Error("storage unavailable"));

        const response = await POST(request(validPayload));

        expect(response.status).toBe(502);
        expect(mocks.generateImage).toHaveBeenCalledOnce();
        expect(mocks.releaseRateLimit).not.toHaveBeenCalled();
    });

    it("rejects a generated board with unrequested artwork text before storage", async () => {
        mocks.verifyBoardText.mockRejectedValue(Object.assign(
            new Error("Generated board artwork contains unexpected visible text."),
            { code: "ARTWORK_TEXT_POLICY_FAILED" }
        ));

        const response = await POST(request(validPayload));
        const body = await response.json();

        expect(response.status).toBe(502);
        expect(body).toMatchObject({
            ok: false,
            code: "V4_ARTWORK_TEXT_POLICY_FAILED",
        });
        expect(mocks.generateImage).toHaveBeenCalledOnce();
        expect(mocks.uploadImage).not.toHaveBeenCalled();
        expect(mocks.releaseRateLimit).not.toHaveBeenCalled();
    });

    it("fails closed when artwork text verification is unavailable", async () => {
        mocks.verifyBoardText.mockRejectedValue(Object.assign(
            new Error("verification unavailable"),
            { code: "ARTWORK_VERIFICATION_UNAVAILABLE" }
        ));

        const response = await POST(request(validPayload));
        const body = await response.json();

        expect(response.status).toBe(503);
        expect(body).toMatchObject({
            ok: false,
            code: "V4_TEXT_VERIFICATION_UNAVAILABLE",
        });
        expect(mocks.uploadImage).not.toHaveBeenCalled();
    });
});
