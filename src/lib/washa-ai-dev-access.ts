import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getPublicVisibility, type WashaAiDevAccessMode } from "@/app/actions/settings";
import { getCurrentUserOrDevAdmin, resolveAdminAccess } from "@/lib/admin-access";

export type WashaAiDevSurface = "dev" | "dev-v2" | "dev-v3";

const DEV_SURFACE_PATHS: Record<WashaAiDevSurface, string> = {
    dev: "/design/washa-ai/dev",
    "dev-v2": "/design/washa-ai/dev-v2",
    "dev-v3": "/design/washa-ai/dev-v3",
};

export const WASHA_AI_DEV_SURFACE_HEADER = "x-washa-ai-dev-surface";
export const WASHA_AI_DEV_SIGNATURE_HEADER = "x-washa-ai-dev-signature";
export const WASHA_AI_DEV_SURFACE_META_NAME = "washa-ai-dev-surface";
export const WASHA_AI_DEV_SIGNATURE_META_NAME = "washa-ai-dev-signature";

function getDevSurfaceSigningSecret() {
    return process.env.WASHA_AI_DEV_SURFACE_SECRET?.trim()
        || process.env.CLERK_SECRET_KEY?.trim()
        || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
        || null;
}

function isWashaAiDevSurface(value: string | null): value is WashaAiDevSurface {
    return Boolean(value && Object.prototype.hasOwnProperty.call(DEV_SURFACE_PATHS, value));
}

function signWashaAiDevSurface(surface: WashaAiDevSurface) {
    const secret = getDevSurfaceSigningSecret();
    if (!secret) {
        throw new Error("WASHA AI dev surface signing secret is not configured.");
    }

    return createHmac("sha256", secret)
        .update(`washa-ai-dev-generation:v1:${surface}`)
        .digest("hex");
}

export function createWashaAiDevGenerationHeaders(surface: WashaAiDevSurface) {
    return {
        [WASHA_AI_DEV_SURFACE_HEADER]: surface,
        [WASHA_AI_DEV_SIGNATURE_HEADER]: signWashaAiDevSurface(surface),
    };
}

export function createWashaAiDevGenerationMetaTags(surface: WashaAiDevSurface) {
    const headers = createWashaAiDevGenerationHeaders(surface);
    return [
        `<meta name="${WASHA_AI_DEV_SURFACE_META_NAME}" content="${headers[WASHA_AI_DEV_SURFACE_HEADER]}" />`,
        `<meta name="${WASHA_AI_DEV_SIGNATURE_META_NAME}" content="${headers[WASHA_AI_DEV_SIGNATURE_HEADER]}" />`,
    ];
}

export function resolveWashaAiDevGenerationSurface(
    request: Pick<Request, "headers">
): WashaAiDevSurface | null {
    const surface = request.headers.get(WASHA_AI_DEV_SURFACE_HEADER);
    const suppliedSignature = request.headers.get(WASHA_AI_DEV_SIGNATURE_HEADER);
    if (!isWashaAiDevSurface(surface) || !suppliedSignature) return null;

    try {
        const expectedSignature = signWashaAiDevSurface(surface);
        const suppliedBuffer = Buffer.from(suppliedSignature, "utf8");
        const expectedBuffer = Buffer.from(expectedSignature, "utf8");
        if (
            suppliedBuffer.length === expectedBuffer.length
            && timingSafeEqual(suppliedBuffer, expectedBuffer)
        ) {
            return surface;
        }
    } catch {
        return null;
    }

    return null;
}

function getSurfaceAccessMode(
    visibility: Awaited<ReturnType<typeof getPublicVisibility>>,
    surface: WashaAiDevSurface
): WashaAiDevAccessMode {
    if (surface === "dev-v2" || surface === "dev-v3") {
        return visibility.washa_ai_dev_v2_access ?? "admin";
    }

    return visibility.washa_ai_dev_access ?? "admin";
}

type WashaAiDevSurfaceAccessDecision =
    | "hidden"
    | "disabled"
    | "link"
    | "admin";

function getSurfaceAccessDecision(
    visibility: Awaited<ReturnType<typeof getPublicVisibility>>,
    surface: WashaAiDevSurface
): WashaAiDevSurfaceAccessDecision {
    if (!visibility.design_piece || visibility.design_piece_dtf_studio_switch === false) {
        return "hidden";
    }

    return getSurfaceAccessMode(visibility, surface);
}

export async function canUseWashaAiDevSurfaceForGeneration(
    surface: WashaAiDevSurface,
    hasPlatformAdminAccess: boolean
) {
    const visibility = await getPublicVisibility();
    const decision = getSurfaceAccessDecision(visibility, surface);
    if (decision === "link") return true;
    if (decision !== "admin") return false;
    return hasPlatformAdminAccess;
}

async function canAccessAdminOnlyDevSurface() {
    const user = await getCurrentUserOrDevAdmin();
    if (!user) return false;

    try {
        const access = await resolveAdminAccess(user);
        return access.isAdmin === true;
    } catch {
        return false;
    }
}

export async function ensureWashaAiDevSurfaceAccess(request: NextRequest, surface: WashaAiDevSurface) {
    const visibility = await getPublicVisibility();
    const decision = getSurfaceAccessDecision(visibility, surface);

    if (decision === "hidden") {
        return NextResponse.redirect(new URL("/design", request.url));
    }

    if (decision === "disabled") {
        return new NextResponse("Not Found", { status: 404 });
    }

    if (decision === "admin") {
        const canAccess = await canAccessAdminOnlyDevSurface();
        if (!canAccess) {
            return new NextResponse("Not Found", { status: 404 });
        }
    }

    return null;
}
