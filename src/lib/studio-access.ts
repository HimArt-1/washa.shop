import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdminClient } from "@/lib/supabase";
import type { UserRole, WushshaLevel } from "@/types/database";

export const STUDIO_ROLES = ["admin", "wushsha"] as const;
export type StudioRole = (typeof STUDIO_ROLES)[number];

export type StudioAccessProfile = {
    id: string;
    clerk_id: string;
    display_name: string | null;
    username: string | null;
    role: UserRole;
    wushsha_level: WushshaLevel | null;
    is_verified: boolean | null;
};

export type StudioAccessDeniedReason = "not_signed_in" | "profile_not_found" | "forbidden" | "lookup_failed";

export type StudioAccessResult =
    | {
        ok: true;
        profile: StudioAccessProfile;
    }
    | {
        ok: false;
        reason: StudioAccessDeniedReason;
        error: string;
    };

export function isStudioRole(role: string | null | undefined): role is StudioRole {
    return STUDIO_ROLES.includes(role as StudioRole);
}

export async function resolveStudioAccess(): Promise<StudioAccessResult> {
    const { userId } = await auth();

    if (!userId) {
        return {
            ok: false,
            reason: "not_signed_in",
            error: "يجب تسجيل الدخول أولاً",
        };
    }

    try {
        const supabase = getSupabaseAdminClient();
        const { data: profile, error } = await supabase
            .from("profiles")
            .select("id, clerk_id, display_name, username, role, wushsha_level, is_verified")
            .eq("clerk_id", userId)
            .maybeSingle();

        if (error) {
            console.error("[studio-access] Failed to resolve profile:", error);
            return {
                ok: false,
                reason: "lookup_failed",
                error: "تعذر التحقق من صلاحيات الاستوديو حالياً",
            };
        }

        if (!profile) {
            return {
                ok: false,
                reason: "profile_not_found",
                error: "الملف الشخصي غير موجود",
            };
        }

        if (!isStudioRole(profile.role as string)) {
            return {
                ok: false,
                reason: "forbidden",
                error: "هذه العملية مخصصة للوشّاي المعتمد فقط",
            };
        }

        return {
            ok: true,
            profile: profile as StudioAccessProfile,
        };
    } catch (error) {
        console.error("[studio-access] Unexpected access failure:", error);
        return {
            ok: false,
            reason: "lookup_failed",
            error: "تعذر التحقق من صلاحيات الاستوديو حالياً",
        };
    }
}
