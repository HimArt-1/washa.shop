"use server";

import { createClient } from "@supabase/supabase-js";
import { getCurrentUserOrDevAdmin } from "@/lib/admin-access";

function getOpsClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    return createClient(url, key, { auth: { persistSession: false } });
}

async function requireAdmin() {
    const user = await getCurrentUserOrDevAdmin();
    if (!user) return null;
    const supabase = getOpsClient();
    if (!supabase) return null;
    const { data: profile } = await supabase.from("profiles").select("role").eq("clerk_id", user.id).single();
    if (!profile || profile.role !== "admin") return null;
    return { supabase, user };
}

export async function getPageVisits(limit = 100) {
    try {
        const admin = await requireAdmin();
        if (!admin) return [];
        const { data, error } = await admin.supabase
            .from("page_visits")
            .select("id, path, full_url, referrer, user_agent, user_id, created_at")
            .order("created_at", { ascending: false })
            .limit(limit);
        if (error) {
            console.error("[getPageVisits]", error.message);
            return [];
        }
        return data || [];
    } catch {
        return [];
    }
}

export async function getVisitStats() {
    try {
        const admin = await requireAdmin();
        if (!admin) return { total: 0, today: 0, uniquePaths: 0, topPaths: [] };
        const supabase = admin.supabase;
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const [totalRes, todayRes, pathsRes] = await Promise.all([
            supabase.from("page_visits").select("id", { count: "exact", head: true }),
            supabase.from("page_visits").select("id", { count: "exact", head: true }).gte("created_at", todayStart.toISOString()),
            supabase.from("page_visits").select("path"),
        ]);

        const total = totalRes.count ?? 0;
        const today = todayRes.count ?? 0;
        const paths = pathsRes.data || [];
        const pathCounts: Record<string, number> = {};
        paths.forEach((p: { path: string }) => {
            pathCounts[p.path] = (pathCounts[p.path] || 0) + 1;
        });
        const topPaths = Object.entries(pathCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([path, count]) => ({ path, count }));

        return { total, today, uniquePaths: Object.keys(pathCounts).length, topPaths };
    } catch {
        return { total: 0, today: 0, uniquePaths: 0, topPaths: [] };
    }
}

export async function getSystemLogs(limit = 50, type?: string) {
    try {
        const admin = await requireAdmin();
        if (!admin) return [];
        let query = admin.supabase
            .from("system_logs")
            .select("id, type, source, message, stack, metadata, created_at")
            .order("created_at", { ascending: false })
            .limit(limit);
        if (type) query = query.eq("type", type);
        const { data, error } = await query;
        if (error) {
            console.error("[getSystemLogs]", error.message);
            return [];
        }
        return data || [];
    } catch {
        return [];
    }
}

export async function getErrorStats() {
    try {
        const admin = await requireAdmin();
        if (!admin) return { total: 0, today: 0, byType: {} };
        const { supabase } = admin;
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const [totalRes, todayRes, allRes] = await Promise.all([
            supabase.from("system_logs").select("id", { count: "exact", head: true }).eq("type", "error"),
            supabase.from("system_logs").select("id", { count: "exact", head: true }).eq("type", "error").gte("created_at", todayStart.toISOString()),
            supabase.from("system_logs").select("type").limit(500),
        ]);

        const byType: Record<string, number> = {};
        (allRes.data || []).forEach((r: { type: string }) => {
            byType[r.type] = (byType[r.type] || 0) + 1;
        });

        return { total: totalRes.count ?? 0, today: todayRes.count ?? 0, byType };
    } catch {
        return { total: 0, today: 0, byType: {} };
    }
}

export async function getConnectionStatus() {
    const admin = await requireAdmin();
    if (!admin) return [];
    const checks: { name: string; status: "ok" | "fail" | "unknown"; message: string; latency?: number }[] = [];

    // Supabase
    try {
        const supabase = getOpsClient();
        if (!supabase) {
            checks.push({ name: "Supabase", status: "fail", message: "لم يتم تكوين Supabase" });
        } else {
            const start = Date.now();
            const { error } = await supabase.from("profiles").select("id").limit(1);
            const latency = Date.now() - start;
            checks.push({
                name: "Supabase",
                status: error ? "fail" : "ok",
                message: error ? error.message : "متصل",
                latency,
            });
        }
    } catch (e: any) {
        checks.push({ name: "Supabase", status: "fail", message: e?.message || "خطأ غير معروف" });
    }

    // Env vars
    const hasEnv = !!(
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    checks.push({
        name: "المتغيرات البيئية",
        status: hasEnv ? "ok" : "fail",
        message: hasEnv ? "مُكوّنة" : "ناقصة",
    });

    const hasClerk = !!(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
    checks.push({
        name: "Clerk",
        status: hasClerk ? "ok" : "unknown",
        message: hasClerk ? "مُكوّن" : "غير متحقق",
    });

    return checks;
}
