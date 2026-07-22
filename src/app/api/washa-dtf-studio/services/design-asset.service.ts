import sharp from "sharp";
import { getSupabaseAdminClient } from "@/lib/supabase";
import {
    buildBlankGarmentPrompt,
    buildIsolatedArtworkPrompt,
} from "@/lib/washa-artwork/prompt";
import {
    generateBlankGarment,
    generateIsolatedArtwork,
} from "@/lib/washa-artwork/provider";
import { materializeImageSource } from "@/lib/washa-artwork/image-source";
import {
    assertMinimumEffectivePrintDpi,
    assertStoredAssetIntegrity,
    sha256Hex,
    validateArtworkPng,
} from "@/lib/washa-artwork/validation";
import {
    ArtworkPrintValidationError,
    isArtworkPrintValidationError,
    normalizeGeneratedArtworkForPrint,
    type ArtworkNormalizationDiagnostics,
} from "@/lib/washa-artwork/normalization";
import {
    buildPlacementTransform,
    getDefaultPrintArea,
    normalizePrintArea,
} from "@/lib/washa-artwork/placement";
import { compositeArtworkPreview } from "@/lib/washa-artwork/compositor";
import { selectSideSpecificCatalogReference } from "@/lib/washa-artwork/mockup-manifest";
import { validateGeneratedBlankGarment } from "@/lib/washa-artwork/mockup-validation";
import {
    resolveDtfMockupTemplate,
    type DtfMockupTemplate,
} from "@/lib/dtf-mockup-templates";
import {
    isArtworkTextPolicyError,
    verifyArtworkTextPolicy,
} from "@/lib/washa-artwork/arabic-text-verification";
import { verifyBlankGarmentSemantics } from "@/lib/washa-artwork/garment-semantic-verification";
import { isArtworkVerificationUnavailableError } from "@/lib/washa-artwork/verification-error";
import type {
    ArtworkGenerationContext,
    ArtworkSide,
    GeneratedArtworkResponse,
    MasterAssetDescriptor,
    MockupSourceType,
    NormalizedPrintArea,
    PlacementTransform,
} from "@/lib/washa-artwork/types";
import { StorageService } from "@/app/api/washa-dtf-studio/services/storage.service";
import {
    GeneratedSourceAssetService,
    type GeneratedSourceAssetDescriptor,
} from "@/app/api/washa-dtf-studio/services/generated-source-asset.service";
import { logDtfTrace } from "@/app/api/washa-dtf-studio/utils/trace";
import { generatePromptNativeArtwork } from "@/lib/washa-prompt-native/openai-artwork.adapter";
import { composePromptNativeMockup } from "@/lib/washa-prompt-native/gemini-mockup.adapter";
import type { WashaGenerationPipeline } from "@/lib/washa-prompt-native/types";

const ARTWORK_NORMALIZATION_SCOPE = "dtf.artwork.normalization";

function asArtworkNormalizationError(params: {
    error: unknown;
    provider: string;
    model: string;
    declaredMimeType: string;
    byteLength: number;
}) {
    return isArtworkPrintValidationError(params.error)
        ? params.error
        : new ArtworkPrintValidationError({
            message: "Generated artwork normalization failed.",
            stage: "normalization",
            diagnostics: {
                attemptedProvider: params.provider,
                attemptedModel: params.model,
                declaredMimeType: params.declaredMimeType,
                byteLength: params.byteLength,
            },
            cause: params.error,
        });
}

type GenerationSelection = {
    garmentId: string | null;
    colorId: string | null;
    sizeId: string | null;
    garmentType: string;
    garmentColor: string;
    colorHex: string | null;
    printPosition: "chest" | "back" | "shoulder_right" | "shoulder_left";
    printSize: "large" | "small";
    printScale?: number | null;
    printOffsetX?: number | null;
    printOffsetY?: number | null;
};

type MockupAssetRow = {
    id: string;
    source_type: MockupSourceType;
    storage_bucket?: string | null;
    storage_path?: string | null;
    image_url: string;
    print_area_id: string;
    print_area: Partial<NormalizedPrintArea> | null;
    anchor_point?: { x?: number; y?: number } | null;
    garment_mask_url: string | null;
    shading_map_url: string | null;
    displacement_map_url: string | null;
    perspective_transform?: {
        matrix?: [number, number, number, number];
        idx?: number;
        idy?: number;
        odx?: number;
        ody?: number;
    } | null;
};

type ResolvedMockupAsset = {
    id: string | null;
    sourceType: MockupSourceType;
    storageBucket: string | null;
    storagePath: string | null;
    imageUrl: string;
    printAreaId: string;
    printArea: NormalizedPrintArea;
    anchorX: number;
    anchorY: number;
    garmentMaskUrl: string | null;
    shadingMapUrl: string | null;
    displacementMapUrl: string | null;
    perspectiveTransform: MockupAssetRow["perspective_transform"];
    configuredRotation: number | null;
    configuredPrintWidthCm: number | null;
    configuredPrintHeightCm: number | null;
};

type GenerateDesignAssetInput = {
    profileId: string;
    generationRequestId: string;
    userIdea: string;
    referenceImage?: { base64: string; mimeType: string } | null;
    legacyGarmentReference?: { base64: string; mimeType: string } | null;
    context: ArtworkGenerationContext;
    selection: GenerationSelection;
    pipeline?: WashaGenerationPipeline;
};

type RecomposeDesignAssetInput = {
    profileId: string;
    designRequestId: string;
    masterAssetId: string;
    selection: GenerationSelection;
    pipeline?: WashaGenerationPipeline;
};

type MasterAssetRow = {
    id: string;
    storage_bucket?: string;
    permanent_storage_path: string;
    permanent_url: string;
    sha256_checksum: string;
    width: number;
    height: number;
    mime_type: "image/png";
    alpha_channel_status: "verified" | "fallback_processed";
    transparent_pixel_ratio: number | string;
    generation_model: string;
    provider: string;
    prompt: string;
    generation_parameters: Record<string, unknown>;
    created_at: string;
    source_asset_id?: string | null;
};

function asNumber(value: number | string) {
    return typeof value === "number" ? value : Number(value);
}

function mapMaster(row: MasterAssetRow): MasterAssetDescriptor {
    return {
        id: row.id,
        permanentStoragePath: row.permanent_storage_path,
        permanentUrl: row.permanent_url,
        checksum: row.sha256_checksum,
        width: row.width,
        height: row.height,
        mimeType: row.mime_type,
        alphaChannelStatus: row.alpha_channel_status,
        transparentPixelRatio: asNumber(row.transparent_pixel_ratio),
        provider: row.provider,
        model: row.generation_model,
        prompt: row.prompt,
        generationParameters: row.generation_parameters,
        createdAt: row.created_at,
        sourceAssetId: row.source_asset_id ?? null,
    };
}

async function materializeOptional(url: string | null) {
    if (!url) return null;
    try {
        return (await materializeImageSource(url)).buffer;
    } catch {
        return null;
    }
}

function isMissingSingleSourceMigration(error: unknown) {
    const message = error instanceof Error ? error.message : String(error ?? "");
    return /washa_(design|garment)_|schema cache|could not find/i.test(message);
}

export class DesignAssetService {
    private static db() {
        return getSupabaseAdminClient() as any;
    }

    private static async resolveCatalogSelection(
        selection: GenerationSelection
    ): Promise<GenerationSelection> {
        if (!selection.garmentId) return selection;
        const sb = DesignAssetService.db();
        const [garmentResult, colorResult, sizeResult] = await Promise.all([
            sb.from("custom_design_garments")
                .select("id, name")
                .eq("id", selection.garmentId)
                .eq("is_active", true)
                .maybeSingle(),
            selection.colorId
                ? sb.from("custom_design_colors")
                    .select("id, garment_id, name, hex_code")
                    .eq("id", selection.colorId)
                    .eq("is_active", true)
                    .maybeSingle()
                : Promise.resolve({ data: null, error: null }),
            selection.sizeId
                ? sb.from("custom_design_sizes")
                    .select("id, garment_id, color_id")
                    .eq("id", selection.sizeId)
                    .eq("is_active", true)
                    .maybeSingle()
                : Promise.resolve({ data: null, error: null }),
        ]);
        const queryError = garmentResult.error || colorResult.error || sizeResult.error;
        if (queryError) throw queryError;
        const garment = garmentResult.data;
        const color = colorResult.data;
        const size = sizeResult.data;
        if (!garment) throw new Error("Selected garment is unavailable.");
        if (selection.colorId && !color) throw new Error("Selected garment color is unavailable.");
        if (selection.sizeId && !size) throw new Error("Selected garment size is unavailable.");
        if (color && color.garment_id !== garment.id) {
            throw new Error("Selected color does not belong to the selected garment.");
        }
        if (size && size.garment_id !== garment.id) {
            throw new Error("Selected size does not belong to the selected garment.");
        }
        if (size?.color_id && color && size.color_id !== color.id) {
            throw new Error("Selected size does not belong to the selected color.");
        }
        return {
            ...selection,
            garmentType: garment.name,
            garmentColor: color?.name || selection.garmentColor,
            colorHex: color?.hex_code || selection.colorHex,
        };
    }

