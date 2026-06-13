import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { torod } from "@/lib/shipping/torod";
import { emitShippingEventAlert } from "@/lib/operational-event-alerts";

/**
 * ═══════════════════════════════════════════════════════════
 *  وشّى | WASHA — Torod Webhook Handler
 *  Receives status updates from Torod and syncs with Supabase
 * ═══════════════════════════════════════════════════════════
 */

// Torod (and similar platforms) may probe the URL with GET, HEAD, POST (empty), or non-JSON POST.
// All must return 2xx for “webhook valid” checks in the dashboard.

export async function GET() {
    return NextResponse.json({ status: "ok", message: "Wusha Torod Endpoint Active" });
}

/** Some providers validate with HEAD only — return 200 with no body. */
export async function HEAD() {
    return new NextResponse(null, { status: 200 });
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            Allow: "GET, HEAD, POST, OPTIONS",
        },
    });
}

type OrderLookupTarget = {
    column: "id" | "torod_order_id" | "tracking_number";
    value: string;
};

function payloadString(payload: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
        const value = payload[key];
        if (typeof value === "string" && value.trim()) return value.trim();
        if (typeof value === "number" && Number.isFinite(value)) return String(value);
    }
    return undefined;
}

function buildOrderLookupTargets(params: {
    orderId?: string;
    torodOrderId?: string;
    trackingId?: string;
}) {
    const targets: OrderLookupTarget[] = [];
    const seen = new Set<string>();

    function add(column: OrderLookupTarget["column"], value?: string) {
        if (!value) return;
        const key = `${column}:${value}`;
        if (seen.has(key)) return;
        seen.add(key);
        targets.push({ column, value });
    }

    add("id", params.orderId);
    add("torod_order_id", params.orderId);
    add("torod_order_id", params.torodOrderId);
    add("tracking_number", params.trackingId);

    return targets;
}

async function findOrderByTorodIdentifiers(
    supabase: any,
    targets: OrderLookupTarget[]
) {
    let fetchError: { message?: string } | null = null;

    for (const target of targets) {
        const { data, error } = await supabase
            .from("orders")
            .select("id, order_number, status, tracking_number, torod_order_id, metadata")
            .eq(target.column, target.value)
            .single();

        if (data && !error) {
            return { order: data, fetchError: null };
        }

        if (error) fetchError = error;
    }

    return { order: null, fetchError };
}

