import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";

/**
 * ═══════════════════════════════════════════════════════════
 *  وشّى | WASHA — Torod Webhook Handler
 *  Receives status updates from Torod and syncs with Supabase
 * ═══════════════════════════════════════════════════════════
 */

export async function POST(req: Request) {
    try {
        const payload = await req.json();
        const headerHmac = req.headers.get("X-Hmac-Sha256");

        console.log("[Torod Webhook Received]:", JSON.stringify(payload, null, 2));

        const { order_id, tracking_id, status } = payload;

        if (!order_id && !tracking_id) {
            return NextResponse.json({ error: "Missing order identifiers" }, { status: 400 });
        }

        const supabase = getSupabaseAdminClient();

        // Map Torod status to Wusha Status
        let wushaStatus: string | null = null;
        
        switch (status?.toLowerCase()) {
            case "shipped":
            case "in transit":
            case "ready for pickup":
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
                wushaStatus = "shipping_failed";
                break;
            default:
                wushaStatus = null; // No change if status unknown
        }

        // 1. Find the order by reference_id (Wusha Order ID) or tracking_id
        const { data: order, error: fetchError } = await supabase
            .from("orders")
            .select("id, status")
            .or(`id.eq.${order_id},tracking_number.eq.${tracking_id}`)
            .single();

        if (fetchError || !order) {
            console.warn("[Torod Webhook] Order not found for:", { order_id, tracking_id });
            return NextResponse.json({ message: "Order not found" }, { status: 404 });
        }

        // 2. Perform Update
        const updateData: any = {
            torod_last_status: status,
            updated_at: new Date().toISOString()
        };

        if (wushaStatus) {
            updateData.status = wushaStatus;
        }

        const { error: updateError } = await supabase
            .from("orders")
            .update(updateData)
            .eq("id", order.id);

        if (updateError) {
            throw updateError;
        }

        console.log(`[Torod Webhook Success] Updated Order #${order.id} to status: ${status}`);

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("[Torod Webhook Error]:", error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
