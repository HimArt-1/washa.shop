import "server-only";

import {
    generationContextSchema,
    type GenerationContext,
} from "@/app/api/washa-dtf-studio/validators/ai-studio.schema";
import { logDtfTrace } from "@/app/api/washa-dtf-studio/utils/trace";
import {
    decodeBoardImageDataUrl,
    generateBoardProviderImage,
} from "@/app/api/washa-dtf-studio/services/board-image-provider.adapter";
import { serializeJsonValue } from "@/lib/json-value";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { uploadOptimizedImage } from "@/lib/storage/upload-optimized-image";
import { resolveWashaDtfProviderConfiguration } from "@/lib/washa-dtf-provider-config";
import { getBoardPromptTemplate } from "@/lib/washa-generation-mode";
import {
    DEFAULT_BOARD_PROMPT_TEMPLATE,
    renderBoardPrompt,
} from "@/lib/washa-board-prompt";
import type {
    Database,
    WashaBoardGenerationContext,
    WashaBoardRequest,
} from "@/types/database";

export interface BoardGenerationInput {
    profileId: string;
    generationRequestId: string;
    prompt: string;
    generationContext: GenerationContext;
}

export type BoardGenerationCode =
    | "INVALID_BOARD_INPUT"
    | "BOARD_GENERATION_IN_PROGRESS"
    | "IMAGE_PROVIDER_UNAVAILABLE"
    | "BOARD_STORAGE_UNAVAILABLE"
    | "BOARD_PERSISTENCE_FAILED";

export interface BoardGenerationResult {
    ok: boolean;
    boardImageUrl?: string;
    boardRequestId?: string;
    code?: BoardGenerationCode;
}

type BoardSupabaseClient = ReturnType<typeof getSupabaseAdminClient>;
type ExistingBoard = Pick<
    WashaBoardRequest,
    "id" | "profile_id" | "board_image_url" | "status"
>;

const BOARD_BUCKET = "smart-store";
const PROFILE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GENERATION_REQUEST_ID_PATTERN = /^[a-zA-Z0-9_-]{8,128}$/;

function failure(
    code: BoardGenerationCode,
    boardRequestId?: string
): BoardGenerationResult {
    return {
        ok: false,
        code,
        ...(boardRequestId ? { boardRequestId } : {}),
    };
}

function parseInput(input: BoardGenerationInput) {
    const profileId = input.profileId.trim();
    const generationRequestId = input.generationRequestId.trim();
    const prompt = input.prompt.trim();
    const contextResult = generationContextSchema.safeParse(input.generationContext);
    if (
        !PROFILE_ID_PATTERN.test(profileId)
        || !GENERATION_REQUEST_ID_PATTERN.test(generationRequestId)
        || prompt.length === 0
        || prompt.length > 12_000
        || !contextResult.success
    ) {
        return null;
    }

    const serializedContext = serializeJsonValue(
        contextResult.data,
        "board generation context"
    );
    if (
        !serializedContext
        || typeof serializedContext !== "object"
        || Array.isArray(serializedContext)
    ) {
        return null;
    }

    return {
        profileId,
        generationRequestId,
        prompt,
        generationContext: contextResult.data,
        storedGenerationContext: serializedContext as WashaBoardGenerationContext,
    };
}

async function findExistingBoard(
    supabase: BoardSupabaseClient,
    generationRequestId: string
) {
    return supabase
        .from("washa_board_requests")
        .select("id, profile_id, board_image_url, status")
        .eq("generation_request_id", generationRequestId)
        .maybeSingle();
}

function replayExistingBoard(
    existing: ExistingBoard,
    profileId: string,
    generationRequestId: string
): BoardGenerationResult {
    if (existing.profile_id !== profileId) {
        logDtfTrace("dtf.board.generate", generationRequestId, "board_replay_owner_mismatch", {
            board_request_id: existing.id,
        });
        return failure("BOARD_PERSISTENCE_FAILED");
    }
    if (existing.status === "ready" && existing.board_image_url) {
        return {
            ok: true,
            boardImageUrl: existing.board_image_url,
            boardRequestId: existing.id,
        };
    }
    if (existing.status === "processing") {
        return failure("BOARD_GENERATION_IN_PROGRESS", existing.id);
    }
    return failure("BOARD_PERSISTENCE_FAILED", existing.id);
}

async function markBoardFailed(
    supabase: BoardSupabaseClient,
    boardRequestId: string
) {
    try {
        const { error } = await supabase
            .from("washa_board_requests")
            .update({ status: "failed", board_image_url: null })
            .eq("id", boardRequestId);
        return !error;
    } catch {
        return false;
    }
}

