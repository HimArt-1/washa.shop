import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { getCurrentUserOrDevAdmin, resolveAdminAccess } from "@/lib/admin-access";
import { checkRateLimit, releaseRateLimit } from "@/lib/rate-limit";
import { canUseWashaAiV4 } from "@/lib/washa-ai-v4-access";
import {
    resolveWashaAiV4ApiKey,
    resolveWashaAiV4ProviderConfiguration,
} from "@/lib/washa-ai-v4-provider";
import { washaAiV4GenerateSchema } from "@/lib/washa-ai-v4-schema";
import { buildPremiumDesignRequestPrompt } from "@/lib/premium-design-request-prompt";
import {
    decodeBoardImageDataUrl,
    generateBoardProviderImage,
} from "@/app/api/washa-dtf-studio/services/board-image-provider.adapter";
import { uploadOptimizedImage } from "@/lib/storage/upload-optimized-image";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { sanitizeWashaDtfProviderMessage } from "@/lib/washa-dtf-provider-config";
import {
    isArtworkTextPolicyError,
} from "@/lib/washa-artwork/arabic-text-verification";
import { isArtworkVerificationUnavailableError } from "@/lib/washa-artwork/verification-error";
import { verifyPremiumBoardArtworkTextPolicy } from "@/lib/washa-ai-v4-board-text-verification";
import { getWashaAiV4ArtStylePrompt } from "@/lib/washa-ai-v4-art-style-prompts";

export const runtime = "nodejs";
export const maxDuration = 180;

const RATE_LIMIT_WINDOW_MS = 60_000;

function error(message: string, status: number, code: string) {
    return NextResponse.json(
        { ok: false, error: message, code },
        { status, headers: { "Cache-Control": "private, no-store" } }
    );
}

export async function POST(request: NextRequest) {
    const startedAt = Date.now();
    const user = await getCurrentUserOrDevAdmin();
    if (!user) {
        return error("سجّل الدخول لبدء توليد WASHA AI v4.", 401, "AUTH_REQUIRED");
    }

    let access: Awaited<ReturnType<typeof resolveAdminAccess>>;
    try {
        access = await resolveAdminAccess(user);
    } catch {
        return error("تعذر التحقق من صلاحية الحساب.", 503, "ACCESS_UNAVAILABLE");
    }

    if (!await canUseWashaAiV4(access.isAdmin)) {
        return error("WASHA AI v4 غير متاح حاليًا.", 404, "V4_DISABLED");
    }
    if (!access.profile?.id) {
        return error("تعذر ربط التوليد بملف المستخدم.", 409, "PROFILE_REQUIRED");
    }

    let payload: unknown;
    try {
        payload = await request.json();
    } catch {
        return error("طلب التوليد غير صالح.", 400, "INVALID_JSON");
    }
    const parsed = washaAiV4GenerateSchema.safeParse(payload);
    if (!parsed.success) {
        return error(
            parsed.error.issues[0]?.message || "بيانات لوحة التصميم غير مكتملة.",
            400,
            "INVALID_REQUEST"
        );
    }

    const rateLimitKey = `washa-ai-v4:${user.id}`;
    const rateLimit = await checkRateLimit(rateLimitKey, 4, RATE_LIMIT_WINDOW_MS);
    if (!rateLimit.success) {
        return error("تم الوصول إلى حد التوليد السريع. انتظر قليلًا ثم أعد المحاولة.", 429, "RATE_LIMITED");
    }

    const configuration = resolveWashaAiV4ProviderConfiguration();
    if (configuration.provider === "unsupported" || !configuration.credentialConfigured) {
        await releaseRateLimit(rateLimitKey, RATE_LIMIT_WINDOW_MS);
        return error("مزود توليد WASHA AI v4 غير جاهز.", 503, "PROVIDER_UNAVAILABLE");
    }

    let providerStarted = false;
    try {
        const input = parsed.data;
        const artStylePrompt = getWashaAiV4ArtStylePrompt(input.artStyleId);
        const prompt = buildPremiumDesignRequestPrompt({
            brief: input.brief,
            garmentName: input.garmentName,
            garmentColorName: input.garmentColorName,
            garmentColorHex: input.garmentColorHex,
            printPosition: input.printPosition,
            customPrintPosition: input.customPrintPosition,
            styleName: input.styleName,
            artStyleName: artStylePrompt,
            artworkColors: input.artworkColors,
        });
        providerStarted = true;
        const v4ApiKey = resolveWashaAiV4ApiKey();
        const providerImage = await generateBoardProviderImage({
            prompt,
            configuration,
            traceId: input.requestId,
            genAiApiKey: v4ApiKey,
        });
        const decoded = decodeBoardImageDataUrl(providerImage.dataUrl);
        const verificationPng = await sharp(decoded.buffer)
            .rotate()
            .resize({
                width: 2048,
                height: 2560,
                fit: "inside",
                withoutEnlargement: true,
            })
            .png({ compressionLevel: 6 })
            .toBuffer();
        await verifyPremiumBoardArtworkTextPolicy({
            boardPng: verificationPng,
            expectedTexts: [input.brief.mainText, input.brief.secondaryText],
            sourceModel: providerImage.model,
            apiKey: v4ApiKey,
        });
        const upload = await uploadOptimizedImage({
            supabase: getSupabaseAdminClient(),
            bucket: "smart-store",
            folder: `washa-ai-v4/${access.profile.id}`,
            file: decoded.buffer,
            originalFileName: `board-${randomUUID()}.webp`,
            contentType: decoded.contentType,
            profile: "board",
            createThumbnail: false,
            uploadOriginal: false,
            returnPublicUrl: true,
            metadata: {
                asset_kind: "washa-ai-v4-board",
                request_id: input.requestId,
                provider: providerImage.provider,
            },
        });

        if (!upload.publicUrl) {
            throw new Error("Board upload returned no public URL.");
        }

        return NextResponse.json({
            ok: true,
            imageUrl: upload.publicUrl,
            provider: providerImage.provider,
            model: providerImage.model,
            width: upload.width ?? 3200,
            height: upload.height ?? 4000,
            durationMs: Date.now() - startedAt,
        }, { headers: { "Cache-Control": "private, no-store" } });
    } catch (generationError) {
        if (!providerStarted) {
            await releaseRateLimit(rateLimitKey, RATE_LIMIT_WINDOW_MS);
        }
        if (isArtworkTextPolicyError(generationError)) {
            return error(
                "الناتج احتوى نصًا غير مختار داخل التصميم، لذلك لم يتم اعتماده. أعد التوليد.",
                502,
                "V4_ARTWORK_TEXT_POLICY_FAILED"
            );
        }
        if (isArtworkVerificationUnavailableError(generationError)) {
            return error(
                "تعذر التحقق من خلو التصميم من النصوص، لذلك لم يتم اعتماد الصورة. أعد المحاولة بعد لحظات.",
                503,
                "V4_TEXT_VERIFICATION_UNAVAILABLE"
            );
        }
        console.error("[washa-ai-v4.generate]", {
            message: sanitizeWashaDtfProviderMessage(generationError),
        });
        return error("تعذر إنشاء اللوحة الآن. أعد المحاولة بعد لحظات.", 502, "GENERATION_FAILED");
    }
}
