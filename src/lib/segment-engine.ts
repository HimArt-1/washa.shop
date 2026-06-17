// وشّى | WASHA — محرك تقسيم الجمهور (User Segmentation Engine)
// يصنّف العملاء إلى شرائح تسويقية بناءً على سلوكهم وإنفاقهم

import { createClient } from "@supabase/supabase-js";

export interface CustomerSegment {
    id: string;
    label: string;
    labelAr: string;
    description: string;
    count: number;
    userIds: string[];
    color: string;
    icon: string;
}

export interface SegmentSummary {
    segments: CustomerSegment[];
    totalProfilesAnalyzed: number;
    computedAt: string;
}

function getAdminSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    return createClient(url, key, { auth: { persistSession: false } });
}

export async function computeSegments(lookbackDays = 90): Promise<SegmentSummary> {
    const supabase = getAdminSupabase();
    const since = new Date(Date.now() - lookbackDays * 86_400_000).toISOString();

    // ─── Load raw data ─────────────────────────────────────────────────────────
    const [ordersRes, designOrdersRes, eventsRes, subscribersRes] = await Promise.all([
        supabase
            .from("orders")
            .select("user_id, total_amount, created_at, status")
            .gte("created_at", since)
            .not("user_id", "is", null),
        supabase
            .from("custom_design_orders")
            .select("user_id, created_at, status")
            .gte("created_at", since)
            .not("user_id", "is", null),
        supabase
            .from("behavioral_events")
            .select("user_id, event_type, created_at")
            .gte("created_at", since)
            .not("user_id", "is", null),
        supabase.from("newsletter_subscribers").select("email, user_id").not("user_id", "is", null),
    ]);

    const orders = ordersRes.data ?? [];
    const designOrders = designOrdersRes.data ?? [];
    const events = eventsRes.data ?? [];
    const subscribers = subscribersRes.data ?? [];

    // ─── Index by user ─────────────────────────────────────────────────────────
    const ordersByUser = new Map<string, typeof orders>();
    for (const o of orders) {
        if (!o.user_id) continue;
        if (!ordersByUser.has(o.user_id)) ordersByUser.set(o.user_id, []);
        ordersByUser.get(o.user_id)!.push(o);
    }

    const designByUser = new Map<string, number>();
    for (const d of designOrders) {
        if (!d.user_id) continue;
        designByUser.set(d.user_id, (designByUser.get(d.user_id) ?? 0) + 1);
    }

    const eventsByUser = new Map<string, string[]>();
    for (const e of events) {
        if (!e.user_id) continue;
        if (!eventsByUser.has(e.user_id)) eventsByUser.set(e.user_id, []);
        eventsByUser.get(e.user_id)!.push(e.event_type);
    }

    const subscriberIds = new Set(subscribers.map((s) => s.user_id).filter(Boolean));

    // ─── All unique user IDs across all signals ────────────────────────────────
    const allUserIds = new Set<string>([
        ...Array.from(ordersByUser.keys()),
        ...Array.from(designByUser.keys()),
        ...Array.from(eventsByUser.keys()),
        ...Array.from(subscriberIds),
    ]);

    // ─── Segment classifiers ──────────────────────────────────────────────────
    const vipIds: string[] = [];
    const atRiskIds: string[] = [];
    const oneTimeIds: string[] = [];
    const cartAbandonerIds: string[] = [];
    const designEnthusiastIds: string[] = [];
    const aiStudioIds: string[] = [];
    const emailSubscriberIds: string[] = [];
    const loyalIds: string[] = [];

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const sixtyDaysAgo = new Date(Date.now() - 60 * 86_400_000).toISOString();

    for (const uid of Array.from(allUserIds)) {
        const userOrders = ordersByUser.get(uid) ?? [];
        const completedOrders = userOrders.filter((o) => o.status === "completed" || o.status === "delivered");
        const totalSpend = completedOrders.reduce((s, o) => s + (Number(o.total_amount) || 0), 0);
        const orderCount = completedOrders.length;
        const lastOrderDate = completedOrders.length
            ? completedOrders.sort((a, b) => b.created_at.localeCompare(a.created_at))[0].created_at
            : null;

        const userEvents = eventsByUser.get(uid) ?? [];
        const hasAddToCart = userEvents.includes("add_to_cart");
        const hasCheckout = userEvents.includes("checkout_complete");
        const hasDesignOrder = (designByUser.get(uid) ?? 0) > 0;
        const hasAiGenerate = userEvents.includes("design_ai_generate");

        // VIP: ≥3 completed orders AND total spend ≥ 500 SAR
        if (orderCount >= 3 && totalSpend >= 500) vipIds.push(uid);

        // At-risk: had orders but last purchase > 60 days ago
        if (orderCount >= 1 && lastOrderDate && lastOrderDate < sixtyDaysAgo) atRiskIds.push(uid);

        // One-time buyers: exactly 1 completed order
        if (orderCount === 1) oneTimeIds.push(uid);

        // Cart abandoners: added to cart but no checkout_complete in last 30 days
        const recentCartEvents = events.filter(
            (e) => e.user_id === uid && e.event_type === "add_to_cart" && e.created_at >= thirtyDaysAgo
        );
        const recentCheckout = events.find(
            (e) => e.user_id === uid && e.event_type === "checkout_complete" && e.created_at >= thirtyDaysAgo
        );
        if (recentCartEvents.length > 0 && !recentCheckout) cartAbandonerIds.push(uid);

        // Design enthusiasts: submitted ≥1 custom design order
        if (hasDesignOrder) designEnthusiastIds.push(uid);

        // AI studio users: used AI design generation
        if (hasAiGenerate) aiStudioIds.push(uid);

        // Email subscribers
        if (subscriberIds.has(uid)) emailSubscriberIds.push(uid);

        // Loyal customers: ≥2 orders in last 30 days OR ≥5 total
        const recentOrders = completedOrders.filter((o) => o.created_at >= thirtyDaysAgo);
        if (recentOrders.length >= 2 || orderCount >= 5) loyalIds.push(uid);
    }

    const segments: CustomerSegment[] = [
        {
            id: "vip",
            label: "VIP Customers",
            labelAr: "عملاء VIP",
            description: "3+ orders · spend ≥ 500 SAR",
            count: vipIds.length,
            userIds: vipIds,
            color: "#D4AF37",
            icon: "Crown",
        },
        {
            id: "loyal",
            label: "Loyal Customers",
            labelAr: "العملاء المخلصون",
            description: "2+ recent orders or 5+ total",
            count: loyalIds.length,
            userIds: loyalIds,
            color: "#22c55e",
            icon: "Heart",
        },
        {
            id: "at_risk",
            label: "At-Risk",
            labelAr: "على وشك الإنسحاب",
            description: "Purchased before, silent 60+ days",
            count: atRiskIds.length,
            userIds: atRiskIds,
            color: "#ef4444",
            icon: "AlertTriangle",
        },
        {
            id: "one_time",
            label: "One-Time Buyers",
            labelAr: "مشترٍ مرة واحدة",
            description: "Exactly 1 completed purchase",
            count: oneTimeIds.length,
            userIds: oneTimeIds,
            color: "#8b5cf6",
            icon: "ShoppingBag",
        },
        {
            id: "cart_abandoner",
            label: "Cart Abandoners",
            labelAr: "تاركو السلة",
            description: "Added to cart, didn't checkout (30 days)",
            count: cartAbandonerIds.length,
            userIds: cartAbandonerIds,
            color: "#f97316",
            icon: "ShoppingCart",
        },
        {
            id: "design_enthusiast",
            label: "Design Enthusiasts",
            labelAr: "عشاق التصميم",
            description: "Submitted custom design orders",
            count: designEnthusiastIds.length,
            userIds: designEnthusiastIds,
            color: "#06b6d4",
            icon: "Paintbrush",
        },
        {
            id: "ai_studio",
            label: "AI Studio Users",
            labelAr: "مستخدمو استوديو AI",
            description: "Used AI design generation",
            count: aiStudioIds.length,
            userIds: aiStudioIds,
            color: "#a855f7",
            icon: "Sparkles",
        },
        {
            id: "email_subscriber",
            label: "Email Subscribers",
            labelAr: "المشتركون بالنشرة",
            description: "Subscribed to newsletter",
            count: emailSubscriberIds.length,
            userIds: emailSubscriberIds,
            color: "#3b82f6",
            icon: "Mail",
        },
    ];

    return {
        segments,
        totalProfilesAnalyzed: allUserIds.size,
        computedAt: new Date().toISOString(),
    };
}
