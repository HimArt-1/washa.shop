import { getSupabaseAdminClient } from "@/lib/supabase";
import {
    inspectGeneratedArtworkBytes,
    type GeneratedArtworkImageDiagnostics,
} from "@/lib/washa-artwork/normalization";
import { sha256Hex } from "@/lib/washa-artwork/validation";
import { StorageService } from "./storage.service";

export type GeneratedSourceAssetDescriptor = {
    id: string;
    permanentStoragePath: string;
    permanentUrl: string;
    checksum: string;
    width: number;
    height: number;
    mimeType: string;
    backgroundMode: "transparent" | "opaque";
    provider: string;
    model: string;
    prompt: string;
    generationParameters: Record<string, unknown>;
    diagnostics: GeneratedArtworkImageDiagnostics;
    createdAt: string;
};

type GeneratedSourceAssetRow = {
    id: string;
    storage_bucket?: string | null;
    permanent_storage_path: string;
    permanent_url: string;
    sha256_checksum: string;
    width: number;
    height: number;
    mime_type: string;
    background_mode: "transparent" | "opaque";
    provider: string;
    generation_model: string;
    prompt: string;
    generation_parameters: Record<string, unknown>;
    inspection_report: GeneratedArtworkImageDiagnostics;
    created_at: string;
};

function mapSource(row: GeneratedSourceAssetRow): GeneratedSourceAssetDescriptor {
    return {
        id: row.id,
        permanentStoragePath: row.permanent_storage_path,
        permanentUrl: row.permanent_url,
        checksum: row.sha256_checksum,
        width: row.width,
        height: row.height,
        mimeType: row.mime_type,
        backgroundMode: row.background_mode,
        provider: row.provider,
        model: row.generation_model,
        prompt: row.prompt,
        generationParameters: row.generation_parameters,
        diagnostics: row.inspection_report,
        createdAt: row.created_at,
    };
}

function resolveStoredFormat(diagnostics: GeneratedArtworkImageDiagnostics) {
    if (diagnostics.detectedFormat === "png") {
        return { extension: "png", mimeType: "image/png" };
    }
    if (diagnostics.detectedFormat === "jpeg") {
        return { extension: "jpg", mimeType: "image/jpeg" };
    }
    if (diagnostics.detectedFormat === "webp") {
        return { extension: "webp", mimeType: "image/webp" };
    }
    throw new Error("Generated source uses an unsupported image format.");
}

export class GeneratedSourceAssetService {
    private static db() {
        return getSupabaseAdminClient() as any;
    }

    static async capture(params: {
        profileId: string;
        buffer: Buffer;
        declaredMimeType: string;
        provider: string;
        model: string;
        prompt: string;
        generationParameters: Record<string, unknown>;
    }): Promise<{ source: GeneratedSourceAssetDescriptor; buffer: Buffer }> {
        const diagnostics = await inspectGeneratedArtworkBytes(
            params.buffer,
            params.declaredMimeType
        );
        const storedFormat = resolveStoredFormat(diagnostics);
        const checksum = sha256Hex(params.buffer);
        const sb = GeneratedSourceAssetService.db();
        const { data: existing, error: existingError } = await sb
            .from("washa_design_source_assets")
            .select("*")
            .eq("profile_id", params.profileId)
            .eq("sha256_checksum", checksum)
            .maybeSingle();
        if (existingError) throw existingError;
        if (existing) {
            const existingRow = existing as GeneratedSourceAssetRow;
            const stored = await StorageService.downloadStoredBuffer(
                existingRow.permanent_storage_path,
                { bucket: existingRow.storage_bucket || "washa-design-assets" }
            );
            if ("error" in stored) throw new Error(stored.error);
            if (sha256Hex(stored) !== checksum) {
                throw new Error("Stored generated source checksum mismatch.");
            }
            return { source: mapSource(existingRow), buffer: stored };
        }

        const sourceAssetId = crypto.randomUUID();
        const storagePath = [
            "design-sources",
            params.profileId,
            sourceAssetId,
            `provider-output.${storedFormat.extension}`,
        ].join("/");
        const uploaded = await StorageService.uploadImmutableBuffer(
            params.buffer,
            storagePath,
            {
                mimeType: storedFormat.mimeType,
                accessUrl: StorageService.getPrivateAssetUrl("source", sourceAssetId),
                metadata: {
                    sourceAssetId,
                    checksum,
                    immutable: "true",
                    source: "washa-ai-provider-output",
                },
            }
        );
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
        if (sha256Hex(stored) !== checksum) {
            await StorageService.removeStoredObject(uploaded.path, {
                bucket: uploaded.bucket,
            });
            throw new Error("Stored generated source checksum mismatch.");
        }

        const createdAt = new Date().toISOString();
        const row: GeneratedSourceAssetRow = {
            id: sourceAssetId,
            storage_bucket: uploaded.bucket,
            permanent_storage_path: uploaded.path,
            permanent_url: uploaded.url,
            sha256_checksum: checksum,
            width: diagnostics.width,
            height: diagnostics.height,
            mime_type: storedFormat.mimeType,
            background_mode:
                diagnostics.hasAlphaChannel && diagnostics.transparentPixelRatio > 0
                    ? "transparent"
                    : "opaque",
            provider: params.provider,
            generation_model: params.model,
            prompt: params.prompt,
            generation_parameters: params.generationParameters,
            inspection_report: diagnostics,
            created_at: createdAt,
        };
        const { error: insertError } = await sb
            .from("washa_design_source_assets")
            .insert({ ...row, profile_id: params.profileId });
        if (insertError) {
            await StorageService.removeStoredObject(uploaded.path, {
                bucket: uploaded.bucket,
            });
            if (insertError.code === "23505") {
                const { data: winner, error: winnerError } = await sb
                    .from("washa_design_source_assets")
                    .select("*")
                    .eq("profile_id", params.profileId)
                    .eq("sha256_checksum", checksum)
                    .single();
                if (winnerError || !winner) throw winnerError || insertError;
                const winnerRow = winner as GeneratedSourceAssetRow;
                const winnerBuffer = await StorageService.downloadStoredBuffer(
                    winnerRow.permanent_storage_path,
                    { bucket: winnerRow.storage_bucket || "washa-design-assets" }
                );
                if ("error" in winnerBuffer) throw new Error(winnerBuffer.error);
                if (sha256Hex(winnerBuffer) !== checksum) {
                    throw new Error("Stored generated source checksum mismatch.");
                }
                return { source: mapSource(winnerRow), buffer: winnerBuffer };
            }
            throw insertError;
        }

        return { source: mapSource(row), buffer: stored };
    }

    static async load(profileId: string, sourceAssetId: string) {
        const { data, error } = await GeneratedSourceAssetService.db()
            .from("washa_design_source_assets")
            .select("*")
            .eq("id", sourceAssetId)
            .eq("profile_id", profileId)
            .single();
        if (error || !data) throw new Error("Generated source asset is missing.");
        const row = data as GeneratedSourceAssetRow;
        const stored = await StorageService.downloadStoredBuffer(
            row.permanent_storage_path,
            { bucket: row.storage_bucket || "washa-design-assets" }
        );
        if ("error" in stored) throw new Error(stored.error);
        if (sha256Hex(stored) !== row.sha256_checksum) {
            throw new Error("Stored generated source checksum mismatch.");
        }
        return { source: mapSource(row), buffer: stored };
    }
}
