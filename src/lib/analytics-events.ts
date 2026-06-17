// وشّى | WASHA — أنواع الأحداث السلوكية + دالة التسجيل من السيرفر

export type BehavioralEventType =
    | "product_view"
    | "add_to_cart"
    | "cart_view"
    | "cart_abandon"
    | "checkout_start"
    | "checkout_complete"
    | "search_query"
    | "gallery_view"
    | "artwork_view"
    | "design_order_start"
    | "design_order_submit"
    | "design_ai_generate"
    | "coupon_apply"
    | "newsletter_subscribe";

export interface BehavioralEventPayload {
    eventType: BehavioralEventType;
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
    pagePath?: string;
    sessionId?: string;
    userId?: string;
}

export async function recordBehavioralEvent(payload: BehavioralEventPayload): Promise<void> {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return;

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(url, key, { auth: { persistSession: false } });

    await supabase.from("behavioral_events").insert({
        event_type: payload.eventType,
        entity_type: payload.entityType ?? null,
        entity_id: payload.entityId ?? null,
        metadata: payload.metadata ?? {},
        page_path: payload.pagePath ?? null,
        session_id: payload.sessionId ?? null,
        user_id: payload.userId ?? null,
    });
}
