"use server";

// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — إجراءات إدارة رصيد WASHA AI (أدمن فقط)
//  منح/خصم يدوي + عرض المحفظة وسجل الحركات لمستخدم.
// ═══════════════════════════════════════════════════════════

import { getSupabaseAdminClient } from "@/lib/supabase";
import { getCurrentUserOrDevAdmin } from "@/lib/admin-access";
import type { WashaAiCreditLedgerEntry } from "@/types/database";

async function requireCreditAdmin() {
    const user = await getCurrentUserOrDevAdmin();
    if (!user) throw new Error("Unauthorized");
    const sb = getSupabaseAdminClient();
    const { data: profile } = await sb
        .from("profiles")
        .select("id, role")
        .eq("clerk_id", user.id)
        .single();
    if (profile?.role !== "admin" && profile?.role !== "dev") {
        throw new Error("Forbidden");
    }
    return { adminProfileId: profile.id as string };
}

type ResolvedUser = {
    id: string;
    display_name: string | null;
    username: string | null;
    email: string | null;
    role: string | null;
};

/** يحل المستخدم عبر معرّف profile أو اسم مستخدم أو بريد. */
async function resolveTargetProfile(identifier: string): Promise<ResolvedUser | null> {
    const sb = getSupabaseAdminClient();
    const value = identifier.trim();
    if (!value) return null;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
    const column = isUuid ? "id" : value.includes("@") ? "email" : "username";

    const { data } = await sb
        .from("profiles")
        .select("id, display_name, username, email, role")
        .eq(column, value)
        .maybeSingle();

    return (data as ResolvedUser | null) ?? null;
}

export type CreditOverview = {
    user: ResolvedUser;
    balance: number;
    lifetimePurchased: number;
    lifetimeConsumed: number;
    ledger: WashaAiCreditLedgerEntry[];
};

export async function getWashaCreditOverview(identifier: string): Promise<
    { ok: true; data: CreditOverview } | { ok: false; error: string }
> {
    await requireCreditAdmin();
    const sb = getSupabaseAdminClient();

    const user = await resolveTargetProfile(identifier);
    if (!user) return { ok: false, error: "لم يُعثر على المستخدم" };

    const [walletResult, ledgerResult] = await Promise.all([
        sb
            .from("washa_ai_credit_wallet")
            .select("balance, lifetime_purchased, lifetime_consumed")
            .eq("profile_id", user.id)
            .maybeSingle(),
        sb
            .from("washa_ai_credit_ledger")
            .select("*")
            .eq("profile_id", user.id)
            .order("created_at", { ascending: false })
            .limit(20),
    ]);

    return {
        ok: true,
        data: {
            user,
            balance: walletResult.data?.balance ?? 0,
            lifetimePurchased: walletResult.data?.lifetime_purchased ?? 0,
            lifetimeConsumed: walletResult.data?.lifetime_consumed ?? 0,
            ledger: (ledgerResult.data as WashaAiCreditLedgerEntry[] | null) ?? [],
        },
    };
}

export async function adminAdjustWashaCredits(params: {
    identifier: string;
    delta: number;
    reason?: string;
}): Promise<{ ok: true; balance: number; delta: number } | { ok: false; error: string }> {
    const { adminProfileId } = await requireCreditAdmin();
    const sb = getSupabaseAdminClient();

    const delta = Math.round(Number(params.delta));
    if (!Number.isFinite(delta) || delta === 0) {
        return { ok: false, error: "أدخل مقداراً غير صفري" };
    }

    const user = await resolveTargetProfile(params.identifier);
    if (!user) return { ok: false, error: "لم يُعثر على المستخدم" };

    const { data, error } = await sb.rpc("admin_adjust_washa_ai_wallet", {
        p_profile_id: user.id,
        p_delta: delta,
        p_reason: params.reason?.trim() || null,
        p_created_by: adminProfileId,
    });

    if (error) {
        return { ok: false, error: "تعذّر تنفيذ التعديل" };
    }

    const payload = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
    if (payload.adjusted !== true) {
        const reason = typeof payload.error === "string" ? payload.error : "تعذّر التعديل";
        return { ok: false, error: reason === "wallet_not_found" ? "لا محفظة للمستخدم بعد" : reason === "nothing_to_deduct" ? "لا رصيد للخصم" : reason };
    }

    return {
        ok: true,
        balance: typeof payload.balance === "number" ? payload.balance : 0,
        delta: typeof payload.delta === "number" ? payload.delta : delta,
    };
}