    static async getExistingGeneration(
        profileId: string,
        generationRequestId: string
    ): Promise<GeneratedArtworkResponse | null> {
        const { data: existingRequest, error: existingRequestError } = await DesignAssetService.db()
            .from("washa_design_requests")
            .select("*")
            .eq("profile_id", profileId)
            .eq("generation_request_id", generationRequestId)
            .maybeSingle();
        if (existingRequestError) throw existingRequestError;
        if (!existingRequest || existingRequest.generation_status !== "ready") return null;

        if (
            existingRequest.production_readiness_status === "pending_prepress"
            && existingRequest.source_asset_id
        ) {
            const { source } = await GeneratedSourceAssetService.load(
                profileId,
                existingRequest.source_asset_id
            );
            const selectedPreview = existingRequest.selected_side === "back"
                ? existingRequest.back_preview_url
                : existingRequest.front_preview_url;
            if (!selectedPreview) return null;
            return {
                imageUrl: selectedPreview,
                previewUrl: selectedPreview,
                frontPreviewUrl: existingRequest.front_preview_url,
                backPreviewUrl: existingRequest.back_preview_url,
                designRequestId: existingRequest.id,
                sourceAssetId: source.id,
                sourceAssetUrl: source.permanentUrl,
                sourceChecksum: source.checksum,
                masterAssetId: null,
                masterAssetUrl: null,
                masterChecksum: null,
                mockupSourceType: "source_preview",
                placement: existingRequest.placement_data,
                transparencyVerificationStatus: "pending",
                productionReadinessStatus: "pending_prepress",
                previewKind: "source",
                provider: source.provider,
                model: source.model,
                pipeline: source.generationParameters?.pipeline === "prompt_native"
                    ? "prompt_native"
                    : "standard",
                previewProvider: "source",
            };
        }

        const attempt = await DesignAssetService.loadGenerationAttempt(
            profileId,
            generationRequestId
        );
        if (!attempt || attempt.request.generation_status !== "ready") return null;
        const { request, masterRow: master, source } = attempt;
        const selectedPreview = request.selected_side === "back"
            ? request.back_preview_url
            : request.front_preview_url;
        if (!selectedPreview || !request.mockup_source_type) return null;

        return {
            imageUrl: selectedPreview,
            previewUrl: selectedPreview,
            frontPreviewUrl: request.front_preview_url,
            backPreviewUrl: request.back_preview_url,
            designRequestId: request.id,
            sourceAssetId: source?.id ?? master.id,
            sourceAssetUrl: source?.permanentUrl ?? master.permanent_url,
            sourceChecksum: source?.checksum ?? master.sha256_checksum,
            masterAssetId: master.id,
            masterAssetUrl: master.permanent_url,
            masterChecksum: master.sha256_checksum,
            mockupSourceType: request.mockup_source_type,
            placement: request.placement_data,
            transparencyVerificationStatus: request.transparency_verification_status,
            productionReadinessStatus: "ready",
            previewKind: request.preview_kind === "source" ? "source" : "mockup",
            provider: master.provider,
            model: master.generation_model,
            pipeline: master.generation_parameters?.pipeline === "prompt_native"
                ? "prompt_native"
                : "standard",
            previewProvider: request.preview_kind === "source"
                ? "source"
                : master.generation_parameters?.pipeline === "prompt_native"
                    ? "gemini"
                    : "sharp",
        };
    }

    static async hasPersistedGenerationAttempt(
        profileId: string,
        generationRequestId: string
    ) {
        const { data, error } = await DesignAssetService.db()
            .from("washa_design_requests")
            .select("id")
            .eq("profile_id", profileId)
            .eq("generation_request_id", generationRequestId)
            .maybeSingle();
        if (error) throw error;
        return Boolean(data?.id);
    }

    private static async loadGenerationAttempt(
        profileId: string,
        generationRequestId: string
    ): Promise<{
        request: any;
        masterRow: MasterAssetRow;
        master: MasterAssetDescriptor;
        masterBuffer: Buffer;
        source: GeneratedSourceAssetDescriptor | null;
    } | null> {
        const sb = DesignAssetService.db();
        const { data: request, error } = await sb
            .from("washa_design_requests")
            .select("*")
            .eq("profile_id", profileId)
            .eq("generation_request_id", generationRequestId)
            .maybeSingle();
        if (error) throw error;
        if (!request) return null;
        if (!request.master_asset_id) return null;

        const source = request.source_asset_id
            ? (await GeneratedSourceAssetService.load(
                profileId,
                request.source_asset_id
            )).source
            : null;

        const { data: master, error: masterError } = await sb
            .from("washa_design_master_assets")
            .select("*")
            .eq("id", request.master_asset_id)
            .single();
        if (masterError || !master) throw masterError || new Error("Master asset is missing.");
        const masterRow = master as MasterAssetRow;
        const stored = await StorageService.downloadStoredBuffer(
            masterRow.permanent_storage_path,
            { bucket: masterRow.storage_bucket || "washa-design-assets" }
        );
        if ("error" in stored) throw new Error(stored.error);
        if (sha256Hex(stored) !== masterRow.sha256_checksum) {
            throw new Error("Stored master artwork checksum mismatch.");
        }
        return {
            request,
            masterRow,
            master: mapMaster(masterRow),
            masterBuffer: stored,
            source,
        };
    }

    private static async recoverGenerationAfterUniqueConflict(
        profileId: string,
        generationRequestId: string
    ): Promise<GeneratedArtworkResponse | null> {
        const completed = await DesignAssetService.getExistingGeneration(
            profileId,
            generationRequestId
        );
        if (completed) return completed;

        // A concurrent request can own the same idempotency key while it is
        // still composing the mockup. Its immutable source/master are already
        // safe to return, so finalize a source preview instead of failing or
        // invoking the image provider again.
        const attempt = await DesignAssetService.loadGenerationAttempt(
            profileId,
            generationRequestId
        );
        if (!attempt) return null;
        return DesignAssetService.persistReadySourcePreview({
            profileId,
            generationRequestId,
            designRequestId: attempt.request.id,
            source: attempt.source,
            master: attempt.master,
            placement: attempt.request.placement_data,
            pipeline: attempt.master.generationParameters?.pipeline === "prompt_native"
                ? "prompt_native"
                : "standard",
        });
    }

    private static async loadDesignRequest(
        profileId: string,
        designRequestId: string
    ) {
        const sb = DesignAssetService.db();
        const { data: request, error } = await sb
            .from("washa_design_requests")
            .select("*")
            .eq("id", designRequestId)
            .eq("profile_id", profileId)
            .single();
        if (error || !request) throw new Error("Design request is missing.");
        if (!request.master_asset_id) {
            throw new Error("Design request is awaiting print-master preparation.");
        }
        const source = request.source_asset_id
            ? (await GeneratedSourceAssetService.load(
                profileId,
                request.source_asset_id
            )).source
            : null;
        const { data: master, error: masterError } = await sb
            .from("washa_design_master_assets")
            .select("*")
            .eq("id", request.master_asset_id)
            .eq("profile_id", profileId)
            .single();
        if (masterError || !master) throw new Error("Master asset is missing.");
        const masterRow = master as MasterAssetRow;
        const masterBuffer = await StorageService.downloadStoredBuffer(
            masterRow.permanent_storage_path,
            { bucket: masterRow.storage_bucket || "washa-design-assets" }
        );
        if ("error" in masterBuffer) throw new Error(masterBuffer.error);
        if (sha256Hex(masterBuffer) !== masterRow.sha256_checksum) {
            throw new Error("Stored master artwork checksum mismatch.");
        }
        return {
            request,
            source,
            master: mapMaster(masterRow),
            masterBuffer,
        };
    }

