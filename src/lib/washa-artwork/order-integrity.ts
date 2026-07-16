import sharp from "sharp";
import { sha256Hex } from "@/lib/washa-artwork/validation";

type SingleSourceOrderIdentity = {
    asset_schema_version?: number | null;
    production_readiness_status?: string | null;
    design_request_id?: string | null;
    design_master_asset_id?: string | null;
    design_revision_id?: string | null;
    master_checksum?: string | null;
    print_asset_path?: string | null;
};

type IntegrityResult =
    | { ok: true; legacy: boolean; printBuffer?: Buffer }
    | { ok: false; error: string };

export async function verifyApprovedOrderAssetGraph(
    supabase: any,
    order: SingleSourceOrderIdentity
): Promise<IntegrityResult> {
    if ((order.asset_schema_version ?? 0) < 1) {
        return { ok: true, legacy: true };
    }
    try {
        if (
            order.production_readiness_status !== "ready"
            || !order.design_request_id
            || !order.design_master_asset_id
            || !order.design_revision_id
            || !order.master_checksum
            || !order.print_asset_path
        ) {
            return { ok: false, error: "بيانات أصل التصميم المعتمد غير مكتملة." };
        }

        const { data: revision, error: revisionError } = await supabase
            .from("washa_design_revisions")
            .select("id, design_request_id, master_asset_id, master_sha256_checksum, print_asset_path")
            .eq("id", order.design_revision_id)
            .maybeSingle();
        if (
            revisionError
            || !revision
            || revision.design_request_id !== order.design_request_id
            || revision.master_asset_id !== order.design_master_asset_id
            || revision.master_sha256_checksum !== order.master_checksum
            || revision.print_asset_path !== order.print_asset_path
        ) {
            return { ok: false, error: "الـrevision المعتمد لا يطابق أصل التصميم أو ملف الإنتاج." };
        }

        const { data: master, error: masterError } = await supabase
            .from("washa_design_master_assets")
            .select("id, storage_bucket, permanent_storage_path, sha256_checksum, alpha_channel_status")
            .eq("id", order.design_master_asset_id)
            .maybeSingle();
        if (
            masterError
            || !master
            || master.sha256_checksum !== order.master_checksum
            || !["verified", "fallback_processed"].includes(master.alpha_channel_status)
        ) {
            return { ok: false, error: "أصل التصميم المعتمد مفقود أو فشل تحقق الشفافية." };
        }

        const { data: derivative, error: derivativeError } = await supabase
            .from("washa_design_asset_derivatives")
            .select("storage_bucket, storage_path, source_master_asset_id, source_checksum, derivative_sha256_checksum, derivative_type")
            .eq("storage_path", order.print_asset_path)
            .eq("derivative_type", "print_production")
            .maybeSingle();
        if (
            derivativeError
            || !derivative
            || derivative.source_master_asset_id !== master.id
            || derivative.source_checksum !== master.sha256_checksum
        ) {
            return { ok: false, error: "ملف الإنتاج غير مرتبط بالأصل المعتمد." };
        }

        const [masterDownload, printDownload] = await Promise.all([
            supabase.storage
                .from(master.storage_bucket || "washa-design-assets")
                .download(master.permanent_storage_path),
            supabase.storage
                .from(derivative.storage_bucket || "washa-design-assets")
                .download(derivative.storage_path),
        ]);
        if (
            masterDownload.error
            || !masterDownload.data
            || printDownload.error
            || !printDownload.data
        ) {
            return { ok: false, error: "تعذر تحميل أصل التصميم أو ملف الإنتاج للتحقق." };
        }

        const masterBuffer = Buffer.from(await masterDownload.data.arrayBuffer());
        const printBuffer = Buffer.from(await printDownload.data.arrayBuffer());
        if (sha256Hex(masterBuffer) !== master.sha256_checksum) {
            return { ok: false, error: "بصمة أصل التصميم المخزن لا تطابق الطلب المعتمد." };
        }
        if (sha256Hex(printBuffer) !== derivative.derivative_sha256_checksum) {
            return { ok: false, error: "بصمة ملف الإنتاج المخزن لا تطابق المشتق المعتمد." };
        }
        const printMetadata = await sharp(printBuffer, { failOn: "error" }).metadata();
        if (printMetadata.format !== "png" || !printMetadata.hasAlpha) {
            return { ok: false, error: "ملف الإنتاج ليس PNG شفافاً صالحاً." };
        }

        return { ok: true, legacy: false, printBuffer };
    } catch {
        return { ok: false, error: "تعذر إكمال تحقق سلامة أصول التصميم المعتمدة." };
    }
}
