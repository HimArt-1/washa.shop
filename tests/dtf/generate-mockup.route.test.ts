import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const {
    mockRequireDtfRouteAccess,
    mockClaimDtfGenerationRequest,
    mockCompleteDtfGenerationRequest,
    mockFailDtfGenerationRequest,
    mockEnforceDtfRouteRateLimit,
    mockParseAndValidateDtfJson,
    mockGenerateMockup,
    mockGetExistingGeneration,
    mockHasPersistedGenerationAttempt,
    mockReserveDailyQuota,
    mockLogActivity,
    mockReleaseDailyQuota,
    mockGetWashaDtfErrorDetails,
    mockGetRequestClientIdentifier,
    mockGetGenerationReadiness,
    mockRecordGenerationFailure,
    mockRecordGenerationSuccess,
    mockGetArtworkProviderReadiness,
    mockLogDtfTrace,
    mockGetGenerationMode,
    mockShouldChargeQuota,
    mockGetQuotaStatus,
    mockGenerateBoard,
    mockNotifyBoardRequestReady,
    mockCanUseWashaAiDevSurfaceForGeneration,
} = vi.hoisted(() => ({
    mockRequireDtfRouteAccess: vi.fn(),
    mockClaimDtfGenerationRequest: vi.fn(),
    mockCompleteDtfGenerationRequest: vi.fn(),
    mockFailDtfGenerationRequest: vi.fn(),
    mockEnforceDtfRouteRateLimit: vi.fn(),
    mockParseAndValidateDtfJson: vi.fn(),
    mockGenerateMockup: vi.fn(),
    mockGetExistingGeneration: vi.fn(),
    mockHasPersistedGenerationAttempt: vi.fn(),
    mockReserveDailyQuota: vi.fn(),
    mockLogActivity: vi.fn(),
    mockReleaseDailyQuota: vi.fn(),
    mockGetWashaDtfErrorDetails: vi.fn(),
    mockGetRequestClientIdentifier: vi.fn(),
    mockGetGenerationReadiness: vi.fn(),
    mockRecordGenerationFailure: vi.fn(),
    mockRecordGenerationSuccess: vi.fn(),
    mockGetArtworkProviderReadiness: vi.fn(),
    mockLogDtfTrace: vi.fn(),
    mockGetGenerationMode: vi.fn(),
    mockShouldChargeQuota: vi.fn(),
    mockGetQuotaStatus: vi.fn(),
    mockGenerateBoard: vi.fn(),
    mockNotifyBoardRequestReady: vi.fn(),
    mockCanUseWashaAiDevSurfaceForGeneration: vi.fn(),
}));

vi.mock("@/app/api/washa-dtf-studio/utils/route-runtime", async (importOriginal) => ({
    ...await importOriginal<typeof import("@/app/api/washa-dtf-studio/utils/route-runtime")>(),
    requireDtfRouteAccess: mockRequireDtfRouteAccess,
    claimDtfGenerationRequest: mockClaimDtfGenerationRequest,
    completeDtfGenerationRequest: mockCompleteDtfGenerationRequest,
    failDtfGenerationRequest: mockFailDtfGenerationRequest,
    enforceDtfRouteRateLimit: mockEnforceDtfRouteRateLimit,
    parseAndValidateDtfJson: mockParseAndValidateDtfJson,
}));

vi.mock("@/app/api/washa-dtf-studio/services/design-asset.service", () => ({
    DesignAssetService: {
        generate: mockGenerateMockup,
        getExistingGeneration: mockGetExistingGeneration,
        hasPersistedGenerationAttempt: mockHasPersistedGenerationAttempt,
    },
}));

vi.mock("@/lib/washa-artwork/provider", () => ({
    getIsolatedArtworkProviderReadiness: mockGetArtworkProviderReadiness,
}));

vi.mock("@/app/api/washa-dtf-studio/services/dtf-telemetry.service", () => ({
    DtfTelemetryService: {
        reserveDailyQuota: mockReserveDailyQuota,
        getQuotaStatus: mockGetQuotaStatus,
        logActivity: mockLogActivity,
        releaseDailyQuota: mockReleaseDailyQuota,
    },
}));

vi.mock("@/lib/washa-generation-mode", async (importOriginal) => ({
    ...await importOriginal<typeof import("@/lib/washa-generation-mode")>(),
    getGenerationMode: mockGetGenerationMode,
    shouldChargeQuota: mockShouldChargeQuota,
}));

vi.mock("@/app/api/washa-dtf-studio/services/board-generation.service", () => ({
    generateBoard: mockGenerateBoard,
}));

vi.mock("@/lib/board-request-telegram", () => ({
    notifyBoardRequestReady: mockNotifyBoardRequestReady,
}));

vi.mock("@/lib/washa-ai-dev-access", async (importOriginal) => ({
    ...await importOriginal<typeof import("@/lib/washa-ai-dev-access")>(),
    canUseWashaAiDevSurfaceForGeneration: mockCanUseWashaAiDevSurfaceForGeneration,
}));

vi.mock("@/lib/washa-dtf-studio", () => ({
    getWashaDtfErrorDetails: mockGetWashaDtfErrorDetails,
}));

vi.mock("@/lib/request-client", () => ({
    getRequestClientIdentifier: mockGetRequestClientIdentifier,
}));

vi.mock("@/lib/washa-dtf-generation-readiness", () => ({
    getWashaDtfGenerationReadiness: mockGetGenerationReadiness,
    recordWashaDtfGenerationFailure: mockRecordGenerationFailure,
    recordWashaDtfGenerationSuccess: mockRecordGenerationSuccess,
}));

vi.mock("@/app/api/washa-dtf-studio/utils/trace", async (importOriginal) => ({
    ...await importOriginal<typeof import("@/app/api/washa-dtf-studio/utils/trace")>(),
    logDtfTrace: mockLogDtfTrace,
}));

import { POST } from "@/app/api/washa-dtf-studio/generate-mockup/route";
import { WashaDtfProviderChainError } from "@/lib/washa-dtf-provider-config";
import { ArtworkTextPolicyError } from "@/lib/washa-artwork/arabic-text-verification";
import { ArtworkPrintValidationError } from "@/lib/washa-artwork/normalization";
import { ArtworkPlacementError } from "@/lib/washa-artwork/placement";
import { createWashaAiDevGenerationHeaders } from "@/lib/washa-ai-dev-access";

function generationResult(preview = "https://cdn.example/mockup-front.webp") {
    return {
        imageUrl: preview,
        previewUrl: preview,
        frontPreviewUrl: preview,
        backPreviewUrl: null,
        designRequestId: "11111111-1111-4111-8111-111111111111",
        masterAssetId: "22222222-2222-4222-8222-222222222222",
        masterAssetUrl: "https://cdn.example/design-master.png",
        masterChecksum: "a".repeat(64),
        mockupSourceType: "reference",
        placement: {
            side: "front",
            x: 0.5,
            y: 0.5,
            scale: 1,
            rotation: 0,
            printWidthCm: 30,
            printHeightCm: 40,
            anchorX: 0.5,
            anchorY: 0.5,
            referenceMockupId: "33333333-3333-4333-8333-333333333333",
            printAreaId: "front_default",
            transformVersion: 1,
        },
        transparencyVerificationStatus: "verified",
        productionReadinessStatus: "ready",
        provider: "genai",
        model: "gemini-3-pro-image",
    };
}

