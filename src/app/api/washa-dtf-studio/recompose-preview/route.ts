import { NextRequest, NextResponse } from "next/server";
import { DesignAssetService } from "@/app/api/washa-dtf-studio/services/design-asset.service";
import { recomposePreviewSchema } from "@/app/api/washa-dtf-studio/validators/ai-studio.schema";
import {
    enforceDtfRouteRateLimit,
    parseAndValidateDtfJson,
    requireDtfRouteAccess,
} from "@/app/api/washa-dtf-studio/utils/route-runtime";
import {
    canUseWashaAiDevSurfaceForGeneration,
    resolveWashaAiDevGenerationIdentity,
} from "@/lib/washa-ai-dev-access";

export const runtime = "nodejs";
export const maxDuration = 150;

export async function POST(request: NextRequest) {
    const accessResult = await requireDtfRouteAccess();
    if (accessResult.response) return accessResult.response;
    const access = accessResult.access;
    const devIdentity = resolveWashaAiDevGenerationIdentity(request);
    if (devIdentity.kind === "invalid") {
        return NextResponse.json(
            { error: "انتهت صلاحية جلسة النسخة التطويرية. حدّث الصفحة ثم أعد المحاولة." },
            { status: 409 }
        );
    }
    const devSurface = devIdentity.kind === "dev" ? devIdentity.surface : null;
    if (
        devSurface
        && !await canUseWashaAiDevSurfaceForGeneration(
            devSurface,
            access.role === "admin" || access.role === "dev"
        )
    ) {
        return NextResponse.json({ error: "لا يملك المستخدم صلاحية إكمال العملية." }, { status: 403 });
    }
    if (!access.profileId) {
        return NextResponse.json({ error: "تعذر ربط التصميم بحساب المستخدم." }, { status: 401 });
    }

    const rateLimit = await enforceDtfRouteRateLimit(request, access, {
        keyPrefix: "recompose",
        limit: 20,
        windowMs: 60_000,
        message: "تم تجاوز حد تحديث المعاينة. انتظر قليلاً ثم حاول مجدداً.",
    });
    if (rateLimit) return rateLimit;

    const parsed = await parseAndValidateDtfJson(request, recomposePreviewSchema, {
        invalidJsonMessage: "طلب غير صالح.",
        fallbackValidationMessage: "بيانات تحديث المعاينة غير مكتملة.",
    });
    if (parsed.response) return parsed.response;

    try {
        const { designRequestId, masterAssetId, generationContext } = parsed.data;
        const pipeline = devSurface === "dev-v3" ? "prompt_native" : "standard";
        const result = await DesignAssetService.recompose({
            profileId: access.profileId,
            designRequestId,
            masterAssetId,
            selection: {
                garmentId: generationContext.garmentId ?? null,
                colorId: generationContext.colorId ?? null,
                sizeId: generationContext.sizeId ?? null,
                garmentType: generationContext.garmentType,
                garmentColor: generationContext.garmentColor,
                colorHex: generationContext.colorHex ?? null,
                printPosition: generationContext.printPosition,
                printSize: generationContext.printSize,
                printScale: generationContext.printScale,
                printOffsetX: generationContext.printOffsetX,
                printOffsetY: generationContext.printOffsetY,
            },
            pipeline,
        });
        return NextResponse.json({ ok: true, ...result });
    } catch (error) {
        console.error("[washa-dtf-studio.recompose-preview]", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "تعذر تحديث المعاينة." },
            { status: 422 }
        );
    }
}