async function finalizeFailedBoard(input: {
    supabase: BoardSupabaseClient;
    boardRequestId: string;
    generationRequestId: string;
    requestedCode:
        | "IMAGE_PROVIDER_UNAVAILABLE"
        | "BOARD_STORAGE_UNAVAILABLE"
        | "BOARD_PERSISTENCE_FAILED";
    event?: "board_provider_failed" | "board_storage_failed";
    eventDetails?: Record<string, unknown>;
}) {
    const markedFailed = await markBoardFailed(
        input.supabase,
        input.boardRequestId
    );
    const resultCode = markedFailed
        ? input.requestedCode
        : "BOARD_PERSISTENCE_FAILED";
    if (input.event) {
        logDtfTrace(
            "dtf.board.generate",
            input.generationRequestId,
            input.event,
            {
                board_request_id: input.boardRequestId,
                ...input.eventDetails,
            }
        );
    }
    logDtfTrace(
        "dtf.board.generate",
        input.generationRequestId,
        "board_request_failed",
        {
            board_request_id: input.boardRequestId,
            code: resultCode,
        }
    );
    return failure(resultCode, input.boardRequestId);
}

async function removeUploadedBoard(
    supabase: BoardSupabaseClient,
    path: string,
    generationRequestId: string
) {
    try {
        const { error } = await supabase.storage.from(BOARD_BUCKET).remove([path]);
        if (error) {
            logDtfTrace("dtf.board.generate", generationRequestId, "board_storage_cleanup_failed", {});
        }
    } catch {
        logDtfTrace("dtf.board.generate", generationRequestId, "board_storage_cleanup_failed", {});
    }
}

function boardStorageFolder(boardRequestId: string, now = new Date()) {
    const year = now.getUTCFullYear().toString();
    const month = (now.getUTCMonth() + 1).toString().padStart(2, "0");
    return `board-previews/${year}/${month}/${boardRequestId}`;
}