    static async getMasterAsset(profileId: string, masterAssetId: string) {
        const { data, error } = await DesignAssetService.db()
            .from("washa_design_master_assets")
            .select("id, permanent_url, permanent_storage_path, sha256_checksum, mime_type, width, height, alpha_channel_status")
            .eq("id", masterAssetId)
            .eq("profile_id", profileId)
            .single();
        if (error || !data) throw new Error("Master artwork asset is missing.");
        if (data.alpha_channel_status === "failed") {
            throw new Error("Master artwork transparency verification failed.");
        }
        return {
            masterAssetId: data.id,
            imageUrl: data.permanent_url,
            permanentStoragePath: data.permanent_storage_path,
            masterChecksum: data.sha256_checksum,
            mimeType: data.mime_type,
            width: data.width,
            height: data.height,
        };
    }

    private static async persistMasterAsset(params: {
        profileId: string;
        sourceAssetId: string;
        buffer: Buffer;
        provider: string;
        model: string;
        prompt: string;
        generationParameters: Record<string, unknown>;
        printWidthCm: number;
        printHeightCm: number;
        normalization: ArtworkNormalizationDiagnostics;
    }): Promise<{ master: MasterAssetDescriptor; buffer: Buffer }> {
        const validation = await validateArtworkPng(params.buffer);
        if (!validation.valid) {
            throw new ArtworkPrintValidationError({
                message: `Generated artwork failed print validation: ${validation.errors.join(" ")}`,
                stage: "validation",
                diagnostics: {
                    validation,
                    normalization: params.normalization,
                },
                validationErrors: validation.errors,
            });
        }
        let effectiveDpi: number;
        const sourceEquivalentWidth = Math.max(
            1,
            Math.floor(
                validation.width
                / Math.max(1, params.normalization.outputScaleFactor)
            )
        );
        const sourceEquivalentHeight = Math.max(
            1,
            Math.floor(
                validation.height
                / Math.max(1, params.normalization.outputScaleFactor)
            )
        );
        try {
            effectiveDpi = assertMinimumEffectivePrintDpi({
                width: sourceEquivalentWidth,
                height: sourceEquivalentHeight,
                printWidthCm: params.printWidthCm,
                printHeightCm: params.printHeightCm,
            });
        } catch (error) {
            throw new ArtworkPrintValidationError({
                message: error instanceof Error
                    ? error.message
                    : "Artwork effective print resolution validation failed.",
                stage: "validation",
                diagnostics: {
                    width: validation.width,
                    height: validation.height,
                    sourceEquivalentWidth,
                    sourceEquivalentHeight,
                    outputScaleFactor: params.normalization.outputScaleFactor,
                    printWidthCm: params.printWidthCm,
                    printHeightCm: params.printHeightCm,
                    normalization: params.normalization,
                },
                validationErrors: [
                    error instanceof Error
                        ? error.message
                        : "Artwork effective print resolution validation failed.",
                ],
                cause: error,
            });
        }

        const checksum = sha256Hex(params.buffer);
        const sb = DesignAssetService.db();
        const { data: existing, error: existingError } = await sb
            .from("washa_design_master_assets")
            .select("*")
            .eq("profile_id", params.profileId)
            .eq("source_asset_id", params.sourceAssetId)
            .eq("sha256_checksum", checksum)
            .maybeSingle();
        if (existingError) throw existingError;
        if (existing) {
            const existingRow = existing as MasterAssetRow;
            const stored = await StorageService.downloadStoredBuffer(
                existingRow.permanent_storage_path,
                { bucket: existingRow.storage_bucket || "washa-design-assets" }
            );
            if ("error" in stored) throw new Error(stored.error);
            await assertStoredAssetIntegrity(params.buffer, stored);
            return { master: mapMaster(existingRow), buffer: stored };
        }

        const masterAssetId = crypto.randomUUID();
        const path = `design-masters/${params.profileId}/${masterAssetId}/design-master.png`;
        const uploaded = await StorageService.uploadImmutableBuffer(params.buffer, path, {
            mimeType: "image/png",
            accessUrl: StorageService.getPrivateAssetUrl("master", masterAssetId),
            metadata: {
                masterAssetId,
                checksum,
                immutable: "true",
                source: "washa-ai",
            },
        });
        if ("error" in uploaded) throw new Error(uploaded.error);

        const stored = await StorageService.downloadStoredBuffer(uploaded.path, {
            bucket: uploaded.bucket,
        });
        if ("error" in stored) {
            await StorageService.removeStoredObject(uploaded.path, {
                bucket: uploaded.bucket,
            });
            throw new Error(stored.error);
        }
        let storedValidation: Awaited<ReturnType<typeof assertStoredAssetIntegrity>>;
        try {
            storedValidation = await assertStoredAssetIntegrity(params.buffer, stored);
        } catch (error) {
            await StorageService.removeStoredObject(uploaded.path, {
                bucket: uploaded.bucket,
            });
            throw error;
        }

        const createdAt = new Date().toISOString();
        const row: MasterAssetRow = {
            id: masterAssetId,
            permanent_storage_path: uploaded.path,
            permanent_url: uploaded.url,
            sha256_checksum: checksum,
            width: validation.width,
            height: validation.height,
            mime_type: "image/png",
            alpha_channel_status: params.normalization.backgroundRemovalApplied
                ? "fallback_processed"
                : "verified",
            transparent_pixel_ratio: validation.transparentPixelRatio,
            generation_model: params.model,
            provider: params.provider,
            prompt: params.prompt,
            generation_parameters: {
                ...params.generationParameters,
                effectivePrintDpi: effectiveDpi,
                sourceEquivalentWidth,
                sourceEquivalentHeight,
                validatedPrintWidthCm: params.printWidthCm,
                validatedPrintHeightCm: params.printHeightCm,
            },
            created_at: createdAt,
            source_asset_id: params.sourceAssetId,
        };
        const { error: insertError } = await sb
            .from("washa_design_master_assets")
            .insert({
                ...row,
                profile_id: params.profileId,
                source_asset_id: params.sourceAssetId,
                storage_bucket: uploaded.bucket,
                safe_padding_ratio: storedValidation.safePaddingRatio,
                validation_report: storedValidation,
                fallback_processing: params.normalization.backgroundRemovalApplied
                    ? params.normalization
                    : null,
            });
        if (insertError) {
            await StorageService.removeStoredObject(uploaded.path, {
                bucket: uploaded.bucket,
            });
            if (insertError.code === "23505") {
                const { data: winner, error: winnerError } = await sb
                    .from("washa_design_master_assets")
                    .select("*")
                    .eq("profile_id", params.profileId)
                    .eq("source_asset_id", params.sourceAssetId)
                    .eq("sha256_checksum", checksum)
                    .single();
                if (winnerError || !winner) throw winnerError || insertError;
                const winnerRow = winner as MasterAssetRow;
                const winnerBuffer = await StorageService.downloadStoredBuffer(
                    winnerRow.permanent_storage_path,
                    { bucket: winnerRow.storage_bucket || "washa-design-assets" }
                );
                if ("error" in winnerBuffer) throw new Error(winnerBuffer.error);
                await assertStoredAssetIntegrity(params.buffer, winnerBuffer);
                return { master: mapMaster(winnerRow), buffer: winnerBuffer };
            }
            throw insertError;
        }

        return { master: mapMaster(row), buffer: stored };
    }

    private static mapMockupAsset(
        row: MockupAssetRow,
        printPosition: GenerationSelection["printPosition"]
    ): ResolvedMockupAsset {
        return {
            id: row.id,
            sourceType: row.source_type,
            storageBucket: row.storage_bucket ?? null,
            storagePath: row.storage_path ?? null,
            imageUrl: row.image_url,
            printAreaId: row.print_area_id,
            printArea: normalizePrintArea(row.print_area, getDefaultPrintArea(printPosition)),
            anchorX: Math.min(1, Math.max(0, Number(row.anchor_point?.x ?? 0.5))),
            anchorY: Math.min(1, Math.max(0, Number(row.anchor_point?.y ?? 0.5))),
            garmentMaskUrl: row.garment_mask_url,
            shadingMapUrl: row.shading_map_url,
            displacementMapUrl: row.displacement_map_url,
            perspectiveTransform: row.perspective_transform ?? null,
            configuredRotation: null,
            configuredPrintWidthCm: null,
            configuredPrintHeightCm: null,
        };
    }