describe("generate-mockup route", () => {
    beforeEach(() => {
        vi.stubEnv("WASHA_AI_DEV_SURFACE_SECRET", "test-dev-surface-secret");
        mockRequireDtfRouteAccess.mockReset();
        mockClaimDtfGenerationRequest.mockReset();
        mockCompleteDtfGenerationRequest.mockReset();
        mockFailDtfGenerationRequest.mockReset();
        mockEnforceDtfRouteRateLimit.mockReset();
        mockParseAndValidateDtfJson.mockReset();
        mockGenerateMockup.mockReset();
        mockGetExistingGeneration.mockReset();
        mockHasPersistedGenerationAttempt.mockReset();
        mockReserveDailyQuota.mockReset();
        mockLogActivity.mockReset();
        mockReleaseDailyQuota.mockReset();
        mockGetWashaDtfErrorDetails.mockReset();
        mockGetRequestClientIdentifier.mockReset();
        mockGetGenerationReadiness.mockReset();
        mockRecordGenerationFailure.mockReset();
        mockRecordGenerationSuccess.mockReset();
        mockGetArtworkProviderReadiness.mockReset();
        mockLogDtfTrace.mockReset();
        mockGetGenerationMode.mockReset();
        mockShouldChargeQuota.mockReset();
        mockGetQuotaStatus.mockReset();
        mockGenerateBoard.mockReset();
        mockNotifyBoardRequestReady.mockReset();
        mockCanUseWashaAiDevSurfaceForGeneration.mockReset();

        mockRequireDtfRouteAccess.mockResolvedValue({
            access: {
                allowed: true,
                profileId: "profile_1",
                clerkId: "clerk_1",
                role: "subscriber",
            },
        });
        mockClaimDtfGenerationRequest.mockResolvedValue({
            claimed: true,
            state: "claimed",
            retryAfterSeconds: 0,
        });
        mockCompleteDtfGenerationRequest.mockResolvedValue(true);
        mockFailDtfGenerationRequest.mockResolvedValue(true);
        mockEnforceDtfRouteRateLimit.mockResolvedValue(null);
        mockParseAndValidateDtfJson.mockResolvedValue({
            data: {
                prompt: "تصميم عربي حديث",
                referenceImage: null,
                garmentReferenceImage: null,
                generationContext: {
                    garmentId: "44444444-4444-4444-8444-444444444444",
                    colorId: "55555555-5555-4555-8555-555555555555",
                    sizeId: "66666666-6666-4666-8666-666666666666",
                    garmentType: "تيشيرت",
                    garmentColor: "أسود",
                    colorHex: "#111111",
                    designMethod: "text",
                    style: "هندسي",
                    technique: "رقمي",
                    palette: "ذهبي",
                    printPosition: "chest",
                    printSize: "large",
                    printScale: 100,
                    printOffsetX: 0,
                    printOffsetY: 0,
                },
            },
        });
        mockReserveDailyQuota.mockResolvedValue({
            allowed: true,
            remaining: 4,
            used: 1,
            quotaDate: "2026-03-30",
            tracked: true,
            source: "free",
            freeRemaining: 4,
            paidBalance: 0,
        });
        mockGenerateMockup.mockResolvedValue(generationResult());
        mockGetExistingGeneration.mockResolvedValue(null);
        mockHasPersistedGenerationAttempt.mockResolvedValue(false);
        mockLogActivity.mockResolvedValue(true);
        mockReleaseDailyQuota.mockResolvedValue(true);
        mockGetWashaDtfErrorDetails.mockReturnValue({
            message: "خدمة Washa AI تحت ضغط مؤقت الآن. أعد المحاولة بعد قليل.",
            status: 503,
        });
        mockGetRequestClientIdentifier.mockReturnValue("guest:127.0.0.1");
        mockGetGenerationReadiness.mockReturnValue({
            enabled: true,
            code: "ready",
            message: "خدمة التوليد جاهزة.",
            provider: "genai",
            model: "gemini-3-pro-image",
            fallbackEnabled: false,
        });
        mockGetArtworkProviderReadiness.mockReturnValue({
            ready: true,
            provider: "genai",
            model: "gemini-3-pro-image",
            fallbackEnabled: false,
        });
        mockGetGenerationMode.mockResolvedValue("primary");
        mockShouldChargeQuota.mockResolvedValue(true);
        mockGetQuotaStatus.mockResolvedValue({
            audience: "subscriber",
            unlimited: false,
            blocked: false,
            freeLimit: 5,
            freeUsed: 5,
            freeRemaining: 0,
            paidBalance: 0,
            canPurchase: true,
        });
        mockGenerateBoard.mockResolvedValue({
            ok: true,
            boardImageUrl: "https://cdn.example/board-preview.webp",
            boardRequestId: "77777777-7777-4777-8777-777777777777",
        });
        mockNotifyBoardRequestReady.mockResolvedValue({ ok: true });
        mockCanUseWashaAiDevSurfaceForGeneration.mockResolvedValue(true);
    });

    it("returns an uncharged board preview without touching primary readiness or quota reservation", async () => {
        mockGetGenerationMode.mockResolvedValue("fallback");
        mockShouldChargeQuota.mockResolvedValue(false);

        const response = await POST(new Request(
            "http://localhost/api/dtf/generate",
            { headers: { "x-request-id": "request-board-auto" } }
        ) as NextRequest);

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({
            ok: true,
            requestId: "request-board-auto",
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
        });
        expect(mockGetQuotaStatus).toHaveBeenCalledOnce();
        expect(mockReserveDailyQuota).not.toHaveBeenCalled();
        expect(mockReleaseDailyQuota).not.toHaveBeenCalled();
        expect(mockGenerateBoard).toHaveBeenCalledOnce();
        expect(mockGenerateMockup).not.toHaveBeenCalled();
        expect(mockGetGenerationReadiness).not.toHaveBeenCalled();
        expect(mockGetArtworkProviderReadiness).not.toHaveBeenCalled();
    });

    it.each(["dev", "dev-v2"] as const)(
        "keeps the %s surface on the primary pipeline when the global mode is fallback",
        async (surface) => {
            mockGetGenerationMode.mockResolvedValue("fallback");
            mockShouldChargeQuota.mockResolvedValue(true);

            const response = await POST(new Request(
                "http://localhost/api/washa-dtf-studio/generate-mockup",
                {
                    headers: {
                        "x-request-id": `request-${surface}-primary-isolation`,
                        ...createWashaAiDevGenerationHeaders(surface),
                    },
                }
            ) as NextRequest);
            const payload = await response.json();

            expect(response.status).toBe(200);
            expect(mockCanUseWashaAiDevSurfaceForGeneration).toHaveBeenCalledWith(
                surface,
                false
            );
            expect(mockGetGenerationMode).not.toHaveBeenCalled();
            expect(mockShouldChargeQuota).not.toHaveBeenCalled();
            expect(mockReserveDailyQuota).toHaveBeenCalledOnce();
            expect(mockGenerateMockup).toHaveBeenCalledOnce();
            expect(mockGenerateBoard).not.toHaveBeenCalled();
            expect(payload).not.toHaveProperty("mode");
            expect(payload).not.toHaveProperty("boardImageUrl");
            expect(payload).not.toHaveProperty("boardRequestId");
            expect(payload).not.toHaveProperty("disclaimer");
            expect(payload).not.toHaveProperty("quotaCharged");
        }
    );

    it("rejects a dev-surface generation request when that surface is not allowed for the caller", async () => {
        mockCanUseWashaAiDevSurfaceForGeneration.mockResolvedValue(false);
        mockGetGenerationMode.mockResolvedValue("fallback");

        const response = await POST(new Request(
            "http://localhost/api/washa-dtf-studio/generate-mockup",
            {
                headers: {
                    "x-request-id": "request-dev-forbidden",
                    ...createWashaAiDevGenerationHeaders("dev"),
                },
            }
        ) as NextRequest);

        expect(response.status).toBe(403);
        await expect(response.json()).resolves.toMatchObject({
            ok: false,
            code: "AUTH_FORBIDDEN",
            requestId: "request-dev-forbidden",
        });
        expect(mockGetGenerationMode).not.toHaveBeenCalled();
        expect(mockShouldChargeQuota).not.toHaveBeenCalled();
        expect(mockGenerateMockup).not.toHaveBeenCalled();
        expect(mockGenerateBoard).not.toHaveBeenCalled();
    });

    it("does not let an unsigned surface header impersonate a dev surface", async () => {
        mockGetGenerationMode.mockResolvedValue("fallback");
        mockShouldChargeQuota.mockResolvedValue(false);

        const response = await POST(new Request(
            "http://localhost/api/washa-dtf-studio/generate-mockup",
            {
                headers: {
                    "x-request-id": "request-cross-origin-dev-spoof",
                    "x-washa-ai-dev-surface": "dev-v2",
                    "x-washa-ai-dev-signature": "forged",
                },
            }
        ) as NextRequest);

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toMatchObject({
            mode: "fallback",
            boardRequestId: "77777777-7777-4777-8777-777777777777",
        });
        expect(mockCanUseWashaAiDevSurfaceForGeneration).not.toHaveBeenCalled();
        expect(mockGetGenerationMode).toHaveBeenCalledOnce();
        expect(mockGenerateBoard).toHaveBeenCalledOnce();
        expect(mockGenerateMockup).not.toHaveBeenCalled();
    });

    it("completes the shared claim and records board success without primary asset metadata", async () => {
        mockGetGenerationMode.mockResolvedValue("fallback");
        mockShouldChargeQuota.mockResolvedValue(false);

        const response = await POST(new Request(
            "http://localhost/api/dtf/generate",
            { headers: { "x-request-id": "request-board-success-telemetry" } }
        ) as NextRequest);

        expect(response.status).toBe(200);
        expect(mockCompleteDtfGenerationRequest).toHaveBeenCalledWith(
            "profile_1",
            "request-board-success-telemetry",
            "generate-mockup"
        );
        expect(mockLogActivity).toHaveBeenCalledWith({
            profileId: "profile_1",
            clerkId: "clerk_1",
            action: "generate-mockup",
            status: "success",
            resultImageUrl: "https://cdn.example/board-preview.webp",
            metadata: {
                generationMode: "fallback",
                boardRequestId: "77777777-7777-4777-8777-777777777777",
                quotaCharged: false,
                remainingPointsAfterReservation: 0,
                usedPoints: 5,
                quotaDate: undefined,
            },
        });
        expect(mockNotifyBoardRequestReady).toHaveBeenCalledWith({
            boardRequestId: "77777777-7777-4777-8777-777777777777",
            boardImageUrl: "https://cdn.example/board-preview.webp",
            customerDescription: "تصميم عربي حديث",
            generationContext: expect.objectContaining({
                garmentType: "تيشيرت",
                garmentColor: "أسود",
                printPosition: "chest",
                printSize: "large",
                printScale: 100,
            }),
        });
        expect(mockCompleteDtfGenerationRequest.mock.invocationCallOrder[0]).toBeLessThan(
            mockNotifyBoardRequestReady.mock.invocationCallOrder[0] ?? 0
        );
    });

    it("keeps a successful board response and quota state when Telegram delivery fails", async () => {
        mockGetGenerationMode.mockResolvedValue("fallback");
        mockShouldChargeQuota.mockResolvedValue(true);
        mockNotifyBoardRequestReady.mockResolvedValue({
            ok: false,
            reason: "delivery_failed",
        });

        const response = await POST(new Request(
            "http://localhost/api/dtf/generate",
            { headers: { "x-request-id": "request-board-telegram-failure" } }
        ) as NextRequest);

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toMatchObject({
            mode: "fallback",
            quotaCharged: true,
            remainingPoints: 4,
        });
        expect(mockReserveDailyQuota).toHaveBeenCalledOnce();
        expect(mockReleaseDailyQuota).not.toHaveBeenCalled();
        expect(mockNotifyBoardRequestReady).toHaveBeenCalledOnce();
        expect(mockLogDtfTrace).toHaveBeenCalledWith(
            expect.any(String),
            "request-board-telegram-failure",
            "board_telegram_notification_failed",
            {
                boardRequestId: "77777777-7777-4777-8777-777777777777",
                reason: "delivery_failed",
            }
        );
    });

    it("contains an unexpected notification bug after claim completion", async () => {
        mockGetGenerationMode.mockResolvedValue("fallback");
        mockShouldChargeQuota.mockResolvedValue(false);
        mockNotifyBoardRequestReady.mockRejectedValue(new Error("unexpected notifier bug"));

        const response = await POST(new Request(
            "http://localhost/api/dtf/generate",
            { headers: { "x-request-id": "request-board-telegram-throw" } }
        ) as NextRequest);

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toMatchObject({
            mode: "fallback",
            quotaCharged: false,
        });
        expect(mockReleaseDailyQuota).not.toHaveBeenCalled();
        expect(mockCompleteDtfGenerationRequest.mock.invocationCallOrder[0]).toBeLessThan(
            mockNotifyBoardRequestReady.mock.invocationCallOrder[0] ?? 0
        );
        expect(mockLogDtfTrace).toHaveBeenCalledWith(
            expect.any(String),
            "request-board-telegram-throw",
            "board_telegram_notification_failed",
            {
                boardRequestId: "77777777-7777-4777-8777-777777777777",
                reason: "unexpected_error",
            }
        );
    });

    it("never sends a board notification for failed board generation or primary mode", async () => {
        mockGetGenerationMode.mockResolvedValue("fallback");
        mockShouldChargeQuota.mockResolvedValue(false);
        mockGenerateBoard.mockResolvedValue({
            ok: false,
            code: "IMAGE_PROVIDER_UNAVAILABLE",
            boardRequestId: "77777777-7777-4777-8777-777777777777",
        });

        const failedBoardResponse = await POST(new Request(
            "http://localhost/api/dtf/generate",
            { headers: { "x-request-id": "request-board-no-telegram" } }
        ) as NextRequest);
        expect(failedBoardResponse.status).toBe(503);
        expect(mockNotifyBoardRequestReady).not.toHaveBeenCalled();

        mockGetGenerationMode.mockResolvedValue("primary");
        mockShouldChargeQuota.mockResolvedValue(true);
        const primaryResponse = await POST(new Request(
            "http://localhost/api/dtf/generate",
            { headers: { "x-request-id": "request-primary-no-board-telegram" } }
        ) as NextRequest);
        expect(primaryResponse.status).toBe(200);
        expect(mockNotifyBoardRequestReady).not.toHaveBeenCalled();
    });

    it.each([
        {
            name: "primary + auto",
            mode: "primary" as const,
            charge: true,
            expectedPrimaryCalls: 1,
            expectedBoardCalls: 0,
            expectedReserveCalls: 1,
        },
        {
            name: "fallback + auto",
            mode: "fallback" as const,
            charge: false,
            expectedPrimaryCalls: 0,
            expectedBoardCalls: 1,
            expectedReserveCalls: 0,
        },
        {
            name: "fallback + manual enabled",
            mode: "fallback" as const,
            charge: true,
            expectedPrimaryCalls: 0,
            expectedBoardCalls: 1,
            expectedReserveCalls: 1,
        },
        {
            name: "primary + manual disabled",
            mode: "primary" as const,
            charge: false,
            expectedPrimaryCalls: 1,
            expectedBoardCalls: 0,
            expectedReserveCalls: 0,
        },
    ])("applies quota side effects exactly once for $name", async ({
        mode,
        charge,
        expectedPrimaryCalls,
        expectedBoardCalls,
        expectedReserveCalls,
    }) => {
        mockGetGenerationMode.mockResolvedValue(mode);
        mockShouldChargeQuota.mockResolvedValue(charge);

        const response = await POST(new Request(
            "http://localhost/api/dtf/generate",
            { headers: { "x-request-id": `request-matrix-${mode}-${charge}` } }
        ) as NextRequest);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(mockGenerateMockup).toHaveBeenCalledTimes(expectedPrimaryCalls);
        expect(mockGenerateBoard).toHaveBeenCalledTimes(expectedBoardCalls);
        expect(mockReserveDailyQuota).toHaveBeenCalledTimes(expectedReserveCalls);
        expect(mockReleaseDailyQuota).not.toHaveBeenCalled();
        if (mode === "primary") {
            expect(payload).toMatchObject({
                ok: true,
                requestId: `request-matrix-${mode}-${charge}`,
                imageUrl: "https://cdn.example/mockup-front.webp",
                masterAssetId: "22222222-2222-4222-8222-222222222222",
                remainingPoints: charge ? 4 : null,
            });
            expect(payload).not.toHaveProperty("mode");
            expect(payload).not.toHaveProperty("boardImageUrl");
            expect(payload).not.toHaveProperty("boardRequestId");
            expect(payload).not.toHaveProperty("disclaimer");
            expect(payload).not.toHaveProperty("quotaCharged");
        } else {
            expect(payload).toMatchObject({
                mode: "fallback",
                disclaimer: "preview_only",
                quotaCharged: expectedReserveCalls === 1,
            });
        }
    });

    it("refunds one tracked manual board charge when board generation fails", async () => {
        mockGetGenerationMode.mockResolvedValue("fallback");
        mockShouldChargeQuota.mockResolvedValue(true);
        mockGenerateBoard.mockResolvedValue({
            ok: false,
            code: "IMAGE_PROVIDER_UNAVAILABLE",
            boardRequestId: "77777777-7777-4777-8777-777777777777",
        });

        const response = await POST(new Request(
            "http://localhost/api/dtf/generate",
            { headers: { "x-request-id": "request-board-manual-failure" } }
        ) as NextRequest);

        expect(response.status).toBe(503);
        expect(mockReserveDailyQuota).toHaveBeenCalledOnce();
        expect(mockReleaseDailyQuota).toHaveBeenCalledOnce();
        expect(mockReleaseDailyQuota).toHaveBeenCalledWith(
            "profile_1",
            "subscriber",
            "free",
            {
                guestIdentifier: null,
                requestId: "request-board-manual-failure",
                operation: "generate-mockup",
                quotaDate: "2026-03-30",
            }
        );
    });

    it("does not reserve or refund quota when an automatic board generation fails", async () => {
        mockGetGenerationMode.mockResolvedValue("fallback");
        mockShouldChargeQuota.mockResolvedValue(false);
        mockGenerateBoard.mockResolvedValue({
            ok: false,
            code: "IMAGE_PROVIDER_UNAVAILABLE",
            boardRequestId: "77777777-7777-4777-8777-777777777777",
        });

        const response = await POST(new Request(
            "http://localhost/api/dtf/generate",
            { headers: { "x-request-id": "request-board-auto-failure" } }
        ) as NextRequest);

        expect(response.status).toBe(503);
        await expect(response.json()).resolves.toMatchObject({
            ok: false,
            code: "IMAGE_PROVIDER_UNAVAILABLE",
        });
        expect(mockReserveDailyQuota).not.toHaveBeenCalled();
        expect(mockReleaseDailyQuota).not.toHaveBeenCalled();
        expect(mockFailDtfGenerationRequest).toHaveBeenCalledWith(
            "profile_1",
            "request-board-auto-failure",
            { operation: "generate-mockup", blockRetry: false }
        );
    });

    it("blocks retry when a failed manual board charge cannot be restored", async () => {
        mockGetGenerationMode.mockResolvedValue("fallback");
        mockShouldChargeQuota.mockResolvedValue(true);
        mockGenerateBoard.mockResolvedValue({
            ok: false,
            code: "IMAGE_PROVIDER_UNAVAILABLE",
        });
        mockReleaseDailyQuota.mockResolvedValue(false);

        const response = await POST(new Request(
            "http://localhost/api/dtf/generate",
            { headers: { "x-request-id": "request-board-release-failed" } }
        ) as NextRequest);

        expect(response.status).toBe(500);
        await expect(response.json()).resolves.toMatchObject({
            ok: false,
            code: "INTERNAL_ERROR",
            retryable: false,
        });
        expect(mockReserveDailyQuota).toHaveBeenCalledOnce();
        expect(mockReleaseDailyQuota).toHaveBeenCalledOnce();
        expect(mockFailDtfGenerationRequest).toHaveBeenCalledWith(
            "profile_1",
            "request-board-release-failed",
            { operation: "generate-mockup", blockRetry: true }
        );
    });

    it("rejects fallback without generation context before claim or quota work", async () => {
        mockGetGenerationMode.mockResolvedValue("fallback");
        mockParseAndValidateDtfJson.mockResolvedValue({
            data: {
                prompt: "تصميم عربي حديث",
                referenceImage: null,
                garmentReferenceImage: null,
                generationContext: null,
            },
        });

        const response = await POST(new Request(
            "http://localhost/api/dtf/generate",
            { headers: { "x-request-id": "request-board-context-missing" } }
        ) as NextRequest);

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toMatchObject({
            ok: false,
            code: "INVALID_BOARD_INPUT",
        });
        expect(mockClaimDtfGenerationRequest).not.toHaveBeenCalled();
        expect(mockGetQuotaStatus).not.toHaveBeenCalled();
        expect(mockReserveDailyQuota).not.toHaveBeenCalled();
        expect(mockReleaseDailyQuota).not.toHaveBeenCalled();
        expect(mockGenerateBoard).not.toHaveBeenCalled();
    });

    it("fails safely to the unchanged primary path when generation mode lookup throws", async () => {
        mockGetGenerationMode.mockRejectedValue(new Error("settings programmer error"));

        const response = await POST(new Request(
            "http://localhost/api/dtf/generate",
            { headers: { "x-request-id": "request-mode-read-failed" } }
        ) as NextRequest);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toEqual({
            ok: true,
            requestId: "request-mode-read-failed",
            ...generationResult(),
            remainingPoints: 4,
            freeRemaining: 4,
            paidBalance: 0,
            consumedSource: "free",
            guest: false,
        });
        expect(payload).not.toHaveProperty("mode");
        expect(payload).not.toHaveProperty("disclaimer");
        expect(mockGetGenerationReadiness).toHaveBeenCalledOnce();
        expect(mockGetArtworkProviderReadiness).toHaveBeenCalledOnce();
        expect(mockReserveDailyQuota).toHaveBeenCalledOnce();
        expect(mockGenerateMockup).toHaveBeenCalledOnce();
        expect(mockGenerateBoard).not.toHaveBeenCalled();
        expect(mockLogDtfTrace).toHaveBeenCalledWith(
            "/api/washa-dtf-studio/generate-mockup",
            "request-mode-read-failed",
            "generation_mode_read_failed",
            expect.objectContaining({ selectedMode: "primary" })
        );
    });

    it("reports an unexpected board eligibility failure separately from provider failures", async () => {
        mockGetGenerationMode.mockResolvedValue("fallback");
        mockShouldChargeQuota.mockResolvedValue(false);
        mockGetQuotaStatus.mockRejectedValue(new Error("unexpected eligibility defect"));

        const response = await POST(new Request(
            "http://localhost/api/dtf/generate",
            { headers: { "x-request-id": "request-board-eligibility-failed" } }
        ) as NextRequest);

        expect(response.status).toBe(503);
        await expect(response.json()).resolves.toMatchObject({
            ok: false,
            code: "QUOTA_ELIGIBILITY_UNAVAILABLE",
        });
        expect(mockReserveDailyQuota).not.toHaveBeenCalled();
        expect(mockReleaseDailyQuota).not.toHaveBeenCalled();
        expect(mockGenerateBoard).not.toHaveBeenCalled();
        expect(mockLogDtfTrace).toHaveBeenCalledWith(
            "/api/washa-dtf-studio/generate-mockup",
            "request-board-eligibility-failed",
            "board_eligibility_check_failed",
            expect.objectContaining({
                statusCode: 503,
                errorCode: "QUOTA_ELIGIBILITY_UNAVAILABLE",
            })
        );
        expect(
            mockLogDtfTrace.mock.calls.some((call) => call[2] === "board_provider_failed")
        ).toBe(false);
    });

    it("preserves audience blocking without reserving no-charge fallback quota", async () => {
        mockGetGenerationMode.mockResolvedValue("fallback");
        mockShouldChargeQuota.mockResolvedValue(false);
        mockGetQuotaStatus.mockResolvedValue({
            audience: "subscriber",
            unlimited: false,
            blocked: true,
            freeLimit: 0,
            freeUsed: 0,
            freeRemaining: 0,
            paidBalance: 0,
            canPurchase: false,
        });

        const response = await POST(new Request(
            "http://localhost/api/dtf/generate",
            { headers: { "x-request-id": "request-board-audience-blocked" } }
        ) as NextRequest);

        expect(response.status).toBe(403);
        await expect(response.json()).resolves.toMatchObject({
            code: "audience_disabled",
        });
        expect(mockReserveDailyQuota).not.toHaveBeenCalled();
        expect(mockReleaseDailyQuota).not.toHaveBeenCalled();
        expect(mockGenerateBoard).not.toHaveBeenCalled();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("returns the access response unchanged when access is denied", async () => {
        mockRequireDtfRouteAccess.mockResolvedValue({
            response: NextResponse.json(
                { error: "غير مصرح لك باستخدام استوديو DTF" },
                { status: 403 }
            ),
        });

        const response = await POST(new Request("http://localhost/api/dtf/generate") as NextRequest);

        expect(response.status).toBe(403);
        await expect(response.json()).resolves.toEqual({
            error: "غير مصرح لك باستخدام استوديو DTF",
        });
    });

    it("resumes a persisted master without provider readiness or a second quota reservation", async () => {
        mockHasPersistedGenerationAttempt.mockResolvedValue(true);
        mockGetGenerationReadiness.mockReturnValue({
            enabled: false,
            code: "temporarily_unavailable",
            message: "provider unavailable",
        });
        mockGetArtworkProviderReadiness.mockReturnValue({
            ready: false,
            message: "transparent provider unavailable",
        });

        const response = await POST(new Request("http://localhost/api/dtf/generate") as NextRequest);

        expect(response.status).toBe(200);
        expect(mockReserveDailyQuota).not.toHaveBeenCalled();
        expect(mockGenerateMockup).toHaveBeenCalledOnce();
    });

    it("returns a late successful result without retrying, charging, or creating another master", async () => {
        mockGetExistingGeneration.mockResolvedValue(
            generationResult("https://cdn.example/late-success.webp")
        );

        const response = await POST(new Request(
            "http://localhost/api/dtf/generate",
            { headers: { "x-request-id": "generation-request-late-success" } }
        ) as NextRequest);

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toMatchObject({
            ok: true,
            requestId: "generation-request-late-success",
            reused: true,
            masterAssetId: "22222222-2222-4222-8222-222222222222",
        });
        expect(mockClaimDtfGenerationRequest).not.toHaveBeenCalled();
        expect(mockReserveDailyQuota).not.toHaveBeenCalled();
        expect(mockGenerateMockup).not.toHaveBeenCalled();
    });

    it("returns the rate-limit response unchanged when the threshold is hit", async () => {
        mockEnforceDtfRouteRateLimit.mockResolvedValue(
            NextResponse.json(
                { error: "تم تجاوز الحد المسموح. يرجى الانتظار دقيقة والمحاولة مجدداً." },
                {
                    status: 429,
                    headers: {
                        "X-RateLimit-Reset": "2026-03-30T10:00:00.000Z",
                    },
                }
            )
        );

        const response = await POST(new Request("http://localhost/api/dtf/generate") as NextRequest);

        expect(response.status).toBe(429);
        expect(response.headers.get("X-RateLimit-Reset")).toBe("2026-03-30T10:00:00.000Z");
        await expect(response.json()).resolves.toEqual({
            error: "تم تجاوز الحد المسموح. يرجى الانتظار دقيقة والمحاولة مجدداً.",
        });
    });

    it("returns a typed wait action for rate limits when Phase 3 is enabled", async () => {
        vi.stubEnv("WASHA_STRUCTURED_USER_ACTIONS_ENABLED", "true");
        mockEnforceDtfRouteRateLimit.mockResolvedValue(
            NextResponse.json(
                {
                    error:
                        "تم تجاوز الحد المسموح. يرجى الانتظار دقيقة والمحاولة مجدداً.",
                },
                {
                    status: 429,
                    headers: {
                        "X-RateLimit-Reset": "2026-03-30T10:00:00.000Z",
                    },
                }
            )
        );

        const response = await POST(new Request(
            "http://localhost/api/dtf/generate",
            { headers: { "x-request-id": "request-rate-limited" } }
        ) as NextRequest);

        expect(response.status).toBe(429);
        expect(response.headers.get("X-Washa-Error-Code")).toBe("RATE_LIMITED");
        expect(response.headers.get("X-Washa-User-Action")).toBe(
            "wait_and_retry"
        );
        expect(response.headers.get("Retry-After")).toBe("60");
        expect(response.headers.get("X-RateLimit-Reset")).toBe(
            "2026-03-30T10:00:00.000Z"
        );
        await expect(response.json()).resolves.toMatchObject({
            ok: false,
            code: "RATE_LIMITED",
            message: "تم تجاوز الحد المسموح. انتظر دقيقة قبل المحاولة.",
            userAction: "wait_and_retry",
            retryAfterMs: 60_000,
            retryable: false,
            requestId: "request-rate-limited",
        });
    });

    it("validates the request before authentication and quota", async () => {
        mockParseAndValidateDtfJson.mockResolvedValue({
            response: NextResponse.json(
                {
                    ok: false,
                    code: "INVALID_REQUEST",
                    message: "الوصف مطلوب",
                    requestId: "request-invalid",
                    retryable: false,
                },
                { status: 400 }
            ),
        });

        const response = await POST(new Request("http://localhost/api/dtf/generate", {
            headers: { "x-request-id": "request-invalid" },
        }) as NextRequest);

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({
            ok: false,
            code: "INVALID_REQUEST",
            message: "الوصف مطلوب",
            requestId: "request-invalid",
            retryable: false,
        });
        expect(mockRequireDtfRouteAccess).not.toHaveBeenCalled();
        expect(mockReserveDailyQuota).not.toHaveBeenCalled();
    });

    it("rejects a short prompt before authentication, quota, and provider work", async () => {
        vi.stubEnv("WASHA_PROMPT_GUARD_ENABLED", "true");
        mockParseAndValidateDtfJson.mockResolvedValue({
            data: {
                prompt: "زهرة",
                referenceImage: null,
                garmentReferenceImage: null,
                generationContext: null,
            },
        });

        const response = await POST(new Request("http://localhost/api/dtf/generate", {
            headers: { "x-request-id": "request-short-prompt" },
        }) as NextRequest);

        expect(response.status).toBe(400);
        expect(response.headers.get("X-Washa-Error-Code")).toBe("PROMPT_TOO_SHORT");
        await expect(response.json()).resolves.toEqual({
            ok: false,
            code: "PROMPT_TOO_SHORT",
            message: "الوصف قصير جدًا. أضف تفاصيل أكثر عن التصميم الذي تريده.",
            requestId: "request-short-prompt",
            retryable: false,
        });
        expect(mockRequireDtfRouteAccess).not.toHaveBeenCalled();
        expect(mockEnforceDtfRouteRateLimit).not.toHaveBeenCalled();
        expect(mockReserveDailyQuota).not.toHaveBeenCalled();
        expect(mockGenerateMockup).not.toHaveBeenCalled();
        expect(mockLogDtfTrace).toHaveBeenCalledWith(
            "/api/washa-dtf-studio/generate-mockup",
            "request-short-prompt",
            "prompt_guard_evaluated",
            expect.objectContaining({
                accepted: false,
                errorCode: "PROMPT_TOO_SHORT",
                durationMs: expect.any(Number),
            })
        );
    });

    it("adds structured prompt actions only when the Phase 3 flag is enabled", async () => {
        vi.stubEnv("WASHA_PROMPT_GUARD_ENABLED", "true");
        vi.stubEnv("WASHA_STRUCTURED_USER_ACTIONS_ENABLED", "true");
        mockParseAndValidateDtfJson.mockResolvedValue({
            data: {
                prompt: "زهرة",
                referenceImage: null,
                garmentReferenceImage: null,
                generationContext: null,
            },
        });

        const response = await POST(new Request(
            "http://localhost/api/dtf/generate",
            { headers: { "x-request-id": "request-structured-prompt" } }
        ) as NextRequest);

        expect(response.status).toBe(400);
        expect(response.headers.get("X-Washa-Error-Code")).toBe(
            "PROMPT_TOO_SHORT"
        );
        expect(response.headers.get("X-Washa-User-Action")).toBe("edit_prompt");
        expect(response.headers.get("Retry-After")).toBeNull();
        expect(response.headers.get("X-Trace-Id")).toBe(
            "request-structured-prompt"
        );
        await expect(response.json()).resolves.toEqual({
            ok: false,
            code: "PROMPT_TOO_SHORT",
            message: "الوصف قصير جداً. أضف تفاصيل عن التصميم.",
            userAction: "edit_prompt",
            retryAfterMs: null,
            retryable: false,
            requestId: "request-structured-prompt",
        });
        expect(mockRequireDtfRouteAccess).not.toHaveBeenCalled();
        expect(mockReserveDailyQuota).not.toHaveBeenCalled();
    });

    it("rejects a symbols-only prompt with a non-meaningful error", async () => {
        vi.stubEnv("WASHA_PROMPT_GUARD_ENABLED", "true");
        mockParseAndValidateDtfJson.mockResolvedValue({
            data: {
                prompt: "!!!!!!!!",
                referenceImage: null,
                garmentReferenceImage: null,
                generationContext: null,
            },
        });

        const response = await POST(new Request("http://localhost/api/dtf/generate", {
            headers: { "x-request-id": "request-symbol-prompt" },
        }) as NextRequest);

        expect(response.status).toBe(400);
        expect(response.headers.get("X-Washa-Error-Code")).toBe(
            "PROMPT_NON_MEANINGFUL"
        );
        await expect(response.json()).resolves.toMatchObject({
            ok: false,
            code: "PROMPT_NON_MEANINGFUL",
            message: "الوصف يبدو غير واضح. اكتب جملة تصف التصميم.",
            requestId: "request-symbol-prompt",
            retryable: false,
        });
        expect(mockRequireDtfRouteAccess).not.toHaveBeenCalled();
        expect(mockReserveDailyQuota).not.toHaveBeenCalled();
        expect(mockGenerateMockup).not.toHaveBeenCalled();
    });

    it("accepts a meaningful six-character prompt when the guard is enabled", async () => {
        vi.stubEnv("WASHA_PROMPT_GUARD_ENABLED", "true");
        mockParseAndValidateDtfJson.mockResolvedValue({
            data: {
                prompt: "خط ثلث",
                referenceImage: null,
                garmentReferenceImage: null,
                generationContext: null,
            },
        });

        const response = await POST(
            new Request("http://localhost/api/dtf/generate") as NextRequest
        );

        expect(response.status).toBe(200);
        expect(mockGenerateMockup).toHaveBeenCalledOnce();
    });

    it("keeps the existing route flow when the prompt guard is disabled", async () => {
        vi.stubEnv("WASHA_PROMPT_GUARD_ENABLED", "false");
        mockParseAndValidateDtfJson.mockResolvedValue({
            data: {
                prompt: "زهرة",
                referenceImage: null,
                garmentReferenceImage: null,
                generationContext: null,
            },
        });

        const response = await POST(
            new Request("http://localhost/api/dtf/generate") as NextRequest
        );

        expect(response.status).toBe(200);
        expect(mockRequireDtfRouteAccess).toHaveBeenCalledOnce();
        expect(mockReserveDailyQuota).toHaveBeenCalledOnce();
        expect(mockGenerateMockup).toHaveBeenCalledOnce();
    });

    it("rejects generation before reserving quota when the provider is not ready", async () => {
        mockGetGenerationReadiness.mockReturnValue({
            enabled: false,
            code: "disabled",
            message: "توليد WASHA AI متوقف مؤقتاً حتى اكتمال إعداد الخدمة.",
        });

        const response = await POST(new Request("http://localhost/api/dtf/generate") as NextRequest);

        expect(response.status).toBe(503);
        await expect(response.json()).resolves.toMatchObject({
            ok: false,
            message: "توليد WASHA AI متوقف مؤقتاً حتى اكتمال إعداد الخدمة.",
            code: "IMAGE_PROVIDER_UNAVAILABLE",
            retryable: false,
        });
        expect(mockReserveDailyQuota).not.toHaveBeenCalled();
        expect(mockGenerateMockup).not.toHaveBeenCalled();
    });

    it("uses provider Retry-After for a retryable structured action", async () => {
        vi.stubEnv("WASHA_STRUCTURED_USER_ACTIONS_ENABLED", "true");
        vi.stubEnv("WASHA_ENABLE_AUTO_RETRY_QUOTA_SAFE", "true");
        mockGetGenerationReadiness.mockReturnValue({
            enabled: false,
            code: "temporarily_unavailable",
            message: "provider sdk details must not be public",
            retryAfterSeconds: 9,
        });

        const response = await POST(new Request(
            "http://localhost/api/dtf/generate",
            { headers: { "x-request-id": "request-provider-retry" } }
        ) as NextRequest);

        expect(response.status).toBe(503);
        expect(response.headers.get("X-Washa-User-Action")).toBe("auto_retry");
        expect(response.headers.get("Retry-After")).toBe("9");
        await expect(response.json()).resolves.toEqual({
            ok: false,
            code: "IMAGE_PROVIDER_UNAVAILABLE",
            message: "خدمة التوليد غير متوفرة مؤقتًا. سنعيد المحاولة تلقائيًا.",
            userAction: "auto_retry",
            retryAfterMs: 9_000,
            retryable: true,
            requestId: "request-provider-retry",
        });
    });

    it("degrades auto_retry to wait_and_retry until quota safety is approved", async () => {
        vi.stubEnv("WASHA_STRUCTURED_USER_ACTIONS_ENABLED", "true");
        mockGetGenerationReadiness.mockReturnValue({
            enabled: false,
            code: "temporarily_unavailable",
            message: "provider sdk details must not be public",
            retryAfterSeconds: 9,
        });

        const response = await POST(new Request(
            "http://localhost/api/dtf/generate",
            { headers: { "x-request-id": "request-provider-wait-only" } }
        ) as NextRequest);

        expect(response.status).toBe(503);
        expect(response.headers.get("X-Washa-User-Action")).toBe(
            "wait_and_retry"
        );
        await expect(response.json()).resolves.toMatchObject({
            code: "IMAGE_PROVIDER_UNAVAILABLE",
            userAction: "wait_and_retry",
            retryAfterMs: 9_000,
            retryable: true,
            requestId: "request-provider-wait-only",
        });
    });

    it("preserves a permitted 503 Retry-After header when Phase 3 is disabled", async () => {
        mockGetGenerationReadiness.mockReturnValue({
            enabled: false,
            code: "temporarily_unavailable",
            message: "خدمة التوليد غير متاحة مؤقتاً.",
            retryAfterSeconds: 9,
        });

        const response = await POST(new Request(
            "http://localhost/api/dtf/generate"
        ) as NextRequest);

        expect(response.status).toBe(503);
        expect(response.headers.get("Retry-After")).toBe("9");
        expect(response.headers.get("X-Washa-User-Action")).toBeNull();
    });

    it("requires authenticated access for generation", async () => {
        await POST(new Request("http://localhost/api/dtf/generate") as NextRequest);

        expect(mockRequireDtfRouteAccess).toHaveBeenCalledWith(
            expect.objectContaining({ allowPublicGeneration: false })
        );
    });

    it("returns AUTH_REQUIRED without reserving quota for a signed-out user", async () => {
        mockRequireDtfRouteAccess.mockResolvedValueOnce({
            response: NextResponse.json({
                ok: false,
                code: "AUTH_REQUIRED",
                message: "يلزم تسجيل الدخول لإكمال العملية.",
                requestId: "request-auth",
                retryable: false,
            }, { status: 401 }),
        });

        const response = await POST(new Request("http://localhost/api/dtf/generate", {
            headers: { "x-request-id": "request-auth" },
        }) as NextRequest);

        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toMatchObject({
            ok: false,
            code: "AUTH_REQUIRED",
            message: "يلزم تسجيل الدخول لإكمال العملية.",
        });
        expect(mockReserveDailyQuota).not.toHaveBeenCalled();
        expect(mockGenerateMockup).not.toHaveBeenCalled();
    });

    it("returns AUTH_TEMPORARILY_UNAVAILABLE only for an auth runtime failure", async () => {
        mockRequireDtfRouteAccess.mockResolvedValueOnce({
            response: NextResponse.json({
                ok: false,
                code: "AUTH_TEMPORARILY_UNAVAILABLE",
                message: "تعذّر التحقق من جلسة الدخول مؤقتاً.",
                requestId: "request-auth-temp",
                retryable: true,
            }, { status: 503 }),
        });

        const response = await POST(new Request("http://localhost/api/dtf/generate", {
            headers: { "x-request-id": "request-auth-temp" },
        }) as NextRequest);

        expect(response.status).toBe(503);
        await expect(response.json()).resolves.toMatchObject({
            ok: false,
            code: "AUTH_TEMPORARILY_UNAVAILABLE",
            message: "تعذّر التحقق من جلسة الدخول مؤقتاً.",
        });
        expect(mockReserveDailyQuota).not.toHaveBeenCalled();
        expect(mockGenerateMockup).not.toHaveBeenCalled();
    });

    it("returns the current quota-exceeded response and logs the failure", async () => {
        mockReserveDailyQuota.mockResolvedValue({
            allowed: false,
            remaining: 0,
            used: 5,
            quotaDate: "2026-03-30",
            tracked: false,
            source: "none",
            freeRemaining: 0,
            paidBalance: 0,
            canPurchase: false,
            guest: false,
            reason: "quota_exceeded",
        });

        const response = await POST(new Request("http://localhost/api/dtf/generate") as NextRequest);

        expect(response.status).toBe(403);
        await expect(response.json()).resolves.toEqual({
            error: "نفدت حصتك من التوليد في وشّى AI. اشترِ رصيداً إضافياً للمتابعة الآن، أو انتظر تجديد حصتك المجانية غدًا.",
            code: "quota_exceeded",
            freeRemaining: 0,
            paidBalance: 0,
            canPurchase: false,
            guest: false,
        });
        expect(mockLogActivity).toHaveBeenCalledWith(
            expect.objectContaining({
                action: "generate-mockup",
                status: "quota_exceeded",
            })
        );
    });

    it("preserves quota details while adding an upgrade action behind Phase 3", async () => {
        vi.stubEnv("WASHA_STRUCTURED_USER_ACTIONS_ENABLED", "true");
        mockReserveDailyQuota.mockResolvedValue({
            allowed: false,
            remaining: 0,
            used: 5,
            quotaDate: "2026-03-30",
            tracked: false,
            source: "none",
            freeRemaining: 0,
            paidBalance: 0,
            canPurchase: true,
            guest: false,
            reason: "quota_exceeded",
        });

        const response = await POST(new Request(
            "http://localhost/api/dtf/generate",
            { headers: { "x-request-id": "request-quota-upgrade" } }
        ) as NextRequest);

        expect(response.status).toBe(403);
        expect(response.headers.get("X-Washa-Error-Code")).toBe(
            "quota_exceeded"
        );
        expect(response.headers.get("X-Washa-User-Action")).toBe(
            "upgrade_plan"
        );
        expect(response.headers.get("Retry-After")).toBeNull();
        await expect(response.json()).resolves.toEqual({
            error: "نفدت حصتك من التوليد. يمكنك إضافة رصيد للمتابعة.",
            ok: false,
            code: "quota_exceeded",
            message: "نفدت حصتك من التوليد. يمكنك إضافة رصيد للمتابعة.",
            userAction: "upgrade_plan",
            retryAfterMs: null,
            retryable: false,
            requestId: "request-quota-upgrade",
            freeRemaining: 0,
            paidBalance: 0,
            canPurchase: true,
            guest: false,
        });
    });

    it("returns a service-unavailable response when quota verification is unavailable", async () => {
        mockReserveDailyQuota.mockResolvedValue({
            allowed: false,
            remaining: 0,
            used: 0,
            tracked: false,
            source: "none",
            freeRemaining: 0,
            paidBalance: 0,
            reason: "quota_unavailable",
        });

        const response = await POST(new Request("http://localhost/api/dtf/generate") as NextRequest);

        expect(response.status).toBe(503);
        await expect(response.json()).resolves.toEqual({
            error: "تعذّر التحقق من رصيد WASHA AI حالياً. حاول بعد قليل.",
            code: "quota_unavailable",
            canPurchase: false,
            guest: false,
        });
        expect(mockGenerateMockup).not.toHaveBeenCalled();
        expect(mockLogActivity).toHaveBeenCalledWith(
            expect.objectContaining({
                action: "generate-mockup",
                status: "error",
                errorMessage: "تعذّر التحقق من رصيد WASHA AI قبل التوليد.",
            })
        );
    });

    it("blocks retry when the quota reservation outcome cannot be reconciled", async () => {
        mockReserveDailyQuota.mockResolvedValue({
            allowed: false,
            remaining: 0,
            used: 0,
            tracked: false,
            source: "none",
            freeRemaining: 0,
            paidBalance: 0,
            reason: "quota_unavailable",
            reservationState: "ambiguous",
        });

        const response = await POST(new Request("http://localhost/api/dtf/generate", {
            headers: { "x-request-id": "generation-request-quota-ambiguous" },
        }) as NextRequest);

        expect(response.status).toBe(500);
        await expect(response.json()).resolves.toMatchObject({
            ok: false,
            code: "QUOTA_STATE_UNCERTAIN",
            retryable: false,
        });
        expect(mockFailDtfGenerationRequest).toHaveBeenCalledWith(
            "profile_1",
            "generation-request-quota-ambiguous",
            {
                operation: "generate-mockup",
                blockRetry: true,
            }
        );
        expect(mockGenerateMockup).not.toHaveBeenCalled();
    });

    it("returns the current success payload shape", async () => {
        const response = await POST(new Request(
            "http://localhost/api/dtf/generate",
            { headers: { "x-request-id": "request-primary-regression" } }
        ) as NextRequest);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(response.headers.get("X-Trace-Id")).toBe("request-primary-regression");
        expect(payload).toEqual({
            ok: true,
            requestId: "request-primary-regression",
            imageUrl: "https://cdn.example/mockup-front.webp",
            previewUrl: "https://cdn.example/mockup-front.webp",
            frontPreviewUrl: "https://cdn.example/mockup-front.webp",
            backPreviewUrl: null,
            designRequestId: "11111111-1111-4111-8111-111111111111",
            masterAssetId: "22222222-2222-4222-8222-222222222222",
            masterAssetUrl: "https://cdn.example/design-master.png",
            masterChecksum: "a".repeat(64),
            mockupSourceType: "reference",
            placement: {
                side: "front",
                x: 0.5,
                y: 0.5,
                scale: 1,
                rotation: 0,
                printWidthCm: 30,
                printHeightCm: 40,
                anchorX: 0.5,
                anchorY: 0.5,
                referenceMockupId: "33333333-3333-4333-8333-333333333333",
                printAreaId: "front_default",
                transformVersion: 1,
            },
            transparencyVerificationStatus: "verified",
            productionReadinessStatus: "ready",
            provider: "genai",
            model: "gemini-3-pro-image",
            remainingPoints: 4,
            freeRemaining: 4,
            paidBalance: 0,
            consumedSource: "free",
            guest: false,
        });
        expect(payload).not.toHaveProperty("mode");
        expect(payload).not.toHaveProperty("boardImageUrl");
        expect(payload).not.toHaveProperty("boardRequestId");
        expect(payload).not.toHaveProperty("disclaimer");
        expect(payload).not.toHaveProperty("quotaCharged");
        expect(response.headers.get("X-Request-Id")).toBeTruthy();
        expect(mockGenerateMockup).toHaveBeenCalledWith(
            expect.objectContaining({
                profileId: "profile_1",
                generationRequestId: expect.any(String),
                userIdea: "تصميم عربي حديث",
                selection: expect.objectContaining({
                    garmentId: "44444444-4444-4444-8444-444444444444",
                    colorId: "55555555-5555-4555-8555-555555555555",
                    printPosition: "chest",
                }),
            })
        );
        expect(mockReserveDailyQuota).toHaveBeenCalledWith("profile_1", "subscriber", {
            guestIdentifier: null,
            requestId: expect.any(String),
            operation: "generate-mockup",
        });
        expect(mockRecordGenerationSuccess).toHaveBeenCalledTimes(1);
        expect(mockLogDtfTrace).toHaveBeenCalledWith(
            "/api/washa-dtf-studio/generate-mockup",
            expect.any(String),
            "provider_completed",
            expect.objectContaining({
                resolvedProvider: "genai",
                attemptedProvider: "genai",
                attemptedModel: "gemini-3-pro-image",
            })
        );
        expect(mockLogActivity).toHaveBeenCalledWith(
            expect.objectContaining({
                action: "generate-mockup",
                status: "success",
            })
        );
    });

    it("reserves one point once per successful generation request", async () => {
        mockReserveDailyQuota
            .mockResolvedValueOnce({
                allowed: true,
                remaining: 4,
                used: 1,
                quotaDate: "2026-07-12",
                tracked: true,
                source: "free",
                freeRemaining: 4,
                paidBalance: 0,
            })
            .mockResolvedValueOnce({
                allowed: true,
                remaining: 3,
                used: 2,
                quotaDate: "2026-07-12",
                tracked: true,
                source: "free",
                freeRemaining: 3,
                paidBalance: 0,
            });

        const first = await POST(new Request("http://localhost/api/dtf/generate") as NextRequest);
        const second = await POST(new Request("http://localhost/api/dtf/generate") as NextRequest);

        await expect(first.json()).resolves.toMatchObject({ freeRemaining: 4 });
        await expect(second.json()).resolves.toMatchObject({ freeRemaining: 3 });
        expect(mockReserveDailyQuota).toHaveBeenCalledTimes(2);
        expect(mockGenerateMockup).toHaveBeenCalledTimes(2);
    });

    it("blocks a repeated idempotency key before a second quota reservation", async () => {
        vi.stubEnv("WASHA_STRUCTURED_USER_ACTIONS_ENABLED", "true");
        mockClaimDtfGenerationRequest
            .mockResolvedValueOnce({
                claimed: true,
                state: "claimed",
                retryAfterSeconds: 0,
            })
            .mockResolvedValueOnce({
                claimed: false,
                state: "processing",
                retryAfterSeconds: 120,
            });
        const request = () => new Request("http://localhost/api/dtf/generate", {
            headers: { "x-request-id": "generation-request-duplicate" },
        }) as NextRequest;

        const first = await POST(request());
        const repeated = await POST(request());

        expect(first.status).toBe(200);
        expect(repeated.status).toBe(409);
        await expect(repeated.json()).resolves.toMatchObject({
            ok: false,
            code: "DUPLICATE_REQUEST",
            message: "طلبك قيد التنفيذ حاليًا. انتظر ظهور النتيجة.",
            userAction: "none",
            retryAfterMs: null,
            retryable: false,
        });
        expect(repeated.headers.get("X-Washa-User-Action")).toBe("none");
        expect(repeated.headers.get("Retry-After")).toBeNull();
        expect(mockReserveDailyQuota).toHaveBeenCalledTimes(1);
        expect(mockGenerateMockup).toHaveBeenCalledTimes(1);
    });

    it("allows the same idempotency key to retry after a failed attempt was released", async () => {
        mockClaimDtfGenerationRequest
            .mockResolvedValueOnce({
                claimed: true,
                state: "claimed",
                retryAfterSeconds: 0,
            })
            .mockResolvedValueOnce({
                claimed: true,
                state: "claimed",
                retryAfterSeconds: 0,
            });
        mockGenerateMockup
            .mockRejectedValueOnce(new Error("provider timeout"))
            .mockResolvedValueOnce(generationResult("https://cdn.example/retry.webp"));
        mockGetWashaDtfErrorDetails.mockReturnValue({
            message: "انتهت مهلة التوليد من المزود الخارجي.",
            status: 504,
        });
        const request = () => new Request("http://localhost/api/dtf/generate", {
            headers: { "x-request-id": "generation-request-retryable" },
        }) as NextRequest;

        const first = await POST(request());
        const retried = await POST(request());

        expect(first.status).toBe(503);
        expect(retried.status).toBe(200);
        expect(mockReleaseDailyQuota).toHaveBeenCalledTimes(1);
        expect(mockReserveDailyQuota).toHaveBeenCalledTimes(2);
        expect(mockReserveDailyQuota).toHaveBeenNthCalledWith(
            1,
            "profile_1",
            "subscriber",
            expect.objectContaining({
                requestId: "generation-request-retryable",
            })
        );
        expect(mockReserveDailyQuota).toHaveBeenNthCalledWith(
            2,
            "profile_1",
            "subscriber",
            expect.objectContaining({
                requestId: "generation-request-retryable",
            })
        );
        expect(mockGenerateMockup).toHaveBeenCalledTimes(2);
    });

    it("fails closed when distributed idempotency is unavailable", async () => {
        mockClaimDtfGenerationRequest.mockResolvedValueOnce({
            claimed: false,
            state: "unavailable",
            retryAfterSeconds: 0,
        });

        const response = await POST(new Request("http://localhost/api/dtf/generate") as NextRequest);

        expect(response.status).toBe(503);
        await expect(response.json()).resolves.toMatchObject({
            ok: false,
            code: "IDEMPOTENCY_UNAVAILABLE",
            retryable: false,
        });
        expect(mockReserveDailyQuota).not.toHaveBeenCalled();
        expect(mockGenerateMockup).not.toHaveBeenCalled();
    });

    it("returns a successful generation even when success telemetry fails", async () => {
        mockLogActivity.mockRejectedValueOnce(new Error("telemetry unavailable"));

        const response = await POST(new Request("http://localhost/api/dtf/generate") as NextRequest);

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toMatchObject({
            imageUrl: "https://cdn.example/mockup-front.webp",
            remainingPoints: 4,
        });
        expect(mockRecordGenerationFailure).not.toHaveBeenCalled();
        expect(mockReleaseDailyQuota).not.toHaveBeenCalled();
    });

    it("does not open the provider circuit for a non-retryable 4xx rejection", async () => {
        mockGenerateMockup.mockRejectedValue(new Error("invalid image input"));
        mockGetWashaDtfErrorDetails.mockReturnValue({ message: "الصورة غير صالحة", status: 400 });

        const response = await POST(new Request("http://localhost/api/dtf/generate") as NextRequest);

        expect(response.status).toBe(502);
        await expect(response.json()).resolves.toMatchObject({
            ok: false,
            code: "IMAGE_PROVIDER_UNAVAILABLE",
            retryable: false,
        });
        expect(mockRecordGenerationFailure).not.toHaveBeenCalled();
        expect(mockReleaseDailyQuota).toHaveBeenCalledTimes(1);
    });

    it("releases tracked quota and returns a public provider failure", async () => {
        mockGenerateMockup.mockRejectedValue(new Error("provider timeout"));
        mockGetWashaDtfErrorDetails.mockReturnValue({
            message: "انتهت مهلة التوليد من المزود الخارجي.",
            status: 504,
        });

        const response = await POST(new Request("http://localhost/api/dtf/generate") as NextRequest);

        expect(response.status).toBe(503);
        expect(response.headers.get("X-Trace-Id")).toBeTruthy();
        await expect(response.json()).resolves.toMatchObject({
            ok: false,
            code: "IMAGE_PROVIDER_UNAVAILABLE",
            message: "تعذر إنشاء التصميم الآن. عدّل الوصف قليلًا أو جرّب مرة أخرى بعد لحظات.",
            retryable: true,
        });
        expect(mockReleaseDailyQuota).toHaveBeenCalledWith("profile_1", "subscriber", "free", {
            guestIdentifier: null,
            requestId: expect.any(String),
            operation: "generate-mockup",
            quotaDate: "2026-03-30",
        });
        expect(mockRecordGenerationFailure).toHaveBeenCalledWith(expect.any(Error));
        expect(mockLogActivity).toHaveBeenCalledWith(
            expect.objectContaining({
                action: "generate-mockup",
                status: "timeout",
                errorMessage: "انتهت مهلة التوليد من المزود الخارجي.",
            })
        );
    });

    it("rejects unexpected writing and refunds quota while automatic retry is disabled", async () => {
        vi.stubEnv("WASHA_STRUCTURED_USER_ACTIONS_ENABLED", "true");
        mockGenerateMockup.mockRejectedValue(
            new ArtworkTextPolicyError(
                "Generated artwork contains unexpected visible text: private prompt."
            )
        );

        const response = await POST(
            new Request("http://localhost/api/dtf/generate") as NextRequest
        );
        const payload = await response.json();

        expect(response.status).toBe(422);
        expect(payload).toMatchObject({
            ok: false,
            code: "ARTWORK_TEXT_POLICY_FAILED",
            userAction: "wait_and_retry",
            retryAfterMs: 1_000,
            retryable: true,
        });
        expect(response.headers.get("Retry-After")).toBeNull();
        expect(JSON.stringify(payload)).not.toContain("private prompt");
        expect(mockReleaseDailyQuota).toHaveBeenCalledOnce();
        expect(mockFailDtfGenerationRequest).not.toHaveBeenCalled();
        expect(mockRecordGenerationFailure).not.toHaveBeenCalled();
        expect(mockGetWashaDtfErrorDetails).not.toHaveBeenCalled();
        expect(
            mockLogDtfTrace.mock.calls.some(
                (call) => call[2] === "provider_failed"
            )
        ).toBe(false);
        expect(
            mockLogDtfTrace.mock.calls.some(
                (call) => call[2] === "artwork_text_policy_failed"
            )
        ).toBe(true);
    });

    it("classifies a verifier outage independently from image-provider failure", async () => {
        mockGenerateMockup.mockRejectedValue(Object.assign(
            new Error("OpenAI artwork verification failed."),
            {
                name: "ArtworkVerificationUnavailableError",
                code: "ARTWORK_VERIFICATION_UNAVAILABLE",
                stage: "text_policy_verification",
                provider: "openai",
                model: "gpt-4o-mini",
                sourceProvider: "genai",
                sourceModel: "gemini-3-pro-image",
                statusCode: 429,
                providerCode: "insufficient_quota",
                requestId: "req_safe_verification_429",
                retryable: true,
            }
        ));

        const response = await POST(
            new Request("http://localhost/api/dtf/generate") as NextRequest
        );
        const payload = await response.json();

        expect(response.status).toBe(503);
        expect(payload).toMatchObject({
            ok: false,
            code: "ARTWORK_VERIFICATION_UNAVAILABLE",
            retryable: true,
        });
        expect(JSON.stringify(payload)).not.toContain("OpenAI");
        expect(JSON.stringify(payload)).not.toContain("insufficient_quota");
        expect(mockReleaseDailyQuota).toHaveBeenCalledTimes(1);
        expect(mockRecordGenerationFailure).not.toHaveBeenCalled();
        expect(mockGetWashaDtfErrorDetails).not.toHaveBeenCalled();
        expect(
            mockLogDtfTrace.mock.calls.some(
                (call) => call[2] === "provider_failed"
            )
        ).toBe(false);
        const failureLog = mockLogDtfTrace.mock.calls.find(
            (call) => call[2] === "artwork_verification_unavailable"
        );
        expect(failureLog?.[3]).toMatchObject({
            verificationProvider: "openai",
            verificationModel: "gpt-4o-mini",
            sourceProvider: "genai",
            sourceModel: "gemini-3-pro-image",
            providerStatus: 429,
            providerCode: "insufficient_quota",
            providerRequestId: "req_safe_verification_429",
            statusCode: 503,
            errorCode: "ARTWORK_VERIFICATION_UNAVAILABLE",
        });
    });

    it("classifies post-provider print validation independently from provider failure", async () => {
        mockGenerateMockup.mockRejectedValue(new ArtworkPrintValidationError({
            message: "Normalized artwork failed print validation: unsafe internal detail.",
            stage: "validation",
            diagnostics: {
                input: {
                    declaredMimeType: "image/jpeg",
                    magicBytesFormat: "jpeg",
                    width: 1024,
                    height: 1024,
                    hasAlphaChannel: false,
                    transparentPixelRatio: 0,
                },
                output: {
                    detectedFormat: "png",
                    hasAlphaChannel: true,
                    transparentPixelRatio: 0.25,
                },
            },
            validationErrors: ["Artwork contains an opaque background panel."],
        }));

        const response = await POST(
            new Request("http://localhost/api/dtf/generate") as NextRequest
        );
        const payload = await response.json();

        expect(response.status).toBe(422);
        expect(payload).toMatchObject({
            ok: false,
            code: "ARTWORK_PRINT_VALIDATION_FAILED",
            retryable: false,
        });
        expect(JSON.stringify(payload)).not.toContain("unsafe internal detail");
        expect(JSON.stringify(payload)).not.toContain("opaque background panel");
        expect(mockRecordGenerationFailure).not.toHaveBeenCalled();
        expect(mockRecordGenerationSuccess).not.toHaveBeenCalled();
        expect(mockGetWashaDtfErrorDetails).not.toHaveBeenCalled();
        expect(mockReleaseDailyQuota).toHaveBeenCalledTimes(1);
        expect(
            mockLogDtfTrace.mock.calls.some(
                (call) => call[2] === "provider_failed"
            )
        ).toBe(false);
        const validationLog = mockLogDtfTrace.mock.calls.find(
            (call) => call[2] === "artwork_print_validation_failed"
        );
        expect(validationLog?.[3]).toMatchObject({
            resolvedProvider: "genai",
            resolvedModel: "gemini-3-pro-image",
            statusCode: 422,
            errorCode: "ARTWORK_PRINT_VALIDATION_FAILED",
            errorStage: "validation",
        });
        expect(mockLogActivity).toHaveBeenCalledWith(expect.objectContaining({
            status: "error",
            errorMessage: expect.not.stringContaining("unsafe internal detail"),
            metadata: expect.objectContaining({
                errorCode: "ARTWORK_PRINT_VALIDATION_FAILED",
            }),
        }));
    });

    it("classifies invalid artwork placement independently from provider failure", async () => {
        vi.stubEnv("WASHA_STRUCTURED_USER_ACTIONS_ENABLED", "true");
        mockGenerateMockup.mockRejectedValue(new ArtworkPlacementError({
            message: "Artwork placement is clipped by the printable safe area.",
            diagnostics: {
                reason: "pixel_placement_outside_safe_area",
                printAreaPixels: { left: 369, top: 246, width: 1311, height: 1556 },
                artworkPixels: { left: 370, top: 328, width: 1311, height: 1391 },
            },
        }));

        const response = await POST(
            new Request("http://localhost/api/dtf/generate") as NextRequest
        );
        const payload = await response.json();

        expect(response.status).toBe(422);
        expect(payload).toMatchObject({
            ok: false,
            code: "ARTWORK_PLACEMENT_INVALID",
            userAction: "none",
            retryAfterMs: null,
            retryable: false,
        });
        expect(response.headers.get("X-Washa-User-Action")).toBe("none");
        expect(response.headers.get("Retry-After")).toBeNull();
        expect(JSON.stringify(payload)).not.toContain("1311");
        expect(mockRecordGenerationFailure).not.toHaveBeenCalled();
        expect(mockRecordGenerationSuccess).not.toHaveBeenCalled();
        expect(mockGetWashaDtfErrorDetails).not.toHaveBeenCalled();
        expect(mockReleaseDailyQuota).toHaveBeenCalledTimes(1);
        expect(
            mockLogDtfTrace.mock.calls.some(
                (call) => call[2] === "provider_failed"
            )
        ).toBe(false);
        const placementLog = mockLogDtfTrace.mock.calls.find(
            (call) => call[2] === "artwork_placement_failed"
        );
        expect(placementLog?.[3]).toMatchObject({
            resolvedProvider: "genai",
            resolvedModel: "gemini-3-pro-image",
            statusCode: 422,
            errorCode: "ARTWORK_PLACEMENT_INVALID",
            errorStage: "placement",
            diagnostics: expect.objectContaining({
                reason: "pixel_placement_outside_safe_area",
            }),
        });
    });

    it("keeps the public error safe while server diagnostics retain both provider failures", async () => {
        const secret = "gemini-secret-that-must-never-appear";
        const originalError = new Error(`Gemini failed api_key=${secret}`);
        const providerError = new WashaDtfProviderChainError([
            {
                provider: "genai",
                model: "gemini-3-pro-image",
                attempt: 1,
                durationMs: 100,
                status: "RESOURCE_EXHAUSTED",
                code: 429,
                message: "Gemini quota failed [credential-omitted]",
            },
            {
                provider: "openai",
                model: "gpt-image-1",
                attempt: 2,
                durationMs: 20,
                status: 400,
                code: "billing_hard_limit_reached",
                message: "Billing hard limit has been reached.",
            },
        ], originalError);
        mockGenerateMockup.mockRejectedValue(providerError);

        const response = await POST(new Request("http://localhost/api/dtf/generate") as NextRequest);
        const payload = await response.json();

        expect(payload).toMatchObject({
            ok: false,
            code: "IMAGE_PROVIDER_UNAVAILABLE",
            message: "تعذر إنشاء التصميم الآن. عدّل الوصف قليلًا أو جرّب مرة أخرى بعد لحظات.",
        });
        expect(JSON.stringify(payload)).not.toContain("Gemini quota");
        expect(JSON.stringify(payload)).not.toContain("Billing hard limit");

        const failureLog = mockLogDtfTrace.mock.calls.find(
            (call) => call[2] === "provider_failed"
        );
        expect(failureLog?.[3]).toMatchObject({
            resolvedProvider: "genai",
            attemptedProvider: "openai",
            attemptedModel: "gpt-image-1",
            providerAttempt: 2,
            providerAttempts: [
                expect.objectContaining({ provider: "genai", code: 429 }),
                expect.objectContaining({
                    provider: "openai",
                    code: "billing_hard_limit_reached",
                }),
            ],
        });
        expect(JSON.stringify(mockLogDtfTrace.mock.calls)).not.toContain(secret);
    });

    it("blocks an automatic retry when a failed generation quota could not be restored", async () => {
        mockGenerateMockup.mockRejectedValue(new Error("provider timeout"));
        mockReleaseDailyQuota.mockResolvedValue(false);
        mockGetWashaDtfErrorDetails.mockReturnValue({
            message: "انتهت مهلة التوليد من المزود الخارجي.",
            status: 504,
        });

        const response = await POST(new Request("http://localhost/api/dtf/generate") as NextRequest);

        expect(response.status).toBe(500);
        await expect(response.json()).resolves.toMatchObject({
            ok: false,
            code: "INTERNAL_ERROR",
            retryable: false,
        });
        expect(mockLogActivity).toHaveBeenCalledWith(expect.objectContaining({
            metadata: expect.objectContaining({ quotaReleased: false }),
        }));
    });
});
