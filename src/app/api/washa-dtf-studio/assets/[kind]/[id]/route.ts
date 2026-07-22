import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { StorageService } from "@/app/api/washa-dtf-studio/services/storage.service";
import { requireDtfRouteAccess } from "@/app/api/washa-dtf-studio/utils/route-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STAFF_ROLES = new Set(["admin", "wushsha", "dev"]);
const ALLOWED_KINDS = new Set(["source", "master", "derivative", "garment"]);

type AssetLocation = {
    bucket: string;
    path: string;
    mimeType: string;
    ownerProfileId: string | null;
};

async function resolveAssetLocation(kind: string, id: string): Promise<AssetLocation | null> {
    const sb = getSupabaseAdminClient() as any;

    if (kind === "source") {
        const { data, error } = await sb
            .from("washa_design_source_assets")
            .select("profile_id, storage_bucket, permanent_storage_path, mime_type")
            .eq("id", id)
            .maybeSingle();
        if (error || !data) return null;
        return {
            bucket: data.storage_bucket,
            path: data.permanent_storage_path,
            mimeType: data.mime_type,
            ownerProfileId: data.profile_id,
        };
    }

    if (kind === "master") {
        const { data, error } = await sb
            .from("washa_design_master_assets")
            .select("profile_id, storage_bucket, permanent_storage_path, mime_type")
            .eq("id", id)
            .maybeSingle();
        if (error || !data) return null;
        return {
            bucket: data.storage_bucket,
            path: data.permanent_storage_path,
            mimeType: data.mime_type,
            ownerProfileId: data.profile_id,
        };
    }

    if (kind === "derivative") {
        const { data, error } = await sb
            .from("washa_design_asset_derivatives")
            .select("source_master_asset_id, storage_bucket, storage_path, mime_type")
            .eq("id", id)
            .maybeSingle();
        if (error || !data) return null;
        const { data: master, error: masterError } = await sb
            .from("washa_design_master_assets")
            .select("profile_id")
            .eq("id", data.source_master_asset_id)
            .maybeSingle();
        if (masterError || !master) return null;
        return {
            bucket: data.storage_bucket,
            path: data.storage_path,
            mimeType: data.mime_type,
            ownerProfileId: master.profile_id,
        };
    }

    const { data, error } = await sb
        .from("washa_garment_mockup_assets")
        .select("storage_bucket, storage_path, is_active")
        .eq("id", id)
        .maybeSingle();
    if (error || !data?.is_active || !data.storage_path) return null;
    return {
        bucket: data.storage_bucket || "washa-design-assets",
        path: data.storage_path,
        mimeType: "image/png",
        ownerProfileId: null,
    };
}

export async function GET(
    _request: NextRequest,
    context: { params: Promise<{ kind: string; id: string }> }
) {
    const { kind, id } = await context.params;
    if (!ALLOWED_KINDS.has(kind) || !/^[0-9a-f-]{36}$/i.test(id)) {
        return NextResponse.json({ error: "Asset not found." }, { status: 404 });
    }

    const accessResult = await requireDtfRouteAccess();
    if (accessResult.response) return accessResult.response;
    const access = accessResult.access;
    if (!access.profileId) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const asset = await resolveAssetLocation(kind, id);
    if (!asset) {
        return NextResponse.json({ error: "Asset not found." }, { status: 404 });
    }
    if (
        kind !== "garment"
        && asset.ownerProfileId !== access.profileId
        && !STAFF_ROLES.has(access.role || "")
    ) {
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const stored = await StorageService.downloadStoredBuffer(asset.path, {
        bucket: asset.bucket,
    });
    if ("error" in stored) {
        return NextResponse.json({ error: "Asset is unavailable." }, { status: stored.status });
    }

    return new NextResponse(new Uint8Array(stored), {
        headers: {
            "Content-Type": asset.mimeType,
            "Content-Length": String(stored.byteLength),
            "Content-Disposition": "inline",
            "Cache-Control": "private, max-age=31536000, immutable",
            "X-Content-Type-Options": "nosniff",
        },
    });
}