    private static async isMockupAssetUsable(asset: ResolvedMockupAsset) {
        try {
            const source = await DesignAssetService.loadMockupBuffer(asset);
            const metadata = await sharp(source).metadata();
            const configured = Number.parseInt(
                process.env.WASHA_DTF_MIN_MOCKUP_DIMENSION || "512",
                10
            );
            const minDimension = Number.isFinite(configured) ? configured : 512;
            return Boolean(
                metadata.width
                && metadata.height
                && metadata.width >= minDimension
                && metadata.height >= minDimension
            );
        } catch {
            return false;
        }
    }

    private static async loadMockupBuffer(asset: ResolvedMockupAsset) {
        if (asset.storagePath) {
            const stored = await StorageService.downloadStoredBuffer(asset.storagePath, {
                bucket: asset.storageBucket || "washa-design-assets",
            });
            if ("error" in stored) throw new Error(stored.error);
            return stored;
        }
        return (await materializeImageSource(asset.imageUrl)).buffer;
    }

    private static async findManifestMockup(
        selection: GenerationSelection,
        side: ArtworkSide,
        sourceType: MockupSourceType
    ): Promise<ResolvedMockupAsset | null> {
        if (!selection.garmentId) return null;
        const sb = DesignAssetService.db();
        let query = sb
            .from("washa_garment_mockup_assets")
            .select("*")
            .eq("product_id", selection.garmentId)
            .eq("side", side)
            .eq("source_type", sourceType)
            .eq("is_active", true);
        query = selection.colorId
            ? query.eq("color_id", selection.colorId)
            : query.is("color_id", null).eq("color_hex", selection.colorHex);
        const { data, error } = await query
            .order("configuration_version", { ascending: false })
            .limit(1)
            .maybeSingle();
        if (error) throw error;
        return data ? DesignAssetService.mapMockupAsset(data, selection.printPosition) : null;
    }

    private static async findAdminTemplateMockup(
        selection: GenerationSelection,
        side: ArtworkSide
    ): Promise<ResolvedMockupAsset | null> {
        if (!selection.garmentId) return null;

        const loadTemplate = (colorId: string | null) => {
            let query = DesignAssetService.db()
                .from("garment_mockup_templates")
                .select("*")
                .eq("garment_id", selection.garmentId)
                .eq("side", side)
                .eq("is_active", true);
            query = colorId
                ? query.eq("color_id", colorId)
                : query.is("color_id", null);
            return query.limit(1).maybeSingle();
        };

        const results = selection.colorId
            ? await Promise.all([
                loadTemplate(selection.colorId),
                loadTemplate(null),
            ])
            : [await loadTemplate(null)];
        for (const result of results) {
            if (!result.error) continue;
            if (result.error.code === "42P01" || result.error.code === "PGRST205") {
                return null;
            }
            throw result.error;
        }

        const resolved = resolveDtfMockupTemplate(
            results
                .map((result) => result.data as DtfMockupTemplate | null)
                .filter((template): template is DtfMockupTemplate => Boolean(template)),
            {
                garmentId: selection.garmentId,
                colorId: selection.colorId,
                printPosition: selection.printPosition,
                printSize: selection.printSize,
            }
        );
        if (!resolved) return null;

        const { template, area } = resolved;
        return {
            // This is intentionally null because reference_mockup_id points to
            // washa_garment_mockup_assets. The immutable template identity and
            // version are retained in printAreaId and revision placement data.
            id: null,
            sourceType: "reference",
            storageBucket: template.base_image_path ? "smart-store" : null,
            storagePath: template.base_image_path,
            imageUrl: template.base_image_url,
            printAreaId:
                `admin-template:${template.id}:v${template.version}`
                + `:${area.print_position}:${area.print_size}`,
            printArea: {
                x: area.x,
                y: area.y,
                width: area.width,
                height: area.height,
            },
            anchorX: 0.5,
            anchorY: 0.5,
            garmentMaskUrl: template.mask_image_url,
            shadingMapUrl: template.overlay_image_url,
            displacementMapUrl: null,
            perspectiveTransform: null,
            configuredRotation: area.rotation,
            configuredPrintWidthCm: area.physical_width_cm,
            configuredPrintHeightCm: area.physical_height_cm,
        };
    }

    private static async deactivateGeneratedMockup(assetId: string) {
        const { error } = await DesignAssetService.db()
            .from("washa_garment_mockup_assets")
            .update({
                is_active: false,
                updated_at: new Date().toISOString(),
            })
            .eq("id", assetId)
            .eq("source_type", "generated_blank_garment");
        if (error) throw error;
    }

    private static async createReferenceManifestFromCatalog(
        selection: GenerationSelection,
        side: ArtworkSide
    ): Promise<ResolvedMockupAsset | null> {
        if (!selection.garmentId) return null;
        const sb = DesignAssetService.db();
        let imageUrl: string | null = null;
        let migratedFrom: Record<string, unknown> | null = null;

        if (selection.sizeId) {
            const { data: size, error } = await sb
                .from("custom_design_sizes")
                .select("id, garment_id, color_id, image_front_url, image_back_url")
                .eq("id", selection.sizeId)
                .eq("garment_id", selection.garmentId)
                .maybeSingle();
            if (error) throw error;
            if (size && (!selection.colorId || size.color_id === selection.colorId)) {
                imageUrl = selectSideSpecificCatalogReference({
                    side,
                    sizeFrontUrl: size.image_front_url,
                    sizeBackUrl: size.image_back_url,
                });
                if (imageUrl) migratedFrom = { table: "custom_design_sizes", id: size.id };
            }
        }

        if (!imageUrl && side === "front" && selection.colorId) {
            const { data: color, error } = await sb
                .from("custom_design_colors")
                .select("id, garment_id, hex_code, image_url")
                .eq("id", selection.colorId)
                .eq("garment_id", selection.garmentId)
                .maybeSingle();
            if (error) throw error;
            if (color?.image_url) {
                imageUrl = selectSideSpecificCatalogReference({
                    side,
                    colorFrontUrl: color.image_url,
                });
                migratedFrom = { table: "custom_design_colors", id: color.id };
            }
        }

        if (!imageUrl) return null;
        const printArea = getDefaultPrintArea(selection.printPosition);
        const id = crypto.randomUUID();
        const row = {
            id,
            product_id: selection.garmentId,
            color_id: selection.colorId,
            color_hex: selection.colorHex,
            side,
            source_type: "reference",
            image_url: imageUrl,
            print_area_id: `${side}_default`,
            print_area: printArea,
            colorization_mode: "none",
            generation_parameters: { migratedFrom },
        };
        const { error } = await sb.from("washa_garment_mockup_assets").insert(row);
        if (error && !/duplicate/i.test(error.message || "")) throw error;
        if (error) return DesignAssetService.findManifestMockup(selection, side, "reference");
        return DesignAssetService.mapMockupAsset({
            ...row,
            source_type: "reference",
            garment_mask_url: null,
            shading_map_url: null,
            displacement_map_url: null,
        }, selection.printPosition);
    }