export async function POST(req: Request) {
    try {
        const rawBody = await req.text();

        // Ping / empty body (common for “test webhook URL”)
        if (!rawBody.trim()) {
            return NextResponse.json({ success: true, message: "Ping received" });
        }

        let payload: Record<string, unknown>;
        try {
            payload = JSON.parse(rawBody) as Record<string, unknown>;
        } catch {
            console.warn("[Torod Webhook] Non-JSON body (treating as URL validation)");
            return NextResponse.json({ success: true, message: "Acknowledged" });
        }

        const authorization = req.headers.get("Authorization");
        const headerHmac = req.headers.get("X-Hmac-Sha256");

        console.log("[Torod Webhook Received]:", JSON.stringify(payload, null, 2));

        // 1. Security Check. Official Torod docs send the Client Secret Key in Authorization.
        if ((authorization || headerHmac) && !torod.validateWebhookRequest(rawBody, { authorization, hmac: headerHmac })) {
            console.error("[Torod Webhook Security] Invalid webhook verification header");
            return NextResponse.json({ error: "Invalid webhook verification" }, { status: 401 });
        }

        const order_id = payloadString(payload, ["order_id", "orderId"]);
        const torod_order_id = payloadString(payload, ["torod_order_id", "torodOrderId"]);
        const tracking_id = payloadString(payload, ["tracking_id", "tracking_number", "trackingId", "trackingNumber"]);
        const status = payloadString(payload, ["status", "order_status", "shipment_status"]);
        const lookupTargets = buildOrderLookupTargets({ orderId: order_id, torodOrderId: torod_order_id, trackingId: tracking_id });

        // Validation/Ping check (if specific identifiers missing but body exists)
        if (lookupTargets.length === 0) {
            return NextResponse.json({ success: true, message: "Validation payload received" });
        }

        const supabase = getSupabaseAdminClient();

        // 2. Map Torod status to Wusha Status
        let wushaStatus: string | null = null;
        const normalizedStatus = status ? status.toLowerCase() : "unknown";
        
        switch (normalizedStatus) {
            case "pending":
                wushaStatus = "processing";
                break;
            case "created":
            case "shipped":
            case "in transit":
            case "ready for pickup":
            case "picked up":
                wushaStatus = "shipped";
                break;
            case "delivered":
                wushaStatus = "delivered";
                break;
            case "cancelled":
                wushaStatus = "cancelled";
                break;
            case "failed":
            case "rto":
            case "damage":
            case "lost":
                // Keep the internal order status within the app's allowed status set.
                // The exact Torod failure/RTO value is preserved in torod_last_status and history.
                wushaStatus = "processing";
                break;
            default:
                wushaStatus = null; // No change if status unknown or intermediate
        }

        // 3. Find the order. Torod's order_id is usually our stored torod_order_id,
        // while older/internal tests may still send the Supabase orders.id value.
        const { order, fetchError } = await findOrderByTorodIdentifiers(supabase, lookupTargets);

        if (fetchError || !order) {
            // Torod’s “validate webhook URL” often POSTs sample payloads; those IDs won’t exist → must still be 2xx.
            console.warn("[Torod Webhook] Order not found (ack 200):", {
                order_id,
                tracking_id,
                fetchError: fetchError?.message,
            });
            return NextResponse.json({
                success: true,
                acknowledged: true,
                message: "No matching order; event ignored",
            });
        }

        if (!authorization && !headerHmac && torod.requiresWebhookSignature()) {
            console.error("[Torod Webhook Security] Missing webhook verification for matched order");
            return NextResponse.json({ error: "Missing webhook verification" }, { status: 401 });
        }

        // 4. Update metadata with history
        const currentMetadata = (order.metadata as any) || {};
        const history = Array.isArray(currentMetadata.shipping_history)
            ? currentMetadata.shipping_history
            : [];
        
        const newHistoryEntry = {
            status: normalizedStatus,
            timestamp: payloadString(payload, ["date_time", "dateTime"]) || new Date().toISOString(),
            raw_payload: payload
        };

        const updateData: any = {
            torod_last_status: status,
            metadata: {
                ...currentMetadata,
                shipping_history: [...history, newHistoryEntry]
            },
            updated_at: new Date().toISOString()
        };

        if (wushaStatus && wushaStatus !== order.status) {
            updateData.status = wushaStatus;
        }

        const { error: updateError } = await (supabase as any)
            .from("orders")
            .update(updateData)
            .eq("id", order.id);

        if (updateError) {
            throw updateError;
        }

        console.log(`[Torod Webhook Success] Updated Order #${order.id} status to: ${normalizedStatus}`);

        if (status) {
            const isException = ["failed", "rto", "damage", "lost", "cancelled"].includes(normalizedStatus);
            await emitShippingEventAlert({
                orderId: order.id,
                orderNumber: order.order_number,
                status,
                trackingNumber: tracking_id || order.tracking_number,
                torodOrderId: torod_order_id || order.torod_order_id,
                severity: isException ? "warning" : "info",
                source: "shipping.webhook.torod",
                message: isException
                    ? `ورد تحديث شحن استثنائي للطلب #${order.order_number}: ${status}. يحتاج مراجعة من فريق الشحن.`
                    : `ورد تحديث شحنة للطلب #${order.order_number}: ${status}.`,
                metadata: {
                    provider: "torod",
                    wusha_status: wushaStatus,
                    raw_status: status,
                },
            });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("[Torod Webhook Error]:", error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
