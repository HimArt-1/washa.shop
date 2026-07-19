import { NextResponse } from "next/server";
import { getWashaDtfStudioConfig } from "@/lib/washa-dtf-config";
import { requireDtfRouteAccess } from "../utils/route-runtime";
import { getWashaDtfGenerationReadiness } from "@/lib/washa-dtf-generation-readiness";
import { getIsolatedArtworkProviderReadiness } from "@/lib/washa-artwork/provider";

export const runtime = "nodejs";

export async function GET() {
    const accessResult = await requireDtfRouteAccess({ allowPublicGeneration: true });
    if (accessResult.response) {
        return accessResult.response;
    }

    try {
        const config = await getWashaDtfStudioConfig();
        const baseGeneration = getWashaDtfGenerationReadiness();
        const artworkProvider = getIsolatedArtworkProviderReadiness();
        const features = {
            structuredUserActionsEnabled:
                process.env.WASHA_STRUCTURED_USER_ACTIONS_ENABLED === "true",
            autoRetryQuotaSafeEnabled:
                process.env.WASHA_ENABLE_AUTO_RETRY_QUOTA_SAFE === "true",
        };
        const generation = baseGeneration.enabled && !artworkProvider.ready
            ? {
                ...baseGeneration,
                enabled: false,
                code: "provider_not_configured" as const,
                message: artworkProvider.message,
                provider: artworkProvider.provider,
                model: artworkProvider.model,
                fallbackEnabled: artworkProvider.fallbackEnabled,
            }
            : baseGeneration.enabled && artworkProvider.ready
                ? {
                    ...baseGeneration,
                    provider: artworkProvider.provider,
                    model: artworkProvider.model,
                    fallbackEnabled: artworkProvider.fallbackEnabled,
                }
                : baseGeneration;
        return NextResponse.json({ ...config, generation, features }, {
            headers: {
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        console.error("[washa-dtf-studio.config]", error);
        return NextResponse.json(
            { error: "تعذر تحميل إعدادات استوديو DTF" },
            { status: 500 }
        );
    }
}