    private static async generateAndPersistBlankGarment(
        selection: GenerationSelection,
        side: ArtworkSide
    ): Promise<ResolvedMockupAsset> {
        const prompt = buildBlankGarmentPrompt({
            garmentType: selection.garmentType,
            colorName: selection.garmentColor,
            colorHex: selection.colorHex,
            side,
        });
        const generated = await generateBlankGarment(prompt);
        const materialized = await materializeImageSource(generated.imageUrl);
        const normalized = await sharp(materialized.buffer)
            .rotate()
            .png({ compressionLevel: 9, palette: false })
            .toBuffer();
        const configuredMin = Number.parseInt(
            process.env.WASHA_DTF_MIN_MOCKUP_DIMENSION || "512",
            10
        );
        const minMockupDimension = Number.isFinite(configuredMin) ? configuredMin : 512;
        const defaultPrintArea = getDefaultPrintArea(selection.printPosition);
        const validation = await validateGeneratedBlankGarment({
            buffer: normalized,
            colorHex: selection.colorHex,
            printArea: defaultPrintArea,
            minDimension: minMockupDimension,
        });
        if (!validation.valid) {
            throw new Error(
                `Generated blank garment failed validation: ${validation.errors.join(" ")}`
            );
        }
        const semanticVerification = await verifyBlankGarmentSemantics({
            garmentPng: normalized,
            garmentType: selection.garmentType,
            colorName: selection.garmentColor,
            colorHex: selection.colorHex,
            side,
        });
        const printArea = normalizePrintArea(
            semanticVerification.printArea,
            defaultPrintArea
        );

        if (!selection.garmentId) {
            return {
                id: null,
                sourceType: "generated_blank_garment",
                storageBucket: null,
                storagePath: null,
                imageUrl: `data:image/png;base64,${normalized.toString("base64")}`,
                printAreaId: `${side}_legacy_default`,
                printArea,
                anchorX: 0.5,
                anchorY: 0.5,
                garmentMaskUrl: null,
                shadingMapUrl: null,
                displacementMapUrl: null,
                perspectiveTransform: null,
                configuredRotation: null,
                configuredPrintWidthCm: null,
                configuredPrintHeightCm: null,
            };
        }

        const id = crypto.randomUUID();
        const colorKey = selection.colorId || (selection.colorHex || "custom").replace(/[^a-z0-9]+/gi, "");
        const path = `garment-mockups/${selection.garmentId}/${colorKey}/${side}/${id}/garment-blank.png`;
        const uploaded = await StorageService.uploadImmutableBuffer(normalized, path, {
            mimeType: "image/png",
            accessUrl: StorageService.getPrivateAssetUrl("garment", id),
            metadata: {
                mockupAssetId: id,
                sourceType: "generated_blank_garment",
                productId: selection.garmentId,
                colorId: selection.colorId || "",
                side,
            },
        });
        if ("error" in uploaded) throw new Error(uploaded.error);

        const row = {
            id,
            product_id: selection.garmentId,
            color_id: selection.colorId,
            color_hex: selection.colorHex,
            side,
            source_type: "generated_blank_garment",
            storage_bucket: uploaded.bucket,
            storage_path: uploaded.path,
            image_url: uploaded.url,
            print_area_id: `${side}_default`,
            print_area: printArea,
            colorization_mode: "none",
            generation_provider: generated.provider,
            generation_model: generated.model,
            generation_prompt: prompt,
            generation_parameters: {
                ...generated.parameters,
                validation,
                semanticVerification,
                artworkInputSupplied: false,
                semanticConstraints: {
                    productType: selection.garmentType,
                    color: selection.garmentColor,
                    colorHex: selection.colorHex,
                    side,
                    mustBeBlank: true,
                },
            },
            configuration_version: 1,
        };
        const { error } = await DesignAssetService.db()
            .from("washa_garment_mockup_assets")
            .insert(row);
        if (error) throw error;
        return DesignAssetService.mapMockupAsset({
            ...row,
            source_type: "generated_blank_garment",
            garment_mask_url: null,
            shading_map_url: null,
            displacement_map_url: null,
        }, selection.printPosition);
    }

    private static async resolveMockup(
        selection: GenerationSelection,
        side: ArtworkSide,
        allowGeneratedFallback: boolean,
        legacyGarmentReference?: { base64: string; mimeType: string } | null
    ): Promise<ResolvedMockupAsset | null> {
        if (!selection.garmentId && legacyGarmentReference) {
            const legacyAsset: ResolvedMockupAsset = {
                id: null,
                sourceType: "reference",
                storageBucket: null,
                storagePath: null,
                imageUrl: `data:${legacyGarmentReference.mimeType};base64,${legacyGarmentReference.base64}`,
                printAreaId: `${side}_legacy_default`,
                printArea: getDefaultPrintArea(selection.printPosition),
                anchorX: 0.5,
                anchorY: 0.5,
                garmentMaskUrl: null,
                shadingMapUrl: null,
                displacementMapUrl: null,
                perspectiveTransform: null,
                configuredRotation: null,
                configuredPrintWidthCm: null,
                configuredPrintHeightCm: null,
            };
            if (await DesignAssetService.isMockupAssetUsable(legacyAsset)) return legacyAsset;
            if (!allowGeneratedFallback) return null;
        }
        const adminTemplate = await DesignAssetService.findAdminTemplateMockup(
            selection,
            side
        );
        if (
            adminTemplate
            && await DesignAssetService.isMockupAssetUsable(adminTemplate)
        ) return adminTemplate;

        const manifestReference = await DesignAssetService.findManifestMockup(
            selection,
            side,
            "reference"
        );
        if (
            manifestReference
            && await DesignAssetService.isMockupAssetUsable(manifestReference)
        ) return manifestReference;

        const catalogReference = await DesignAssetService.createReferenceManifestFromCatalog(
            selection,
            side
        );
        if (
            catalogReference
            && await DesignAssetService.isMockupAssetUsable(catalogReference)
        ) return catalogReference;

        const cachedGenerated = await DesignAssetService.findManifestMockup(
            selection,
            side,
            "generated_blank_garment"
        );
        if (
            cachedGenerated
            && await DesignAssetService.isMockupAssetUsable(cachedGenerated)
        ) return cachedGenerated;
        if (cachedGenerated?.id) {
            await DesignAssetService.deactivateGeneratedMockup(cachedGenerated.id);
        }
        if (!allowGeneratedFallback) return null;
        return DesignAssetService.generateAndPersistBlankGarment(selection, side);
    }

    private static async recordDerivative(params: {
        master: MasterAssetDescriptor;
        requestId: string;
        derivativeType:
            | "mockup_front"
            | "mockup_back"
            | "design_preview"
            | "design_thumbnail"
            | "print_production";
        buffer: Buffer;
        mimeType: string;
        width: number;
        height: number;
        transformationMetadata: Record<string, unknown>;
    }) {
        const extension = params.mimeType === "image/png" ? "png" : "webp";
        const derivativeId = crypto.randomUUID();
        const path =
            `design-masters/${params.master.id}/requests/${params.requestId}`
            + `/${params.derivativeType}/${derivativeId}.${extension}`;
        const uploaded = await StorageService.uploadImmutableBuffer(params.buffer, path, {
            mimeType: params.mimeType,
            accessUrl: StorageService.getPrivateAssetUrl("derivative", derivativeId),
            metadata: {
                sourceMasterAssetId: params.master.id,
                sourceChecksum: params.master.checksum,
                derivativeType: params.derivativeType,
            },
        });
        if ("error" in uploaded) throw new Error(uploaded.error);
        const { error } = await DesignAssetService.db()
            .from("washa_design_asset_derivatives")
            .insert({
                id: derivativeId,
                source_master_asset_id: params.master.id,
                source_checksum: params.master.checksum,
                derivative_sha256_checksum: sha256Hex(params.buffer),
                derivative_type: params.derivativeType,
                storage_bucket: uploaded.bucket,
                storage_path: uploaded.path,
                access_url: uploaded.url,
                mime_type: params.mimeType,
                width: params.width,
                height: params.height,
                transformation_metadata: params.transformationMetadata,
            });
        if (error) throw error;
        return uploaded;
    }

