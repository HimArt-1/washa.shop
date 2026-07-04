import { NextRequest, NextResponse } from "next/server";
import { getPublicVisibility, type WashaAiDevAccessMode } from "@/app/actions/settings";
import { getCurrentUserOrDevAdmin, resolveAdminAccess } from "@/lib/admin-access";

type WashaAiDevSurface = "dev" | "dev-v2";

function getSurfaceAccessMode(
    visibility: Awaited<ReturnType<typeof getPublicVisibility>>,
    surface: WashaAiDevSurface
): WashaAiDevAccessMode {
    if (surface === "dev-v2") {
        return visibility.washa_ai_dev_v2_access ?? "admin";
    }

    return visibility.washa_ai_dev_access ?? "admin";
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
