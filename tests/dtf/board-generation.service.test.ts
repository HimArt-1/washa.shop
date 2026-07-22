import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_BOARD_PROMPT_TEMPLATE } from "@/lib/washa-board-prompt";

const {
    mockGetSupabaseAdminClient,
    mockGetBoardPromptTemplate,
    mockGenerateContent,
    mockExtractGeneratedImageDataUrl,
    mockRunOpenAIGenerateDataUrl,
    mockRunNanoBananaDataUrl,
    mockRunReplicatePredictions,
    mockGenerateBoardProviderImage,
    mockUploadOptimizedImage,
    mockLogDtfTrace,
} = vi.hoisted(() => ({
    mockGetSupabaseAdminClient: vi.fn(),
    mockGetBoardPromptTemplate: vi.fn(),
    mockGenerateContent: vi.fn(),
    mockExtractGeneratedImageDataUrl: vi.fn(),
    mockRunOpenAIGenerateDataUrl: vi.fn(),
    mockRunNanoBananaDataUrl: vi.fn(),
    mockRunReplicatePredictions: vi.fn(),
    mockGenerateBoardProviderImage: vi.fn(),
    mockUploadOptimizedImage: vi.fn(),
    mockLogDtfTrace: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
    getSupabaseAdminClient: mockGetSupabaseAdminClient,
}));

vi.mock("@/lib/washa-generation-mode", () => ({
    getBoardPromptTemplate: mockGetBoardPromptTemplate,
}));

vi.mock("@/lib/washa-dtf-studio", () => ({
    getWashaDtfGenAiClient: () => ({
        models: { generateContent: mockGenerateContent },
    }),
    extractGeneratedImageDataUrl: mockExtractGeneratedImageDataUrl,
}));

vi.mock("@/lib/openai-image", () => ({
    runOpenAIGenerateDataUrl: mockRunOpenAIGenerateDataUrl,
}));

vi.mock("@/lib/gemini-rest-image", () => ({
    runNanoBananaDataUrl: mockRunNanoBananaDataUrl,
}));

vi.mock("@/lib/replicate-predictions", () => ({
    FLUX_SCHNELL: "black-forest-labs/flux-schnell",
    runReplicatePredictions: mockRunReplicatePredictions,
}));

vi.mock(
    "@/app/api/washa-dtf-studio/services/board-image-provider.adapter",
    async (importOriginal) => {
        const actual = await importOriginal<typeof import(
            "@/app/api/washa-dtf-studio/services/board-image-provider.adapter"
        )>();
        mockGenerateBoardProviderImage.mockImplementation(
            actual.generateBoardProviderImage
        );
        return {
            ...actual,
            generateBoardProviderImage: mockGenerateBoardProviderImage,
        };
    }
);

vi.mock("@/lib/storage/upload-optimized-image", () => ({
    uploadOptimizedImage: mockUploadOptimizedImage,
}));

vi.mock("@/app/api/washa-dtf-studio/utils/trace", () => ({
    logDtfTrace: mockLogDtfTrace,
}));

import { generateBoard } from "@/app/api/washa-dtf-studio/services/board-generation.service";

const validInput = {
    profileId: "11111111-1111-4111-8111-111111111111",
    generationRequestId: "board_request_trace_001",
    prompt: "Geometric falcon with gold linework",
    generationContext: {
        garmentType: "oversized t-shirt",
        garmentColor: "Desert Sand",
        designMethod: "image" as const,
        technique: "embroidery",
        printPosition: "chest" as const,
        printSize: "large" as const,
        printScale: 80,
    },
};

function createSupabaseHarness(existing: Record<string, unknown> | null = null) {
    const state: { row: Record<string, unknown> | null } = {
        row: existing ? { ...existing } : null,
    };
    const maybeSingle = vi.fn(async () => ({ data: state.row, error: null }));
    const selectEq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq: selectEq }));
    const insert = vi.fn(async (
        payload: Record<string, unknown>
    ): Promise<{ error: { message: string } | null }> => {
        state.row = { ...payload };
        return { error: null };
    });
    const updateEq = vi.fn(async (_column: string, id: unknown) => {
        if (!state.row || state.row.id !== id) {
            return { error: { message: "board row not found" } };
        }
        return { error: null };
    });
    const update = vi.fn((payload: Record<string, unknown>) => {
        if (state.row) Object.assign(state.row, payload);
        return { eq: updateEq };
    });
    const remove = vi.fn(async () => ({ error: null }));
    const from = vi.fn((table: string) => {
        if (table !== "washa_board_requests") {
            throw new Error(`Unexpected table: ${table}`);
        }
        return { select, insert, update };
    });
    const storageFrom = vi.fn(() => ({ remove }));
    const client = { from, storage: { from: storageFrom } };
    mockGetSupabaseAdminClient.mockReturnValue(client);
    return {
        state,
        maybeSingle,
        insert,
        update,
        remove,
        client,
    };
}