    private static async createMockupPreview(params: {
        master: MasterAssetDescriptor;
        masterBuffer: Buffer;
        requestId: string;
        mockup: ResolvedMockupAsset;
        placement: PlacementTransform;
        side: ArtworkSide;
        applyArtwork: boolean;
        pipeline: WashaGenerationPipeline;
    }) {
        const garmentBase = await DesignAssetService.loadMockupBuffer(params.mockup);
        if (!params.applyArtwork) {
            const preview = await sharp(garmentBase)
                .rotate()
                .webp({ quality: 92, alphaQuality: 100 })
                .toBuffer();
            const metadata = await sharp(preview).metadata();
            return DesignAssetService.recordDerivative({
                master: params.master,
                requestId: params.requestId,
                derivativeType: params.side === "front" ? "mockup_front" : "mockup_back",
                buffer: preview,
                mimeType: "image/webp",
                width: metadata.width ?? 1,
                height: metadata.height ?? 1,
                transformationMetadata: {
                    sourceMockupId: params.mockup.id,
                    sourceType: params.mockup.sourceType,
                    artworkApplied: false,
                },
            });
        }

        const effectivePlacement = {
            ...params.placement,
            referenceMockupId: params.mockup.id,
            printAreaId: params.mockup.printAreaId,
        };
        const effects = {
            garmentMask: await materializeOptional(params.mockup.garmentMaskUrl),
            shadingMap: await materializeOptional(params.mockup.shadingMapUrl),
            displacementMap: await materializeOptional(params.mockup.displacementMapUrl),
            perspectiveTransform: params.mockup.perspectiveTransform,
        };
        const deterministicComposite = await compositeArtworkPreview({
            garmentBase,
            masterArtwork: params.masterBuffer,
            printArea: params.mockup.printArea,
            placement: effectivePlacement,
            effects,
        });
        const composite = params.pipeline === "prompt_native"
            ? await composePromptNativeMockup({
                garmentBase,
                masterArtwork: params.masterBuffer,
                placementGuide: deterministicComposite.buffer,
                printArea: params.mockup.printArea,
                placement: effectivePlacement,
                traceId: params.requestId,
            })
            : deterministicComposite;
        return DesignAssetService.recordDerivative({
            master: params.master,
            requestId: params.requestId,
            derivativeType: params.side === "front" ? "mockup_front" : "mockup_back",
            buffer: composite.buffer,
            mimeType: composite.mimeType,
            width: composite.width,
            height: composite.height,
            transformationMetadata: {
                sourceMockupId: params.mockup.id,
                sourceType: params.mockup.sourceType,
                artworkApplied: true,
                ...composite.transformationMetadata,
            },
        });
    }

    private static async composeRequestPreview(params: {
        profileId: string;
        designRequestId: string;
        source?: GeneratedSourceAssetDescriptor | null;
        master: MasterAssetDescriptor;
        masterBuffer: Buffer;
        selection: GenerationSelection;
        legacyGarmentReference?: { base64: string; mimeType: string } | null;
        pipeline: WashaGenerationPipeline;
    }): Promise<GeneratedArtworkResponse> {
        const selectedSide: ArtworkSide =
            params.selection.printPosition === "back" ? "back" : "front";
        const selectedMockup = await DesignAssetService.resolveMockup(
            params.selection,
            selectedSide,
            true,
            params.legacyGarmentReference
        );
        if (!selectedMockup) throw new Error("No suitable garment mockup could be resolved.");

        const defaultPlacement = buildPlacementTransform({
            side: selectedSide,
            printPosition: params.selection.printPosition,
            printSize: params.selection.printSize,
            scalePercent: params.selection.printScale,
            offsetXPercent: params.selection.printOffsetX,
            offsetYPercent: params.selection.printOffsetY,
            anchorX: selectedMockup.anchorX,
            anchorY: selectedMockup.anchorY,
            referenceMockupId: selectedMockup.id,
            printAreaId: selectedMockup.printAreaId,
        });
        const placement: PlacementTransform = {
            ...defaultPlacement,
            rotation:
                selectedMockup.configuredRotation
                ?? defaultPlacement.rotation,
            printWidthCm:
                selectedMockup.configuredPrintWidthCm
                ?? defaultPlacement.printWidthCm,
            printHeightCm:
                selectedMockup.configuredPrintHeightCm
                ?? defaultPlacement.printHeightCm,
        };
        assertMinimumEffectivePrintDpi({
            width: params.master.width,
            height: params.master.height,
            printWidthCm: placement.printWidthCm,
            printHeightCm: placement.printHeightCm,
        });

        const selectedPreview = await DesignAssetService.createMockupPreview({
            master: params.master,
            masterBuffer: params.masterBuffer,
            requestId: params.designRequestId,
            mockup: selectedMockup,
            placement,
            side: selectedSide,
            applyArtwork: true,
            pipeline: params.pipeline,
        });
        const otherSide: ArtworkSide = selectedSide === "front" ? "back" : "front";
        const otherMockup = await DesignAssetService.resolveMockup(
            params.selection,
            otherSide,
            false
        );
        const otherPreview = otherMockup
            ? await DesignAssetService.createMockupPreview({
                master: params.master,
                masterBuffer: params.masterBuffer,
                requestId: params.designRequestId,
                mockup: otherMockup,
                placement: { ...placement, side: otherSide },
                side: otherSide,
                applyArtwork: false,
                pipeline: params.pipeline,
            })
            : null;
        const frontPreviewUrl = selectedSide === "front"
            ? selectedPreview.url
            : otherPreview?.url ?? null;
        const backPreviewUrl = selectedSide === "back"
            ? selectedPreview.url
            : otherPreview?.url ?? null;

        const { error: requestError } = await DesignAssetService.db()
            .from("washa_design_requests")
            .update({
                selected_product_id: params.selection.garmentId,
                selected_color_id: params.selection.colorId,
                selected_color_hex: params.selection.colorHex,
                selected_side: selectedSide,
                placement_data: placement,
                front_preview_url: frontPreviewUrl,
                back_preview_url: backPreviewUrl,
                mockup_source_type: selectedMockup.sourceType,
                reference_mockup_id:
                    selectedMockup.sourceType === "reference" ? selectedMockup.id : null,
                generated_garment_mockup_id:
                    selectedMockup.sourceType === "generated_blank_garment"
                        ? selectedMockup.id
                        : null,
                production_readiness_status: "ready",
                generation_status: "ready",
                updated_at: new Date().toISOString(),
            })
            .eq("id", params.designRequestId)
            .eq("profile_id", params.profileId)
            .eq("master_asset_id", params.master.id);
        if (requestError) throw requestError;

        return {
            imageUrl: selectedPreview.url,
            previewUrl: selectedPreview.url,
            frontPreviewUrl,
            backPreviewUrl,
            designRequestId: params.designRequestId,
            sourceAssetId: params.source?.id ?? params.master.sourceAssetId ?? params.master.id,
            sourceAssetUrl: params.source?.permanentUrl ?? params.master.permanentUrl,
            sourceChecksum: params.source?.checksum ?? params.master.checksum,
            masterAssetId: params.master.id,
            masterAssetUrl: params.master.permanentUrl,
            masterChecksum: params.master.checksum,
            mockupSourceType: selectedMockup.sourceType,
            placement,
            transparencyVerificationStatus: params.master.alphaChannelStatus,
            productionReadinessStatus: "ready",
            previewKind: "mockup",
            provider: params.master.provider,
            model: params.master.model,
            pipeline: params.pipeline,
            previewProvider: params.pipeline === "prompt_native" ? "gemini" : "sharp",
        };
    }

    private static async persistPendingPrepressPreview(params: {
        profileId: string;
        generationRequestId: string;
        source: GeneratedSourceAssetDescriptor;
        selection: GenerationSelection;
        placement: PlacementTransform;
        pipeline: WashaGenerationPipeline;
    }): Promise<GeneratedArtworkResponse> {
        const designRequestId = crypto.randomUUID();
        const selectedSide = params.placement.side;
        const frontPreviewUrl = selectedSide === "front"
            ? params.source.permanentUrl
            : null;
        const backPreviewUrl = selectedSide === "back"
            ? params.source.permanentUrl
            : null;
        const { error } = await DesignAssetService.db()
            .from("washa_design_requests")
            .insert({
                id: designRequestId,
                generation_request_id: params.generationRequestId,
                profile_id: params.profileId,
                source_asset_id: params.source.id,
                master_asset_id: null,
                selected_product_id: params.selection.garmentId,
                selected_color_id: params.selection.colorId,
                selected_color_hex: params.selection.colorHex,
                selected_side: selectedSide,
                placement_data: params.placement,
                front_preview_url: frontPreviewUrl,
                back_preview_url: backPreviewUrl,
                mockup_source_type: "source_preview",
                preview_kind: "source",
                prompt: params.source.prompt,
                generation_model: params.source.model,
                provider: params.source.provider,
                transparency_verification_status: "pending",
                production_readiness_status: "pending_prepress",
                generation_status: "ready",
                schema_version: 2,
            });
        if (error) {
            if (error.code === "23505") {
                const existing = await DesignAssetService.recoverGenerationAfterUniqueConflict(
                    params.profileId,
                    params.generationRequestId
                );
                if (existing) return existing;
            }
            throw error;
        }

        return {
            imageUrl: params.source.permanentUrl,
            previewUrl: params.source.permanentUrl,
            frontPreviewUrl,
            backPreviewUrl,
            designRequestId,
            sourceAssetId: params.source.id,
            sourceAssetUrl: params.source.permanentUrl,
            sourceChecksum: params.source.checksum,
            masterAssetId: null,
            masterAssetUrl: null,
            masterChecksum: null,
            mockupSourceType: "source_preview",
            placement: params.placement,
            transparencyVerificationStatus: "pending",
            productionReadinessStatus: "pending_prepress",
            previewKind: "source",
            provider: params.source.provider,
            model: params.source.model,
            pipeline: params.pipeline,
            previewProvider: "source",
        };
    }

