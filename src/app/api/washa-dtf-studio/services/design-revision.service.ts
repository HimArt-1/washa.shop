import { getSupabaseAdminClient } from "@/lib/supabase";
import { createPrintProductionPng } from "@/lib/washa-artwork/compositor";
import { assertStoredAssetIntegrity, sha256Hex } from "@/lib/washa-artwork/validation";
import type { PlacementTransform } from "@/lib/washa-artwork/types";
import { normalizeWashaGenerationPipeline } from "@/lib/washa-prompt-native/types";
import { StorageService } from "@/app/api/washa-dtf-studio/services/storage.service";

type ApproveRevisionInput = {
    profileId: string;
    designRequestId: string;
    masterAssetId: string;
    masterChecksum: string;
    placement: PlacementTransform;
    productVariant: Record<string, unknown>;
    garmentColor: Record<string, unknown>;
};

export type ApprovedRevision = {
    designRevisionId: string;
    masterAssetId: string;
    masterAssetUrl: string;
    masterChecksum: string;
    printAssetPath: string;
    printAssetUrl: string;
    frontPreviewUrl: string | null;
    backPreviewUrl: string | null;
    mockupSourceType: "reference" | "generated_blank_garment";
    pipeline: "standard" | "prompt_native";
};

export class DesignRevisionService {
    private static db() {
        return getSupabaseAdminClient() as any;
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
            request.production_readiness_status !== "ready"
            || request.generation_status !== "ready"
            || !request.mockup_source_type
        ) {
            throw new Error("Design request is not production-ready.");
        }
        if (request.master_asset_id !== input.masterAssetId) {
            throw new Error("Design request master asset does not match the submitted asset.");
        }
        const storedPlacement = request.placement_data as PlacementTransform | null;
        const placementMatches = storedPlacement
            && storedPlacement.side === input.placement.side
            && storedPlacement.x === input.placement.x
            && storedPlacement.y === input.placement.y
            && storedPlacement.scale === input.placement.scale
            && storedPlacement.rotation === input.placement.rotation
            && storedPlacement.printWidthCm === input.placement.printWidthCm
            && storedPlacement.printHeightCm === input.placement.printHeightCm
            && storedPlacement.anchorX === input.placement.anchorX
            && storedPlacement.anchorY === input.placement.anchorY
            && storedPlacement.referenceMockupId === input.placement.referenceMockupId
            && storedPlacement.printAreaId === input.placement.printAreaId
            && storedPlacement.transformVersion === input.placement.transformVersion;
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
        if (request.current_revision_id) {
            const { data: currentRevision, error: currentRevisionError } = await sb
                .from("washa_design_revisions")
                .select("*")
                .eq("id", request.current_revision_id)
                .eq("design_request_id", request.id)
                .maybeSingle();
            if (currentRevisionError) throw currentRevisionError;
            const revisionPlacement = currentRevision?.placement_transform as PlacementTransform | null;
            const samePlacement = revisionPlacement
                && revisionPlacement.side === input.placement.side
                && revisionPlacement.x === input.placement.x
                && revisionPlacement.y === input.placement.y
                && revisionPlacement.scale === input.placement.scale
                && revisionPlacement.rotation === input.placement.rotation
                && revisionPlacement.printWidthCm === input.placement.printWidthCm
                && revisionPlacement.printHeightCm === input.placement.printHeightCm
                && revisionPlacement.anchorX === input.placement.anchorX
                && revisionPlacement.anchorY === input.placement.anchorY
                && revisionPlacement.referenceMockupId === input.placement.referenceMockupId
                && revisionPlacement.printAreaId === input.placement.printAreaId
                && revisionPlacement.transformVersion === input.placement.transformVersion;
            if (
                currentRevision
                && currentRevision.master_asset_id === master.id
                && currentRevision.master_sha256_checksum === master.sha256_checksum
                && samePlacement
            ) {
                return {
                    designRevisionId: currentRevision.id,
                    masterAssetId: master.id,
                    masterAssetUrl: master.permanent_url,
                    masterChecksum: master.sha256_checksum,
                    printAssetPath: currentRevision.print_asset_path,
                    printAssetUrl: currentRevision.print_asset_url,
                    frontPreviewUrl: request.front_preview_url,
                    backPreviewUrl: request.back_preview_url,
                    mockupSourceType: request.mockup_source_type,
                    pipeline: normalizeWashaGenerationPipeline(master.generation_parameters?.pipeline),
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
                schema_version: 1,
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
            masterAssetId: master.id,
            masterAssetUrl: master.permanent_url,
            masterChecksum: master.sha256_checksum,
            printAssetPath: uploaded.path,
            printAssetUrl: uploaded.url,
            frontPreviewUrl: request.front_preview_url,
            backPreviewUrl: request.back_preview_url,
            mockupSourceType: request.mockup_source_type,
            pipeline: normalizeWashaGenerationPipeline(master.generation_parameters?.pipeline),
        };
    }
}
