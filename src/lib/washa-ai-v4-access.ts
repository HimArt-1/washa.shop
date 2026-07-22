import { NextResponse } from "next/server";
import { getPublicVisibility, type WashaAiDevAccessMode } from "@/app/actions/settings";
import { getCurrentUserOrDevAdmin, resolveAdminAccess } from "@/lib/admin-access";

export async function canUseWashaAiV4(hasPlatformAdminAccess: boolean) {
    const visibility = await getPublicVisibility();
    const accessMode: WashaAiDevAccessMode = visibility.washa_ai_dev_v4_access ?? "admin";
    if (accessMode === "link") return true;
    if (accessMode === "disabled") return false;
    return hasPlatformAdminAccess;
}

export async function ensureWashaAiV4PageAccess() {
    const visibility = await getPublicVisibility();
    const accessMode: WashaAiDevAccessMode = visibility.washa_ai_dev_v4_access ?? "admin";

    if (accessMode === "disabled") {
        return new NextResponse("Not Found", { status: 404 });
    }
    if (accessMode === "link") return null;

    const user = await getCurrentUserOrDevAdmin();
    if (!user) return new NextResponse("Not Found", { status: 404 });

    try {
        const access = await resolveAdminAccess(user);
        return access.isAdmin
            ? null
            : new NextResponse("Not Found", { status: 404 });
    } catch {
        return new NextResponse("Not Found", { status: 404 });
    }
}