    private static async persistReadySourcePreview(params: {
        profileId: string;
        generationRequestId: string;
        designRequestId: string;
        source: GeneratedSourceAssetDescriptor | null;
        master: MasterAssetDescriptor;
        placement: PlacementTransform;
        pipeline: WashaGenerationPipeline;
    }): Promise<GeneratedArtworkResponse> {
        const previewUrl = params.source?.permanentUrl ?? params.master.permanentUrl;
        const selectedSide = params.placement.side;
        const frontPreviewUrl = selectedSide === "front" ? previewUrl : null;
        const backPreviewUrl = selectedSide === "back" ? previewUrl : null;
        const { data: updated, error } = await DesignAssetService.db()
            .from("washa_design_requests")
            .update({
                selected_side: selectedSide,
                placement_data: params.placement,
                front_preview_url: frontPreviewUrl,
                back_preview_url: backPreviewUrl,
                mockup_source_type: "source_preview",
                preview_kind: "source",
                production_readiness_status: "ready",
                generation_status: "ready",
                updated_at: new Date().toISOString(),
            })
            .eq("id", params.designRequestId)
            .eq("profile_id", params.profileId)
            .eq("master_asset_id", params.master.id)
            .eq("generation_status", "processing")
            .select("id")
            .maybeSingle();
        if (error) throw error;
        if (!updated) {
            const completed = await DesignAssetService.getExistingGeneration(
                params.profileId,
                params.generationRequestId
            );
            if (completed) return completed;
            throw new Error("Concurrent design request could not be finalized safely.");
        }

        return {
            imageUrl: previewUrl,
            previewUrl,
            frontPreviewUrl,
            backPreviewUrl,
            designRequestId: params.designRequestId,
            sourceAssetId: params.source?.id ?? params.master.id,
            sourceAssetUrl: params.source?.permanentUrl ?? params.master.permanentUrl,
            sourceChecksum: params.source?.checksum ?? params.master.checksum,
            masterAssetId: params.master.id,
            masterAssetUrl: params.master.permanentUrl,
            masterChecksum: params.master.checksum,
            mockupSourceType: "source_preview",
            placement: params.placement,
            transparencyVerificationStatus: params.master.alphaChannelStatus,
            productionReadinessStatus: "ready",
            previewKind: "source",
            provider: params.master.provider,
            model: params.master.model,
            pipeline: params.pipeline,
            previewProvider: "source",
        };
    }

    static async recompose(input: RecomposeDesignAssetInput): Promise<GeneratedArtworkResponse> {
        const selection = await DesignAssetService.resolveCatalogSelection(input.selection);
        const loaded = await DesignAssetService.loadDesignRequest(
            input.profileId,
            input.designRequestId
        );
        if (loaded.master.id !== input.masterAssetId) {
            throw new Error("Design request master asset mismatch.");
        }
        return DesignAssetService.composeRequestPreview({
            profileId: input.profileId,
            designRequestId: input.designRequestId,
            source: loaded.source,
            master: loaded.master,
            masterBuffer: loaded.masterBuffer,
            selection,
            pipeline: input.pipeline ?? "standard",
        });
    }