export async function generateBoard(
    input: BoardGenerationInput
): Promise<BoardGenerationResult> {
    let parsedInput: ReturnType<typeof parseInput>;
    try {
        parsedInput = parseInput(input);
    } catch {
        return failure("INVALID_BOARD_INPUT");
    }
    if (!parsedInput) return failure("INVALID_BOARD_INPUT");

    let supabase: BoardSupabaseClient;
    try {
        supabase = getSupabaseAdminClient();
    } catch {
        return failure("BOARD_PERSISTENCE_FAILED");
    }

    let existingResult: Awaited<ReturnType<typeof findExistingBoard>>;
    try {
        existingResult = await findExistingBoard(
            supabase,
            parsedInput.generationRequestId
        );
    } catch {
        return failure("BOARD_PERSISTENCE_FAILED");
    }
    if (existingResult.error) return failure("BOARD_PERSISTENCE_FAILED");
    if (existingResult.data) {
        return replayExistingBoard(
            existingResult.data,
            parsedInput.profileId,
            parsedInput.generationRequestId
        );
    }

    let template = DEFAULT_BOARD_PROMPT_TEMPLATE;
    try {
        template = await getBoardPromptTemplate();
    } catch {
        // The operational getter is fail-safe already; retain a local guard so
        // no unexpected settings-client failure escapes the service boundary.
    }
    const renderedPrompt = renderBoardPrompt({
        template,
        prompt: parsedInput.prompt,
        generationContext: parsedInput.generationContext,
    });
    const providerConfiguration = resolveWashaDtfProviderConfiguration();
    const boardRequestId = crypto.randomUUID();
    const processingRow: Database["public"]["Tables"]["washa_board_requests"]["Insert"] = {
        id: boardRequestId,
        profile_id: parsedInput.profileId,
        generation_request_id: parsedInput.generationRequestId,
        prompt: renderedPrompt,
        generation_context: parsedInput.storedGenerationContext,
        board_image_url: null,
        provider: providerConfiguration.provider,
        generation_model: providerConfiguration.model,
        status: "processing",
        manual_print_status: "pending",
    };
    let insertError: unknown;
    try {
        const insertResult = await supabase
            .from("washa_board_requests")
            .insert(processingRow);
        insertError = insertResult.error;
    } catch (error) {
        insertError = error;
    }
    if (insertError) {
        try {
            const racedExisting = await findExistingBoard(
                supabase,
                parsedInput.generationRequestId
            );
            if (!racedExisting.error && racedExisting.data) {
                return replayExistingBoard(
                    racedExisting.data,
                    parsedInput.profileId,
                    parsedInput.generationRequestId
                );
            }
        } catch {
            // Preserve the original persistence outcome below.
        }
        return failure("BOARD_PERSISTENCE_FAILED");
    }
    logDtfTrace("dtf.board.generate", parsedInput.generationRequestId, "board_request_created", {
        board_request_id: boardRequestId,
        provider: providerConfiguration.provider,
        model: providerConfiguration.model,
    });

    if (
        providerConfiguration.provider === "unsupported"
        || !providerConfiguration.credentialConfigured
    ) {
        return finalizeFailedBoard({
            supabase,
            boardRequestId,
            generationRequestId: parsedInput.generationRequestId,
            requestedCode: "IMAGE_PROVIDER_UNAVAILABLE",
            event: "board_provider_failed",
            eventDetails: {
                provider: providerConfiguration.provider,
                model: providerConfiguration.model,
            },
        });
    }

    let providerImage;
    try {
        logDtfTrace("dtf.board.generate", parsedInput.generationRequestId, "board_provider_started", {
            board_request_id: boardRequestId,
            provider: providerConfiguration.provider,
            model: providerConfiguration.model,
        });
        providerImage = await generateBoardProviderImage({
            prompt: renderedPrompt,
            configuration: providerConfiguration,
            traceId: parsedInput.generationRequestId,
        });
        logDtfTrace("dtf.board.generate", parsedInput.generationRequestId, "board_provider_completed", {
            board_request_id: boardRequestId,
            provider: providerImage.provider,
            model: providerImage.model,
        });
    } catch {
        return finalizeFailedBoard({
            supabase,
            boardRequestId,
            generationRequestId: parsedInput.generationRequestId,
            requestedCode: "IMAGE_PROVIDER_UNAVAILABLE",
            event: "board_provider_failed",
            eventDetails: {
                provider: providerConfiguration.provider,
                model: providerConfiguration.model,
            },
        });
    }

    const uploadInput = decodeBoardImageDataUrl(providerImage.dataUrl);
    let uploadResult;
    try {
        uploadResult = await uploadOptimizedImage({
            supabase,
            bucket: BOARD_BUCKET,
            folder: boardStorageFolder(boardRequestId),
            file: uploadInput.buffer,
            originalFileName: `board-${boardRequestId}.png`,
            contentType: uploadInput.contentType,
            profile: "board",
            createThumbnail: false,
            uploadOriginal: false,
            returnPublicUrl: true,
            metadata: {
                asset_kind: "board-preview",
                board_request_id: boardRequestId,
            },
        });
    } catch {
        return finalizeFailedBoard({
            supabase,
            boardRequestId,
            generationRequestId: parsedInput.generationRequestId,
            requestedCode: "BOARD_STORAGE_UNAVAILABLE",
            event: "board_storage_failed",
        });
    }
    const storedAsWebP = uploadResult.extension.toLowerCase() === "webp"
        && uploadResult.contentType.toLowerCase() === "image/webp"
        && uploadResult.path.toLowerCase().endsWith(".webp");
    if (!uploadResult.publicUrl || !storedAsWebP) {
        await removeUploadedBoard(
            supabase,
            uploadResult.path,
            parsedInput.generationRequestId
        );
        return finalizeFailedBoard({
            supabase,
            boardRequestId,
            generationRequestId: parsedInput.generationRequestId,
            requestedCode: "BOARD_STORAGE_UNAVAILABLE",
            event: "board_storage_failed",
        });
    }
    logDtfTrace("dtf.board.generate", parsedInput.generationRequestId, "board_storage_completed", {
        board_request_id: boardRequestId,
        storage_path: uploadResult.path,
    });

    let readyError: unknown;
    try {
        const readyResult = await supabase
            .from("washa_board_requests")
            .update({
                board_image_url: uploadResult.publicUrl,
                provider: providerImage.provider,
                generation_model: providerImage.model,
                status: "ready",
            })
            .eq("id", boardRequestId);
        readyError = readyResult.error;
    } catch (error) {
        readyError = error;
    }
    if (readyError) {
        await removeUploadedBoard(
            supabase,
            uploadResult.path,
            parsedInput.generationRequestId
        );
        return finalizeFailedBoard({
            supabase,
            boardRequestId,
            generationRequestId: parsedInput.generationRequestId,
            requestedCode: "BOARD_PERSISTENCE_FAILED",
        });
    }

    logDtfTrace("dtf.board.generate", parsedInput.generationRequestId, "board_request_ready", {
        board_request_id: boardRequestId,
        provider: providerImage.provider,
        model: providerImage.model,
    });
    return {
        ok: true,
        boardImageUrl: uploadResult.publicUrl,
        boardRequestId,
    };
}
