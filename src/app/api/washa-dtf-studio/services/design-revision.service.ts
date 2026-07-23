import { getSupabaseAdminClient } from "@/lib/supabase";
import { createPrintProductionPng } from "@/lib/washa-artwork/compositor";
import { assertStoredAssetIntegrity, sha256Hex } from "@/lib/washa-artwork/validation";
import type { PlacementTransform } from "@/lib/washa-artwork/types";
import { normalizeWashaGenerationPipeline } from "@/lib/washa-prompt-native/types";
import { StorageService } from "@/app/api/washa-dtf-studio/services/storage.service";

type ApproveRevisionInput = {
    profileId: string;
    designRequestId: string;
    sourceAssetId?: string | null;
    sourceChecksum?: string | null;
    masterAssetId?: string | null;
    masterChecksum?: string | null;
    placement: PlacementTransform;
    productVariant: Record<string, unknown>;
    garmentColor: Record<string, unknown>;
};

export type ApprovedRevision = {
    designRevisionId: string;
    sourceAssetId: string;
    sourceAssetUrl: string;
    sourceChecksum: string;
    masterAssetId: string | null;
    masterAssetUrl: string | null;
    masterChecksum: string | null;
    printAssetPath: string | null;
    printAssetUrl: string | null;
    frontPreviewUrl: string | null;
    backPreviewUrl: string | null;
    mockupSourceType: "reference" | "generated_blank_garment" | "source_preview";
    pipeline: "standard" | "prompt_native";
    productionReadinessStatus: "ready" | "pending_prepress";
};

export type DesignSubmissionPolicy = {
    pipeline: "standard" | "prompt_native";
    termsRequired: boolean;
};

function placementsEqual(
    left: PlacementTransform | null | undefined,
    right: PlacementTransform
) {
    return Boolean(
        left
        && left.side === right.side
        && left.x === right.x
        && left.y === right.y
        && left.scale === right.scale
        && left.rotation === right.rotation
        && left.printWidthCm === right.printWidthCm
        && left.printHeightCm === right.printHeightCm
        && left.anchorX === right.anchorX
        && left.anchorY === right.anchorY
        && left.referenceMockupId === right.referenceMockupId
        && left.printAreaId === right.printAreaId
        && left.transformVersion === right.transformVersion
    );
}

export class DesignRevisionService {
    private static db() {
        return getSupabaseAdminClient() as any;
    }

    static async getSubmissionPolicy(input: {
        profileId: string;
        designRequestId: string;
    }): Promise<DesignSubmissionPolicy> {
        const sb = DesignRevisionService.db();
        const { data: request, error: requestError } = await sb
            .from("washa_design_requests")
            .select("id, source_asset_id, master_asset_id")
            .eq("id", input.designRequestId)
            .eq("profile_id", input.profileId)
            .single();
        if (requestError || !request) {
            throw new Error("Design request is missing or does not belong to this customer.");
        }

        const assetTable = request.master_asset_id
            ? "washa_design_master_assets"
            : "washa_design_source_assets";
        const assetId = request.master_asset_id ?? request.source_asset_id;
        if (!assetId) {
            throw new Error("Design request has no stored generation asset.");
        }

        const { data: asset, error: assetError } = await sb
            .from(assetTable)
            .select("generation_parameters")
            .eq("id", assetId)
            .eq("profile_id", input.profileId)
            .single();
        if (assetError || !asset) {
            throw new Error("Design request generation asset is missing.");
        }

        const pipeline = normalizeWashaGenerationPipeline(
            asset.generation_parameters?.pipeline
        );
        return {
            pipeline,
            termsRequired: pipeline === "prompt_native",
        };
    }