describe("board generation service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubEnv("WASHA_DTF_IMAGE_PROVIDER", "genai");
        vi.stubEnv("WASHA_DTF_GENAI_MODEL", "gemini-board-test");
        vi.stubEnv("WASHA_DTF_PROVIDER_FALLBACK", "true");
        vi.stubEnv("GEMINI_API_KEY", "configured-test-key");
        vi.stubEnv("OPENAI_API_KEY", "configured-openai-key");

        mockGetBoardPromptTemplate.mockResolvedValue(DEFAULT_BOARD_PROMPT_TEMPLATE);
        mockGenerateContent.mockResolvedValue({ candidates: [{ content: { parts: [] } }] });
        mockExtractGeneratedImageDataUrl.mockReturnValue("data:image/png;base64,iVBORw0KGgo=");
        mockRunOpenAIGenerateDataUrl.mockResolvedValue("data:image/png;base64,iVBORw0KGgo=");
        mockRunNanoBananaDataUrl.mockResolvedValue("data:image/png;base64,iVBORw0KGgo=");
        mockRunReplicatePredictions.mockResolvedValue({
            urls: ["data:image/png;base64,iVBORw0KGgo="],
        });
        mockUploadOptimizedImage.mockResolvedValue({
            path: "board-previews/2026/07/board-id/generated-board.webp",
            publicUrl: "https://cdn.example/board-previews/generated-board.webp",
            extension: "webp",
            contentType: "image/webp",
        });
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    it("returns a ready WebP board and preserves the complete generation context", async () => {
        const database = createSupabaseHarness();

        await expect(generateBoard(validInput)).resolves.toMatchObject({
            ok: true,
            boardImageUrl: "https://cdn.example/board-previews/generated-board.webp",
            boardRequestId: expect.any(String),
        });

        expect(database.insert).toHaveBeenCalledOnce();
        expect(mockGenerateBoardProviderImage).toHaveBeenCalledOnce();
        expect(mockGenerateBoardProviderImage).toHaveBeenCalledWith(expect.objectContaining({
            prompt: expect.stringContaining(
                "front chest at an approximate size of 24cm × 32cm"
            ),
            configuration: expect.objectContaining({
                provider: "genai",
                model: "gemini-board-test",
            }),
            traceId: validInput.generationRequestId,
        }));
        expect(mockGenerateContent).toHaveBeenCalledOnce();
        expect(mockRunOpenAIGenerateDataUrl).not.toHaveBeenCalled();
        expect(mockUploadOptimizedImage).toHaveBeenCalledWith(expect.objectContaining({
            bucket: "smart-store",
            folder: expect.stringMatching(/^board-previews\/\d{4}\/\d{2}\/[0-9a-f-]{36}$/),
            originalFileName: expect.stringMatching(/^board-[0-9a-f-]{36}\.png$/),
            contentType: "image/png",
            profile: "mockup",
            createThumbnail: false,
            uploadOriginal: false,
        }));
        expect(database.state.row).toMatchObject({
            profile_id: validInput.profileId,
            generation_request_id: validInput.generationRequestId,
            generation_context: validInput.generationContext,
            board_image_url: "https://cdn.example/board-previews/generated-board.webp",
            provider: "genai",
            generation_model: "gemini-board-test",
            status: "ready",
            manual_print_status: "pending",
        });
        expect(database.state.row?.prompt).toEqual(expect.stringContaining(
            "front chest at an approximate size of 24cm × 32cm"
        ));
    });

    it.each([
        ["openai", "OPENAI_API_KEY", "mockRunOpenAIGenerateDataUrl"],
        ["nanobanana", "GEMINI_API_KEY", "mockRunNanoBananaDataUrl"],
        ["replicate", "REPLICATE_API_TOKEN", "mockRunReplicatePredictions"],
    ] as const)(
        "uses only the resolved %s provider and persists its truthful metadata",
        async (provider, credentialName, expectedMockName) => {
            vi.stubEnv("WASHA_DTF_IMAGE_PROVIDER", provider);
            vi.stubEnv(credentialName, "configured-test-key");
            const database = createSupabaseHarness();

            await expect(generateBoard(validInput)).resolves.toMatchObject({ ok: true });

            const providerMocks = {
                mockRunOpenAIGenerateDataUrl,
                mockRunNanoBananaDataUrl,
                mockRunReplicatePredictions,
            };
            expect(providerMocks[expectedMockName]).toHaveBeenCalledOnce();
            expect(database.state.row).toMatchObject({
                provider,
                status: "ready",
            });
        }
    );

    it("marks provider failure without invoking a hidden fallback or storage", async () => {
        const database = createSupabaseHarness();
        mockGenerateContent.mockRejectedValue(new Error("provider unavailable"));

        await expect(generateBoard(validInput)).resolves.toMatchObject({
            ok: false,
            code: "IMAGE_PROVIDER_UNAVAILABLE",
            boardRequestId: expect.any(String),
        });

        expect(database.state.row).toMatchObject({ status: "failed" });
        expect(mockRunOpenAIGenerateDataUrl).not.toHaveBeenCalled();
        expect(mockRunNanoBananaDataUrl).not.toHaveBeenCalled();
        expect(mockRunReplicatePredictions).not.toHaveBeenCalled();
        expect(mockUploadOptimizedImage).not.toHaveBeenCalled();
    });

    it("classifies malformed provider image bytes as provider failure before storage", async () => {
        const database = createSupabaseHarness();
        mockExtractGeneratedImageDataUrl.mockReturnValue(
            "data:image/png;base64,QUJDRA=="
        );

        await expect(generateBoard(validInput)).resolves.toMatchObject({
            ok: false,
            code: "IMAGE_PROVIDER_UNAVAILABLE",
        });

        expect(database.state.row).toMatchObject({ status: "failed" });
        expect(mockUploadOptimizedImage).not.toHaveBeenCalled();
    });

    it("materializes a remote provider URL before the WebP upload", async () => {
        vi.stubEnv("WASHA_DTF_IMAGE_PROVIDER", "replicate");
        vi.stubEnv("REPLICATE_API_TOKEN", "configured-test-key");
        mockRunReplicatePredictions.mockResolvedValue({
            urls: ["https://replicate.example/board.png"],
        });
        const remoteFetch = vi.fn().mockResolvedValue(new Response(
            Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
            {
                status: 200,
                headers: {
                    "content-type": "image/png",
                    "content-length": "8",
                },
            }
        ));
        vi.stubGlobal("fetch", remoteFetch);
        createSupabaseHarness();

        await expect(generateBoard(validInput)).resolves.toMatchObject({ ok: true });

        expect(remoteFetch).toHaveBeenCalledWith(
            new URL("https://replicate.example/board.png"),
            expect.objectContaining({
                cache: "no-store",
                redirect: "error",
                signal: expect.any(AbortSignal),
            })
        );
        expect(mockUploadOptimizedImage).toHaveBeenCalledWith(expect.objectContaining({
            contentType: "image/png",
            file: expect.any(Buffer),
        }));
    });

    it("creates a failed row without an external request when credentials are missing", async () => {
        vi.stubEnv("GEMINI_API_KEY", "");
        const database = createSupabaseHarness();

        await expect(generateBoard(validInput)).resolves.toMatchObject({
            ok: false,
            code: "IMAGE_PROVIDER_UNAVAILABLE",
        });

        expect(database.state.row).toMatchObject({ status: "failed" });
        expect(mockGenerateContent).not.toHaveBeenCalled();
        expect(mockUploadOptimizedImage).not.toHaveBeenCalled();
    });

    it("marks the row failed when WebP storage upload fails", async () => {
        const database = createSupabaseHarness();
        mockUploadOptimizedImage.mockRejectedValue(new Error("storage unavailable"));

        await expect(generateBoard(validInput)).resolves.toMatchObject({
            ok: false,
            code: "BOARD_STORAGE_UNAVAILABLE",
        });

        expect(database.state.row).toMatchObject({
            status: "failed",
            board_image_url: null,
        });
    });

    it("removes an optimizer fallback instead of serving a PNG board", async () => {
        const database = createSupabaseHarness();
        mockUploadOptimizedImage.mockResolvedValueOnce({
            path: "board-previews/2026/07/board-id/generated-board.png",
            publicUrl: "https://cdn.example/board-previews/generated-board.png",
            extension: "png",
            contentType: "image/png",
        });

        await expect(generateBoard(validInput)).resolves.toMatchObject({
            ok: false,
            code: "BOARD_STORAGE_UNAVAILABLE",
        });

        expect(database.remove).toHaveBeenCalledWith([
            "board-previews/2026/07/board-id/generated-board.png",
        ]);
        expect(database.state.row).toMatchObject({
            status: "failed",
            board_image_url: null,
        });
    });

    it("does not call the provider when the processing row cannot be inserted", async () => {
        const database = createSupabaseHarness();
        database.insert.mockResolvedValueOnce({
            error: { message: "database unavailable" },
        });

        await expect(generateBoard(validInput)).resolves.toEqual({
            ok: false,
            code: "BOARD_PERSISTENCE_FAILED",
        });

        expect(mockGenerateContent).not.toHaveBeenCalled();
        expect(mockUploadOptimizedImage).not.toHaveBeenCalled();
    });

    it("converts a thrown persistence read into a closed failure result", async () => {
        const database = createSupabaseHarness();
        database.maybeSingle.mockRejectedValueOnce(new Error("database timed out"));

        await expect(generateBoard(validInput)).resolves.toEqual({
            ok: false,
            code: "BOARD_PERSISTENCE_FAILED",
        });

        expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it("replays the winning processing row when concurrent insertion loses the unique race", async () => {
        const database = createSupabaseHarness();
        database.insert.mockImplementationOnce(async () => {
            database.state.row = {
                id: "22222222-2222-4222-8222-222222222222",
                profile_id: validInput.profileId,
                board_image_url: null,
                status: "processing",
            };
            return { error: { message: "duplicate generation_request_id" } };
        });

        await expect(generateBoard(validInput)).resolves.toEqual({
            ok: false,
            code: "BOARD_GENERATION_IN_PROGRESS",
            boardRequestId: "22222222-2222-4222-8222-222222222222",
        });

        expect(mockGenerateContent).not.toHaveBeenCalled();
        expect(mockUploadOptimizedImage).not.toHaveBeenCalled();
    });

    it("uses the approved prompt if an unexpected settings exception escapes its fail-safe getter", async () => {
        createSupabaseHarness();
        mockGetBoardPromptTemplate.mockRejectedValueOnce(new Error("settings unavailable"));

        await expect(generateBoard(validInput)).resolves.toMatchObject({ ok: true });
        expect(mockGenerateContent).toHaveBeenCalledOnce();
    });

    it("removes the exact WebP object when the final ready update fails", async () => {
        const database = createSupabaseHarness();
        database.update.mockImplementationOnce(() => ({
            eq: vi.fn(async () => ({
                error: { message: "ready update failed" },
            })),
        }));

        await expect(generateBoard(validInput)).resolves.toMatchObject({
            ok: false,
            code: "BOARD_PERSISTENCE_FAILED",
        });

        expect(database.remove).toHaveBeenCalledWith([
            "board-previews/2026/07/board-id/generated-board.webp",
        ]);
        expect(database.state.row).toMatchObject({ status: "failed" });
    });

    it("replays an existing ready board only for its owning profile", async () => {
        createSupabaseHarness({
            id: "22222222-2222-4222-8222-222222222222",
            profile_id: validInput.profileId,
            board_image_url: "https://cdn.example/existing-board.webp",
            status: "ready",
        });

        await expect(generateBoard(validInput)).resolves.toEqual({
            ok: true,
            boardImageUrl: "https://cdn.example/existing-board.webp",
            boardRequestId: "22222222-2222-4222-8222-222222222222",
        });
        expect(mockGenerateContent).not.toHaveBeenCalled();
        expect(mockUploadOptimizedImage).not.toHaveBeenCalled();
    });

    it("never returns an existing board owned by another profile", async () => {
        createSupabaseHarness({
            id: "22222222-2222-4222-8222-222222222222",
            profile_id: "33333333-3333-4333-8333-333333333333",
            board_image_url: "https://cdn.example/private-other-board.webp",
            status: "ready",
        });

        await expect(generateBoard(validInput)).resolves.toEqual({
            ok: false,
            code: "BOARD_PERSISTENCE_FAILED",
        });
        expect(mockGenerateContent).not.toHaveBeenCalled();
        expect(mockUploadOptimizedImage).not.toHaveBeenCalled();
    });

    it("does not duplicate an existing processing request", async () => {
        createSupabaseHarness({
            id: "22222222-2222-4222-8222-222222222222",
            profile_id: validInput.profileId,
            board_image_url: null,
            status: "processing",
        });

        await expect(generateBoard(validInput)).resolves.toEqual({
            ok: false,
            code: "BOARD_GENERATION_IN_PROGRESS",
            boardRequestId: "22222222-2222-4222-8222-222222222222",
        });
        expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it("rejects invalid board input before opening a persistence connection", async () => {
        await expect(generateBoard({
            ...validInput,
            profileId: "not-a-profile-id",
        })).resolves.toEqual({
            ok: false,
            code: "INVALID_BOARD_INPUT",
        });

        expect(mockGetSupabaseAdminClient).not.toHaveBeenCalled();
        expect(mockGenerateContent).not.toHaveBeenCalled();
    });
});
