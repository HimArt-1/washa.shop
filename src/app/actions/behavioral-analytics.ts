// وشّى | WASHA — تحليلات الأحداث السلوكية وقمع التحويل
"use server";

import { createClient } from "@supabase/supabase-js";
import { getCurrentUserOrDevAdmin, resolveAdminAccess } from "@/lib/admin-access";
import { computeSegments, type SegmentSummary } from "@/lib/segment-engine";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = ReturnType<typeof createClient<any>>;

async function resolveAdminSB(): Promise<SB | null> {
    const user = await getCurrentUserOrDevAdmin();
    if (!user) return null;
    const access = await resolveAdminAccess(user);
    if (!access.isAdmin) return null;
    // Use untyped client so new tables (behavioral_events, page_visits) pass TS
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    return createClient(url, key, { auth: { persistSession: false } });
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FunnelStep {
    label: string;
    labelAr: string;
    eventType: string;
    count: number;
    dropOffPct: number;
}

export interface EventCount {
    eventType: string;
    count: number;
    uniqueUsers: number;
}

export interface TopPage {
    path: string;
    visits: number;
    uniqueSessions: number;
}

export interface EventsByDay {
    date: string;
    count: number;
}

export interface BehavioralSnapshot {
    purchaseFunnel: FunnelStep[];
    designFunnel: FunnelStep[];
    topEvents: EventCount[];
    topPages: TopPage[];
    eventsByDay: EventsByDay[];
    segments: SegmentSummary;
    period: number;
}

// ─── Helper ────────────────────────────────────────────────────────────────────

async function countEventType(sb: SB, eventType: string, since: string): Promise<number> {
    const { count } = await sb
        .from("behavioral_events")
        .select("id", { count: "exact", head: true })
        .eq("event_type", eventType)
        .gte("created_at", since);
    return count ?? 0;
}

async function countUniqueUsersForEvent(sb: SB, eventType: string, since: string): Promise<number> {
    const { data } = await sb
        .from("behavioral_events")
        .select("user_id")
        .eq("event_type", eventType)
        .gte("created_at", since)
        .not("user_id", "is", null);

    const unique = new Set((data ?? []).map((r) => r.user_id));
    return unique.size;
}

// ─── Main action ──────────────────────────────────────────────────────────────

export async function getBehavioralSnapshot(days = 30): Promise<BehavioralSnapshot | null> {
    const sb = await resolveAdminSB();
    if (!sb) return null;

    const since = new Date(Date.now() - days * 86_400_000).toISOString();

    // ─── Purchase funnel counts ──────────────────────────────────────────────
    const purchaseFunnelTypes = [
        { key: "product_view", labelAr: "مشاهدة منتج" },
        { key: "add_to_cart", labelAr: "إضافة للسلة" },
        { key: "checkout_start", labelAr: "بدء الدفع" },
        { key: "checkout_complete", labelAr: "إتمام الشراء" },
    ] as const;

    const designFunnelTypes = [
        { key: "design_order_start", labelAr: "بدء طلب تصميم" },
        { key: "design_ai_generate", labelAr: "توليد AI" },
        { key: "design_order_submit", labelAr: "تأكيد الطلب" },
    ] as const;

    const allEventTypes = [
        "product_view",
        "add_to_cart",
        "cart_view",
        "cart_abandon",
        "checkout_start",
        "checkout_complete",
        "search_query",
        "gallery_view",
        "artwork_view",
        "design_order_start",
        "design_order_submit",
        "design_ai_generate",
        "coupon_apply",
        "newsletter_subscribe",
    ];

    // Fetch all in parallel
    const [
        purchaseCounts,
        designCounts,
        allCounts,
        allUnique,
        topPagesRes,
        eventsByDayRes,
        segmentsResult,
    ] = await Promise.all([
        Promise.all(purchaseFunnelTypes.map((t) => countEventType(sb, t.key, since))),
        Promise.all(designFunnelTypes.map((t) => countEventType(sb, t.key, since))),
        Promise.all(allEventTypes.map((t) => countEventType(sb, t, since))),
        Promise.all(allEventTypes.map((t) => countUniqueUsersForEvent(sb, t, since))),
        sb
            .from("page_visits")
            .select("path, session_id")
            .gte("created_at", since),
        sb
            .from("behavioral_events")
            .select("event_type, created_at")
            .gte("created_at", since)
            .order("created_at", { ascending: true }),
        computeSegments(days),
    ]);

    // ─── Build purchase funnel ───────────────────────────────────────────────
    const purchaseFunnel: FunnelStep[] = purchaseFunnelTypes.map((t, i) => {
        const count = purchaseCounts[i];
        const prev = i === 0 ? count : purchaseCounts[i - 1];
        const dropOffPct = prev === 0 ? 0 : Math.round(((prev - count) / prev) * 100);
        return {
            label: t.key.replace(/_/g, " "),
            labelAr: t.labelAr,
            eventType: t.key,
            count,
            dropOffPct,
        };
    });

    // ─── Build design funnel ─────────────────────────────────────────────────
    const designFunnel: FunnelStep[] = designFunnelTypes.map((t, i) => {
        const count = designCounts[i];
        const prev = i === 0 ? count : designCounts[i - 1];
        const dropOffPct = prev === 0 ? 0 : Math.round(((prev - count) / prev) * 100);
        return {
            label: t.key.replace(/_/g, " "),
            labelAr: t.labelAr,
            eventType: t.key,
            count,
            dropOffPct,
        };
    });

    // ─── Top events ──────────────────────────────────────────────────────────
    const topEvents: EventCount[] = allEventTypes
        .map((t, i) => ({
            eventType: t,
            count: allCounts[i],
            uniqueUsers: allUnique[i],
        }))
        .filter((e) => e.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    // ─── Top pages ──────────────────────────────────────────────────────────
    const pageVisits = topPagesRes.data ?? [];
    const pageMap = new Map<string, { visits: number; sessions: Set<string> }>();
    for (const pv of pageVisits) {
        if (!pv.path) continue;
        if (!pageMap.has(pv.path)) pageMap.set(pv.path, { visits: 0, sessions: new Set() });
        const entry = pageMap.get(pv.path)!;
        entry.visits += 1;
        if (pv.session_id) entry.sessions.add(pv.session_id);
    }
    const topPages: TopPage[] = Array.from(pageMap.entries())
        .map(([path, val]) => ({
            path,
            visits: val.visits,
            uniqueSessions: val.sessions.size,
        }))
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 20);

    // ─── Events by day ───────────────────────────────────────────────────────
    const dayMap = new Map<string, number>();
    for (const ev of eventsByDayRes.data ?? []) {
        const day = ev.created_at.slice(0, 10);
        dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
    }
    const eventsByDay: EventsByDay[] = Array.from(dayMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

    return {
        purchaseFunnel,
        designFunnel,
        topEvents,
        topPages,
        eventsByDay,
        segments: segmentsResult,
        period: days,
    };
}
