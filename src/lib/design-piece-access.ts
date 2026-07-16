import { auth } from "@clerk/nextjs/server";
import { unstable_rethrow } from "next/navigation";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { ensureProfileWithStatus } from "@/lib/ensure-profile";

// Leave empty to allow ALL authenticated users.
// Populate to restrict by role: ["admin", "wushsha", "subscriber"]
const ALLOWED_ROLES: string[] = [];
const AUTH_UNAVAILABLE_REASONS = new Set([
    "unexpected-error",
    "secret-key-invalid",
    "jwk-local-missing",
    "jwk-remote-failed-to-load",
    "jwk-remote-invalid",
    "jwk-remote-missing",
    "jwk-failed-to-resolve",
    "jwk-kid-mismatch",
]);

export type DesignPieceAccessReason =
    | "not_signed_in"
    | "auth_unavailable"
    | "guest_needs_approval"
    | "approved"
    | "public_access"
    | "supabase_error"
    | "identity_conflict";

export type DesignPieceDeniedVariant = "auth" | "service_unavailable" | "identity_conflict";

export type DesignPieceAccessResult = {
    allowed: boolean;
    profileId?: string;
    clerkId?: string;
    role?: string;
    reason?: DesignPieceAccessReason;
};

type ResolveDesignPieceAccessOptions = {
    allowPublicAccess?: boolean;
};

export function getDesignPieceDeniedVariant(reason: DesignPieceAccessReason | undefined): DesignPieceDeniedVariant {
    if (reason === "auth_unavailable" || reason === "supabase_error") {
        return "service_unavailable";
    }

    if (reason === "identity_conflict") {
        return "identity_conflict";
    }

    return "auth";
}

export function getDesignPieceAccessFailure(reason: DesignPieceAccessReason | undefined): {
    message: string;
    status: number;
} {
    if (reason === "not_signed_in") {
        return {
            message: "يجب تسجيل الدخول لاستخدام WASHA AI وحفظ التصميم في حسابك.",
            status: 401,
        };
    }

    if (reason === "auth_unavailable") {
        return {
            message: "تعذّر التحقق من جلسة الدخول مؤقتاً.",
            status: 503,
        };
    }

    if (reason === "supabase_error") {
        return {
            message: "خدمة التحقق غير متاحة مؤقتاً، يرجى المحاولة مجدداً.",
            status: 503,
        };
    }

    if (reason === "identity_conflict") {
        return {
            message: "تعذر ربط حسابك تلقائياً. يرجى التواصل مع الدعم.",
            status: 409,
        };
    }

    return {
        message: "غير مصرح لك باستخدام استوديو DTF",
        status: 403,
    };
}

export async function resolveDesignPieceAccess(
    options: ResolveDesignPieceAccessOptions = {}
): Promise<DesignPieceAccessResult> {
    const allowPublicAccess = options.allowPublicAccess === true;

    // Use auth() — reads JWT directly from request headers (no extra Clerk API network call).
    // This is the recommended pattern for Route Handlers in Clerk v6.
    let authState: Awaited<ReturnType<typeof auth>>;
    try {
        authState = await auth({ acceptsToken: "session_token" });
    } catch (error) {
        unstable_rethrow(error);
        console.error("[design-piece-access] Clerk session verification failed", {
            errorName: error instanceof Error ? error.name : "UnknownError",
        });
        return { allowed: false, reason: "auth_unavailable" };
    }

    const { userId } = authState;
    if (!userId) {
        const authReason = typeof authState.debug === "function"
            ? authState.debug()?.reason
            : null;
        if (typeof authReason === "string" && AUTH_UNAVAILABLE_REASONS.has(authReason)) {
            console.error("[design-piece-access] Clerk session verification unavailable", {
                reason: authReason,
            });
            return { allowed: false, reason: "auth_unavailable" };
        }

        if (allowPublicAccess) {
            return { allowed: true, reason: "public_access", role: "guest" };
        }
        return { allowed: false, reason: "not_signed_in" };
    }

    // Fast path: look up profile directly in Supabase by clerk_id.
    // Avoids the extra currentUser() network call to Clerk's API for existing users.
    try {
        const supabase = getSupabaseAdminClient();
        const { data: profile, error } = await supabase
            .from("profiles")
            .select("id, role")
            .eq("clerk_id", userId)
            .maybeSingle();

        if (error) {
            console.error("[design-piece-access] Supabase profile lookup failed:", error);
            return { allowed: false, reason: "supabase_error" };
        }

        if (profile) {
            if (ALLOWED_ROLES.length === 0 || ALLOWED_ROLES.includes(profile.role as string)) {
                return {
                    allowed: true,
                    reason: "approved",
                    profileId: profile.id,
                    clerkId: userId,
                    role: profile.role as string,
                };
            }

            if (allowPublicAccess) {
                return {
                    allowed: true,
                    reason: "public_access",
                    profileId: profile.id,
                    clerkId: userId,
                    role: profile.role as string,
                };
            }

            return { allowed: false, reason: "guest_needs_approval" };
        }
    } catch (err) {
        console.error("[design-piece-access] Supabase profile lookup failed:", err);
        return { allowed: false, reason: "supabase_error" };
    }

    // Slow path: profile not found — try to auto-create it for first-time users.
    // ensureProfile() uses currentUser() to fetch full user data needed for creation.
    const ensured = await ensureProfileWithStatus();
    if (ensured.status !== "ok") {
        if (allowPublicAccess) {
            return {
                allowed: true,
                reason: "public_access",
                clerkId: userId,
                role: "guest",
            };
        }
        if (ensured.status === "supabase_error") {
            return { allowed: false, reason: "supabase_error" };
        }
        if (ensured.status === "identity_conflict") {
            return { allowed: false, reason: "identity_conflict" };
        }
        return { allowed: false, reason: "guest_needs_approval" };
    }
    const created = ensured.profile;

    if (ALLOWED_ROLES.length === 0 || ALLOWED_ROLES.includes(created.role as string)) {
        return {
            allowed: true,
            reason: "approved",
            profileId: created.id,
            clerkId: userId,
            role: created.role as string,
        };
    }

    if (allowPublicAccess) {
        return {
            allowed: true,
            reason: "public_access",
            profileId: created.id,
            clerkId: userId,
            role: created.role as string,
        };
    }

    return { allowed: false, reason: "guest_needs_approval" };
}