    static async approve(input: ApproveRevisionInput): Promise<ApprovedRevision> {
        const sb = DesignRevisionService.db();
        const { data: request, error: requestError } = await sb
            .from("washa_design_requests")
            .select("*")
            .eq("id", input.designRequestId)
            .eq("profile_id", input.profileId)
            .single();
        if (requestError || !request) {
            throw new Error("Design request is missing or does not belong to this customer.");
        }
        if (
            !["ready", "pending_prepress"].includes(request.production_readiness_status)
            || request.generation_status !== "ready"
            || !request.mockup_source_type
        ) {
            throw new Error("Design request is not ready for approval.");
        }
        if (
            request.master_asset_id
            && request.master_asset_id !== input.masterAssetId
        ) {
            throw new Error("Design request master asset does not match the submitted asset.");
        }
        if (
            request.source_asset_id
            && input.sourceAssetId
            && request.source_asset_id !== input.sourceAssetId
        ) {
            throw new Error("Design request source asset does not match the submitted asset.");
        }
        const storedPlacement = request.placement_data as PlacementTransform | null;
        const placementMatches = placementsEqual(storedPlacement, input.placement);
        if (!placementMatches || request.selected_side !== input.placement.side) {
            throw new Error("Approved placement does not match the generated customer preview.");
        }
        const submittedGarmentId =
            typeof input.productVariant.garmentId === "string"
                ? input.productVariant.garmentId
                : null;
        const submittedColorId =
            typeof input.garmentColor.colorId === "string"
                ? input.garmentColor.colorId
                : null;
        const submittedColorHex =
            typeof input.garmentColor.colorHex === "string"
                ? input.garmentColor.colorHex.toLowerCase()
                : null;
        const submittedPrintPosition =
            typeof input.productVariant.printPosition === "string"
                ? input.productVariant.printPosition
                : null;
        const submittedSide = submittedPrintPosition === "back" ? "back" : "front";
        if (
            request.selected_product_id !== submittedGarmentId
            || request.selected_color_id !== submittedColorId
            || (request.selected_color_hex || "").toLowerCase() !== (submittedColorHex || "")
            || submittedSide !== request.selected_side
        ) {
            throw new Error("Approved product, color, or side does not match the customer preview.");
        }

        if (request.production_readiness_status === "pending_prepress") {
            if (!request.source_asset_id || !input.sourceAssetId || !input.sourceChecksum) {
                throw new Error("Generated source identity is required for pending prepress approval.");
            }
            const { data: source, error: sourceError } = await sb
                .from("washa_design_source_assets")
                .select("*")
                .eq("id", input.sourceAssetId)
                .eq("profile_id", input.profileId)
                .single();
            if (sourceError || !source) throw new Error("Generated source asset is missing.");
            if (
                source.sha256_checksum !== input.sourceChecksum
                || request.source_asset_id !== source.id
            ) {
                throw new Error("Generated source checksum or identity mismatch.");
            }
            const storedSource = await StorageService.downloadStoredBuffer(
                source.permanent_storage_path,
                { bucket: source.storage_bucket }
            );
            if ("error" in storedSource) throw new Error(storedSource.error);
            if (sha256Hex(storedSource) !== source.sha256_checksum) {
                throw new Error("Stored generated source checksum mismatch.");
            }

            if (request.current_revision_id) {
                const { data: currentRevision, error: currentRevisionError } = await sb
                    .from("washa_design_revisions")
                    .select("*")
                    .eq("id", request.current_revision_id)
                    .eq("design_request_id", request.id)
                    .maybeSingle();
                if (currentRevisionError) throw currentRevisionError;
                const revisionPlacement = currentRevision?.placement_transform as PlacementTransform | null;
                const samePlacement = placementsEqual(revisionPlacement, input.placement);
                if (
                    currentRevision
                    && currentRevision.source_asset_id === source.id
                    && currentRevision.source_sha256_checksum === source.sha256_checksum
                    && currentRevision.production_readiness_status === "pending_prepress"
                    && samePlacement
                ) {
                    return {
                        designRevisionId: currentRevision.id,
                        sourceAssetId: source.id,
                        sourceAssetUrl: source.permanent_url,
                        sourceChecksum: source.sha256_checksum,
                        masterAssetId: null,
                        masterAssetUrl: null,
                        masterChecksum: null,
                        printAssetPath: null,
                        printAssetUrl: null,
                        frontPreviewUrl: request.front_preview_url,
                        backPreviewUrl: request.back_preview_url,
                        mockupSourceType: "source_preview",
                        pipeline: normalizeWashaGenerationPipeline(source.generation_parameters?.pipeline),
                        productionReadinessStatus: "pending_prepress",
                    };
                }
            }

            const { data: lastRevision, error: revisionLookupError } = await sb
                .from("washa_design_revisions")
                .select("revision_number")
                .eq("design_request_id", request.id)
                .order("revision_number", { ascending: false })
                .limit(1)
                .maybeSingle();
            if (revisionLookupError) throw revisionLookupError;
            const revisionNumber = Number(lastRevision?.revision_number || 0) + 1;
            const designRevisionId = crypto.randomUUID();
            const { error: revisionError } = await sb
                .from("washa_design_revisions")
                .insert({
                    id: designRevisionId,
                    design_request_id: request.id,
                    revision_number: revisionNumber,
                    source_asset_id: source.id,
                    source_asset_path: source.permanent_storage_path,
                    source_sha256_checksum: source.sha256_checksum,
                    master_asset_id: null,
                    master_asset_path: null,
                    master_sha256_checksum: null,
                    width: source.width,
                    height: source.height,
                    mime_type: source.mime_type,
                    transparency_status: "pending",
                    prompt: source.prompt,
                    generation_model: source.generation_model,
                    provider: source.provider,
                    generation_parameters: source.generation_parameters,
                    product_variant: input.productVariant,
                    garment_color: input.garmentColor,
                    selected_side: input.placement.side,
                    placement_transform: input.placement,
                    print_dimensions: {
                        widthCm: input.placement.printWidthCm,
                        heightCm: input.placement.printHeightCm,
                        dpi: null,
                        widthPx: null,
                        heightPx: null,
                    },
                    reference_mockup_id: request.reference_mockup_id,
                    generated_blank_garment_mockup_id: request.generated_garment_mockup_id,
                    customer_preview_urls: {
                        front: request.front_preview_url,
                        back: request.back_preview_url,
                    },
                    print_asset_path: null,
                    print_asset_url: null,
                    production_readiness_status: "pending_prepress",
                    schema_version: 2,
                });
            if (revisionError) throw revisionError;

            const { error: requestUpdateError } = await sb
                .from("washa_design_requests")
                .update({
                    current_revision_id: designRevisionId,
                    placement_data: input.placement,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", request.id)
                .eq("source_asset_id", source.id);
            if (requestUpdateError) throw requestUpdateError;

            return {
                designRevisionId,
                sourceAssetId: source.id,
                sourceAssetUrl: source.permanent_url,
                sourceChecksum: source.sha256_checksum,
                masterAssetId: null,
                masterAssetUrl: null,
                masterChecksum: null,
                printAssetPath: null,
                printAssetUrl: null,
                frontPreviewUrl: request.front_preview_url,
                backPreviewUrl: request.back_preview_url,
                mockupSourceType: "source_preview",
                pipeline: normalizeWashaGenerationPipeline(source.generation_parameters?.pipeline),
                productionReadinessStatus: "pending_prepress",
            };
        }

        if (!input.masterAssetId || !input.masterChecksum) {
            throw new Error("Master artwork identity is required for production-ready approval.");
        }

        const { data: master, error: masterError } = await sb
            .from("washa_design_master_assets")
            .select("*")
            .eq("id", input.masterAssetId)
            .eq("profile_id", input.profileId)
            .single();
        if (masterError || !master) throw new Error("Master artwork asset is missing.");
        if (
            master.sha256_checksum !== input.masterChecksum
            || request.master_asset_id !== master.id
        ) {
            throw new Error("Master artwork checksum or identity mismatch.");
        }
        if (master.alpha_channel_status === "failed") {
            throw new Error("Master artwork transparency verification failed.");
        }
        let approvedSource = {
            id: master.id as string,
            permanent_url: master.permanent_url as string,
            permanent_storage_path: master.permanent_storage_path as string,
            sha256_checksum: master.sha256_checksum as string,
        };
        if (request.source_asset_id) {
            const { data: source, error: sourceError } = await sb
                .from("washa_design_source_assets")
                .select("id, permanent_url, permanent_storage_path, sha256_checksum")
                .eq("id", request.source_asset_id)
                .eq("profile_id", input.profileId)
                .single();
            if (sourceError || !source) throw new Error("Generated source asset is missing.");
            if (
                (input.sourceAssetId && input.sourceAssetId !== source.id)
                || (input.sourceChecksum && input.sourceChecksum !== source.sha256_checksum)
            ) {
                throw new Error("Generated source checksum or identity mismatch.");
            }
            approvedSource = source;
        }
        if (request.current_revision_id) {
            const { data: currentRevision, error: currentRevisionError } = await sb
                .from("washa_design_revisions")
                .select("*")
                .eq("id", request.current_revision_id)
                .eq("design_request_id", request.id)
                .maybeSingle();
            if (currentRevisionError) throw currentRevisionError;
            const revisionPlacement = currentRevision?.placement_transform as PlacementTransform | null;
            const samePlacement = placementsEqual(revisionPlacement, input.placement);
            if (
                currentRevision
                && currentRevision.master_asset_id === master.id
                && currentRevision.master_sha256_checksum === master.sha256_checksum
                && samePlacement
            ) {
                return {
                    designRevisionId: currentRevision.id,
                    sourceAssetId: approvedSource.id,
                    sourceAssetUrl: approvedSource.permanent_url,
                    sourceChecksum: approvedSource.sha256_checksum,
                    masterAssetId: master.id,
                    masterAssetUrl: master.permanent_url,
                    masterChecksum: master.sha256_checksum,
                    printAssetPath: currentRevision.print_asset_path,
                    printAssetUrl: currentRevision.print_asset_url,
                    frontPreviewUrl: request.front_preview_url,
                    backPreviewUrl: request.back_preview_url,
                    mockupSourceType: request.mockup_source_type,
                    pipeline: normalizeWashaGenerationPipeline(master.generation_parameters?.pipeline),
                    productionReadinessStatus: "ready",
                };
            }
        }

        const stored = await StorageService.downloadStoredBuffer(master.permanent_storage_path, {
            bucket: master.storage_bucket,
        });
        if ("error" in stored) throw new Error(stored.error);
        if (sha256Hex(stored) !== master.sha256_checksum) {
            throw new Error("Stored master artwork checksum mismatch.");
        }
        await assertStoredAssetIntegrity(stored, stored);

        const print = await createPrintProductionPng({
            masterArtwork: stored,
            printWidthCm: input.placement.printWidthCm,
            printHeightCm: input.placement.printHeightCm,
            dpi: 300,
        });
        const designRevisionId = crypto.randomUUID();
        const derivativeId = crypto.randomUUID();
        const printAssetPath =
            `design-masters/${master.id}/revisions/${designRevisionId}/print-production.png`;
        const uploaded = await StorageService.uploadImmutableBuffer(print.buffer, printAssetPath, {
            bucket: master.storage_bucket,
            mimeType: "image/png",
            accessUrl: StorageService.getPrivateAssetUrl("derivative", derivativeId),
            maxBytes: 80 * 1024 * 1024,
            metadata: {
                sourceMasterAssetId: master.id,
                sourceChecksum: master.sha256_checksum,
                designRevisionId,
                derivativeType: "print_production",
            },
        });
        if ("error" in uploaded) throw new Error(uploaded.error);
        const storedPrint = await StorageService.downloadStoredBuffer(uploaded.path, {
            bucket: uploaded.bucket,
        });
        if ("error" in storedPrint) throw new Error(storedPrint.error);
        if (sha256Hex(storedPrint) !== sha256Hex(print.buffer)) {
            throw new Error("Stored production PNG checksum mismatch.");
        }

        const { data: lastRevision, error: revisionLookupError } = await sb
            .from("washa_design_revisions")
            .select("revision_number")
            .eq("design_request_id", request.id)
            .order("revision_number", { ascending: false })
            .limit(1)
            .maybeSingle();
        if (revisionLookupError) throw revisionLookupError;
        const revisionNumber = Number(lastRevision?.revision_number || 0) + 1;

        const { error: derivativeError } = await sb
            .from("washa_design_asset_derivatives")
            .insert({
                id: derivativeId,
                source_master_asset_id: master.id,
                source_checksum: master.sha256_checksum,
                derivative_sha256_checksum: sha256Hex(print.buffer),
                derivative_type: "print_production",
                storage_bucket: uploaded.bucket,
                storage_path: uploaded.path,
                access_url: uploaded.url,
                mime_type: "image/png",
                width: print.width,
                height: print.height,
                transformation_metadata: {
                    deterministic: true,
                    source: "master_asset",
                    dpi: print.dpi,
                    printWidthCm: input.placement.printWidthCm,
                    printHeightCm: input.placement.printHeightCm,
                    alphaPreserved: true,
                    fabricEffectsIncluded: false,
                },
            });
        if (derivativeError) throw derivativeError;

        const { error: revisionError } = await sb
            .from("washa_design_revisions")
            .insert({
                id: designRevisionId,
                design_request_id: request.id,
                revision_number: revisionNumber,
                source_asset_id: approvedSource.id,
                source_asset_path: approvedSource.permanent_storage_path,
                source_sha256_checksum: approvedSource.sha256_checksum,
                master_asset_id: master.id,
                master_asset_path: master.permanent_storage_path,
                master_sha256_checksum: master.sha256_checksum,
                width: master.width,
                height: master.height,
                mime_type: master.mime_type,
                transparency_status: master.alpha_channel_status,
                prompt: master.prompt,
                generation_model: master.generation_model,
                provider: master.provider,
                generation_parameters: master.generation_parameters,
                product_variant: input.productVariant,
                garment_color: input.garmentColor,
                selected_side: input.placement.side,
                placement_transform: input.placement,
                print_dimensions: {
                    widthCm: input.placement.printWidthCm,
                    heightCm: input.placement.printHeightCm,
                    dpi: print.dpi,
                    widthPx: print.width,
                    heightPx: print.height,
                },
                reference_mockup_id: request.reference_mockup_id,
                generated_blank_garment_mockup_id: request.generated_garment_mockup_id,
                customer_preview_urls: {
                    front: request.front_preview_url,
                    back: request.back_preview_url,
                },
                print_asset_path: uploaded.path,
                print_asset_url: uploaded.url,
                production_readiness_status: "ready",
                schema_version: 2,
            });
        if (revisionError) throw revisionError;

        const { error: requestUpdateError } = await sb
            .from("washa_design_requests")
            .update({
                current_revision_id: designRevisionId,
                placement_data: input.placement,
                updated_at: new Date().toISOString(),
            })
            .eq("id", request.id)
            .eq("master_asset_id", master.id);
        if (requestUpdateError) throw requestUpdateError;

        return {
            designRevisionId,
            sourceAssetId: approvedSource.id,
            sourceAssetUrl: approvedSource.permanent_url,
            sourceChecksum: approvedSource.sha256_checksum,
            masterAssetId: master.id,
            masterAssetUrl: master.permanent_url,
            masterChecksum: master.sha256_checksum,
            printAssetPath: uploaded.path,
            printAssetUrl: uploaded.url,
            frontPreviewUrl: request.front_preview_url,
            backPreviewUrl: request.back_preview_url,
            mockupSourceType: request.mockup_source_type,
            pipeline: normalizeWashaGenerationPipeline(master.generation_parameters?.pipeline),
            productionReadinessStatus: "ready",
        };
    }
}