    static async generate(input: GenerateDesignAssetInput): Promise<GeneratedArtworkResponse> {
        let designRequestId: string | null = null;
        let pendingPrepressContext: {
            source: GeneratedSourceAssetDescriptor;
            selection: GenerationSelection;
            placement: PlacementTransform;
            pipeline: WashaGenerationPipeline;
        } | null = null;
        let readySourcePreviewContext: {
            source: GeneratedSourceAssetDescriptor | null;
            master: MasterAssetDescriptor;
            placement: PlacementTransform;
            pipeline: WashaGenerationPipeline;
        } | null = null;
        try {
            const existing = await DesignAssetService.getExistingGeneration(
                input.profileId,
                input.generationRequestId
            );
            if (existing) return existing;

            const selection = await DesignAssetService.resolveCatalogSelection(input.selection);
            const selectedSide: ArtworkSide =
                selection.printPosition === "back" ? "back" : "front";
            const provisionalPlacement = buildPlacementTransform({
                side: selectedSide,
                printPosition: selection.printPosition,
                printSize: selection.printSize,
                scalePercent: selection.printScale,
                offsetXPercent: selection.printOffsetX,
                offsetYPercent: selection.printOffsetY,
            });
            const existingAttempt = await DesignAssetService.loadGenerationAttempt(
                input.profileId,
                input.generationRequestId
            );
            let master: MasterAssetDescriptor;
            let masterBuffer: Buffer;
            let source: GeneratedSourceAssetDescriptor | null = null;

            if (existingAttempt) {
                designRequestId = existingAttempt.request.id;
                master = existingAttempt.master;
                masterBuffer = existingAttempt.masterBuffer;
                source = existingAttempt.source;
            } else {
                const prompt = buildIsolatedArtworkPrompt(input.userIdea, input.context);
                const referenceImageDataUrl = input.referenceImage
                    ? `data:${input.referenceImage.mimeType};base64,${input.referenceImage.base64}`
                    : null;
                const promptNativeArtwork = input.pipeline === "prompt_native"
                    ? await generatePromptNativeArtwork({
                        prompt,
                        referenceImageDataUrl,
                        traceId: input.generationRequestId,
                    })
                    : null;
                const providerResult = promptNativeArtwork
                    ? {
                        imageUrl: `data:image/png;base64,${promptNativeArtwork.buffer.toString("base64")}`,
                        provider: promptNativeArtwork.provider,
                        model: promptNativeArtwork.model,
                        parameters: promptNativeArtwork.parameters,
                    }
                    : await generateIsolatedArtwork({
                        prompt,
                        referenceImageDataUrl,
                        traceId: input.generationRequestId,
                    });
                const materialized = promptNativeArtwork
                    ? { buffer: promptNativeArtwork.buffer, mimeType: "image/png" }
                    : await materializeImageSource(providerResult.imageUrl);
                const masterPrompt = promptNativeArtwork?.prompt ?? prompt;
                const capturedSource = await GeneratedSourceAssetService.capture({
                    profileId: input.profileId,
                    buffer: materialized.buffer,
                    declaredMimeType: materialized.mimeType,
                    provider: providerResult.provider,
                    model: providerResult.model,
                    prompt: masterPrompt,
                    generationParameters: {
                        ...providerResult.parameters,
                        pipeline: input.pipeline ?? "standard",
                    },
                });
                source = capturedSource.source;
                pendingPrepressContext = {
                    source,
                    selection,
                    placement: provisionalPlacement,
                    pipeline: input.pipeline ?? "standard",
                };
                const normalizationWorkflowStartedAt = Date.now();
                const normalizationAttemptStartedAt = Date.now();
                logDtfTrace(
                    ARTWORK_NORMALIZATION_SCOPE,
                    input.generationRequestId,
                    "artwork_normalization_started",
                    {
                        attemptedProvider: providerResult.provider,
                        attemptedModel: providerResult.model,
                        normalizationAttempt: 1,
                        declaredMimeType: materialized.mimeType,
                        byteLength: materialized.buffer.byteLength,
                    }
                );
                let normalizedArtwork!: Awaited<
                    ReturnType<typeof normalizeGeneratedArtworkForPrint>
                >;
                try {
                    normalizedArtwork = await normalizeGeneratedArtworkForPrint({
                        buffer: materialized.buffer,
                        declaredMimeType: materialized.mimeType,
                        safePaddingRatio: 0.1,
                    });
                    logDtfTrace(
                        ARTWORK_NORMALIZATION_SCOPE,
                        input.generationRequestId,
                        "artwork_normalization_completed",
                        {
                            attemptedProvider: providerResult.provider,
                            attemptedModel: providerResult.model,
                            normalizationAttempt: 1,
                            durationMs: Date.now() - normalizationAttemptStartedAt,
                            input: normalizedArtwork.input,
                            output: normalizedArtwork.output,
                            normalization: normalizedArtwork.normalization,
                            printValidation: normalizedArtwork.validation,
                        }
                    );
                } catch (error) {
                    const artworkError = asArtworkNormalizationError({
                        error,
                        provider: providerResult.provider,
                        model: providerResult.model,
                        declaredMimeType: materialized.mimeType,
                        byteLength: materialized.buffer.byteLength,
                    });
                    logDtfTrace(
                        ARTWORK_NORMALIZATION_SCOPE,
                        input.generationRequestId,
                        "artwork_print_validation_failed",
                        {
                            attemptedProvider: providerResult.provider,
                            attemptedModel: providerResult.model,
                            normalizationAttempt: 1,
                            durationMs: Date.now() - normalizationWorkflowStartedAt,
                            errorCode: artworkError.code,
                            errorStage: artworkError.stage,
                            diagnostics: artworkError.diagnostics,
                            validationErrors: artworkError.validationErrors,
                        }
                    );
                    throw artworkError;
                }
                const textPolicyVerificationStartedAt = Date.now();
                const textRenderingAllowed =
                    input.context.designMethod === "calligraphy"
                    && Boolean(input.context.calligraphyText?.trim());
                logDtfTrace(
                    ARTWORK_NORMALIZATION_SCOPE,
                    input.generationRequestId,
                    "artwork_text_policy_verification_started",
                    {
                        textRenderingAllowed,
                        sourceProvider: providerResult.provider,
                        sourceModel: providerResult.model,
                    }
                );
                let textPolicyVerification: Awaited<
                    ReturnType<typeof verifyArtworkTextPolicy>
                >;
                try {
                    textPolicyVerification = await verifyArtworkTextPolicy({
                        artworkPng: normalizedArtwork.buffer,
                        expectedText: textRenderingAllowed
                            ? input.context.calligraphyText
                            : null,
                        preferredProvider: providerResult.provider,
                        sourceModel: providerResult.model,
                    });
                    logDtfTrace(
                        ARTWORK_NORMALIZATION_SCOPE,
                        input.generationRequestId,
                        "artwork_text_policy_verification_succeeded",
                        {
                            textRenderingAllowed,
                            verificationMode: textPolicyVerification.mode,
                            verificationProvider: textPolicyVerification.provider,
                            verificationModel: textPolicyVerification.model,
                            sourceProvider: providerResult.provider,
                            sourceModel: providerResult.model,
                            durationMs: Date.now() - textPolicyVerificationStartedAt,
                        }
                    );
                } catch (error) {
                    const verificationError = isArtworkVerificationUnavailableError(error)
                        ? error
                        : null;
                    logDtfTrace(
                        ARTWORK_NORMALIZATION_SCOPE,
                        input.generationRequestId,
                        "artwork_text_policy_verification_failed",
                        {
                            textRenderingAllowed,
                            durationMs: Date.now() - textPolicyVerificationStartedAt,
                            sourceProvider: providerResult.provider,
                            sourceModel: providerResult.model,
                            ...(verificationError
                                ? {
                                    errorCode: verificationError.code,
                                    errorStage: verificationError.stage,
                                    verificationProvider: verificationError.provider,
                                    verificationModel: verificationError.model,
                                    providerStatus: verificationError.statusCode,
                                    providerCode: verificationError.providerCode,
                                    providerRequestId: verificationError.requestId,
                                    providerMessage: verificationError.providerMessage,
                                    retryable: verificationError.retryable,
                                }
                                : {
                                    errorName: error instanceof Error
                                        ? error.name
                                        : "UnknownError",
                                    errorMessage: error instanceof Error
                                        ? error.message
                                        : String(error),
                                }),
                        }
                    );
                    throw error;
                }
                let persisted: Awaited<
                    ReturnType<typeof DesignAssetService.persistMasterAsset>
                >;
                try {
                    persisted = await DesignAssetService.persistMasterAsset({
                        profileId: input.profileId,
                        sourceAssetId: source.id,
                        buffer: normalizedArtwork.buffer,
                        provider: providerResult.provider,
                        model: providerResult.model,
                        prompt: masterPrompt,
                        generationParameters: {
                            ...providerResult.parameters,
                            textPolicyVerification,
                            artworkNormalization: {
                                input: normalizedArtwork.input,
                                output: normalizedArtwork.output,
                                normalization: normalizedArtwork.normalization,
                                validation: normalizedArtwork.validation,
                            },
                        },
                        printWidthCm: provisionalPlacement.printWidthCm,
                        printHeightCm: provisionalPlacement.printHeightCm,
                        normalization: normalizedArtwork.normalization,
                    });
                } catch (error) {
                    if (isArtworkPrintValidationError(error)) {
                        logDtfTrace(
                            ARTWORK_NORMALIZATION_SCOPE,
                            input.generationRequestId,
                            "artwork_print_validation_failed",
                            {
                                attemptedProvider: providerResult.provider,
                                attemptedModel: providerResult.model,
                                durationMs: Date.now() - normalizationWorkflowStartedAt,
                                errorCode: error.code,
                                errorStage: error.stage,
                                diagnostics: error.diagnostics,
                                validationErrors: error.validationErrors,
                            }
                        );
                    }
                    throw error;
                }
                master = persisted.master;
                masterBuffer = persisted.buffer;
                const requestId = crypto.randomUUID();
                const { error: insertError } = await DesignAssetService.db()
                    .from("washa_design_requests")
                    .insert({
                        id: requestId,
                        generation_request_id: input.generationRequestId,
                        profile_id: input.profileId,
                        source_asset_id: source.id,
                        master_asset_id: master.id,
                        selected_product_id: selection.garmentId,
                        selected_color_id: selection.colorId,
                        selected_color_hex: selection.colorHex,
                        selected_side: selectedSide,
                        placement_data: provisionalPlacement,
                        mockup_source_type: null,
                        preview_kind: "mockup",
                        prompt: masterPrompt,
                        generation_model: master.model,
                        provider: master.provider,
                        transparency_verification_status: master.alphaChannelStatus,
                        production_readiness_status: "blocked",
                        generation_status: "processing",
                        schema_version: 2,
                    });
                if (insertError) {
                    if (insertError.code === "23505") {
                        const concurrent = await DesignAssetService.recoverGenerationAfterUniqueConflict(
                            input.profileId,
                            input.generationRequestId
                        );
                        if (concurrent) return concurrent;
                    }
                    throw insertError;
                }
                designRequestId = requestId;
            }

            if (!designRequestId) throw new Error("Design request was not persisted.");
            readySourcePreviewContext = {
                source,
                master,
                placement: existingAttempt?.request.placement_data ?? provisionalPlacement,
                pipeline: input.pipeline ?? "standard",
            };
            return await DesignAssetService.composeRequestPreview({
                profileId: input.profileId,
                designRequestId,
                source,
                master,
                masterBuffer,
                selection,
                legacyGarmentReference: input.legacyGarmentReference,
                pipeline: input.pipeline ?? "standard",
            });
        } catch (error) {
            if (
                !designRequestId
                && pendingPrepressContext
                && !isArtworkTextPolicyError(error)
            ) {
                return DesignAssetService.persistPendingPrepressPreview({
                    profileId: input.profileId,
                    generationRequestId: input.generationRequestId,
                    ...pendingPrepressContext,
                });
            }
            if (designRequestId && readySourcePreviewContext) {
                try {
                    return await DesignAssetService.persistReadySourcePreview({
                        profileId: input.profileId,
                        generationRequestId: input.generationRequestId,
                        designRequestId,
                        ...readySourcePreviewContext,
                    });
                } catch {
                    // The normal blocked-state path below preserves retry semantics
                    // if even the durable source-preview update is unavailable.
                }
            }
            if (designRequestId) {
                await DesignAssetService.db()
                    .from("washa_design_requests")
                    .update({
                        production_readiness_status: "blocked",
                        generation_status: "blocked",
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", designRequestId)
                    .eq("profile_id", input.profileId);
            }
            if (isMissingSingleSourceMigration(error)) {
                throw new Error(
                    "قاعدة البيانات لا تحتوي migration الأصول الرئيسية والـrevisions الخاصة بـ WASHA AI."
                );
            }
            throw error;
        }
    }
}
