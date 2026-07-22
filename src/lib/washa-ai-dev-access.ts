import { NextRequest, NextResponse } from "next/server";
import { getPublicVisibility, type WashaAiDevAccessMode } from "@/app/actions/settings";
import { getCurrentUserOrDevAdmin, resolveAdminAccess } from "@/lib/admin-access";

export type WashaAiDevSurface = "dev" | "dev-v2";

const DEV_SURFACE_PATHS: Record<WashaAiDevSurface, string> = {
    dev: "/design/washa-ai/dev",
    "dev-v2": "/design/washa-ai/dev-v2",
};

function pathnameBelongsToSurface(pathname: string, surface: WashaAiDevSurface) {
    const surfacePath = DEV_SURFACE_PATHS[surface];
    return pathname === surfacePath || pathname.startsWith(`${surfacePath}/`);
}

/**
 * Same-origin browser requests carry the page URL in Referer. Keep this
 * server-derived so the public studio cannot opt itself out of the active
 * generation mode by adding a client-controlled flag.
 */
export function resolveWashaAiDevGenerationSurface(
    request: Pick<Request, "headers" | "url">
): WashaAiDevSurface | null {
    const referer = request.headers.get("referer");
    if (!referer) return null;

    try {
        const requestUrl = new URL(request.url);
        const refererUrl = new URL(referer);
        if (refererUrl.origin !== requestUrl.origin) return null;

        // dev-v2 must be checked first because its path starts with /dev.
        if (pathnameBelongsToSurface(refererUrl.pathname, "dev-v2")) return "dev-v2";
        if (pathnameBelongsToSurface(refererUrl.pathname, "dev")) return "dev";
    } catch {
        return null;
    }

    return null;
}

function getSurfaceAccessMode(
    visibility: Awaited<ReturnType<typeof getPublicVisibility>>,
    surface: WashaAiDevSurface
): WashaAiDevAccessMode {
    if (surface === "dev-v2") {
        return visibility.washa_ai_dev_v2_access ?? "admin";
    }

    return visibility.washa_ai_dev_access ?? "admin";
}

export async function canUseWashaAiDevSurfaceForGeneration(
    surface: WashaAiDevSurface,
    role: string | null | undefined
) {
    const visibility = await getPublicVisibility();
    if (!visibility.design_piece || visibility.design_piece_dtf_studio_switch === false) {
        return false;
    }

    const mode = getSurfaceAccessMode(visibility, surface);
    if (mode === "disabled") return false;
    if (mode === "link") return true;
    return role === "admin" || role === "dev";
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

    if (!visibility.design_piece || visibility.design_piece_dtf_studio_switch === false) {
        return NextResponse.redirect(new URL("/design", request.url));
    }

    const mode = getSurfaceAccessMode(visibility, surface);

    if (mode === "disabled") {
        return new NextResponse("Not Found", { status: 404 });
    }

    if (mode === "admin") {
        const canAccess = await canAccessAdminOnlyDevSurface();
        if (!canAccess) {
            return new NextResponse("Not Found", { status: 404 });
        }
    }

    return null;
}
