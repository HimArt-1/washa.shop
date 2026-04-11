import { createHmac, timingSafeEqual } from "crypto";

/**
 * ═══════════════════════════════════════════════════════════
 *  وشّى | WASHA — Torod Shipping Integration
 *  https://torod.co/
 * ═══════════════════════════════════════════════════════════
 */

export interface TorodShipmentRequest {
    order_number: string;
    receiver_name: string;
    receiver_mobile: string;
    receiver_email?: string;
    address: string;
    city: string;
    weight: number; // in KG
    cod_amount?: number; // 0 if prepaid
    items_count: number;
}

export interface TorodShipmentResponse {
    success: boolean;
    tracking_number?: string;
    courier_name?: string;
    waybill_url?: string;
    torod_order_id?: string;
    error?: string;
    is_simulation?: boolean;
}

class TorodClient {
    private clientId = process.env.TOROD_CLIENT_ID;
    private clientSecret = process.env.TOROD_CLIENT_SECRET;
    private webhookSecret = process.env.TOROD_WEBHOOK_SECRET;
    private apiUrl = process.env.TOROD_API_URL || "https://api.torod.co";

    private isConfigured() {
        return !!(this.clientId && this.clientSecret);
    }

    /**
     * يحاكي عملية الحجز في حال عدم توفر مفاتيح الربط
     */
    private async simulateBooking(request: TorodShipmentRequest): Promise<TorodShipmentResponse> {
        console.log("[Torod Simulation] Booking order:", request.order_number);
        
        // محاكاة تأخير الشبكة
        await new Promise(r => setTimeout(r, 1500));

        const randomTrack = Math.floor(1000000000 + Math.random() * 9000000000).toString();
        
        return {
            success: true,
            tracking_number: `TRD-${randomTrack}`,
            courier_name: "Torod Express (Simulated)",
            waybill_url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
            torod_order_id: `TOR-${Date.now()}`,
            is_simulation: true
        };
    }

    private async getAccessToken(): Promise<string> {
        if (!this.clientId || !this.clientSecret) {
            throw new Error("Torod credentials missing");
        }

        const formData = new FormData();
        formData.append("client_id", this.clientId);
        formData.append("client_secret", this.clientSecret);

        const res = await fetch(`${this.apiUrl}/ar/api/token`, {
            method: "POST",
            body: formData,
            headers: { "Accept": "application/json" }
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.message || "Failed to authenticate with Torod");
        }

        const data = await res.json();
        const access_token = data.data?.token || data.token || data.access_token;
        if (!access_token) throw new Error("Authentication successful but no token received");

        return access_token;
    }

    async bookShipment(request: TorodShipmentRequest): Promise<TorodShipmentResponse> {
        if (!this.isConfigured()) {
            return this.simulateBooking(request);
        }

        try {
            const access_token = await this.getAccessToken();

            // 2. Create Order
            const orderRes = await fetch(`${this.apiUrl}/ar/api/order/create`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${access_token}`,
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    name: request.receiver_name,
                    email: request.receiver_email || "no-email@washa.shop",
                    phone_number: request.receiver_mobile,
                    item_description: `Items: ${request.items_count} from Order #${request.order_number}`,
                    order_total: Math.round(request.cod_amount || 0),
                    payment: (request.cod_amount && request.cod_amount > 0) ? "COD" : "Prepaid",
                    weight: Math.ceil(request.weight),
                    no_of_box: 1,
                    type: "address",
                    address: request.address,
                    locate_address: request.address,
                    reference_id: request.order_number,
                    order_type: "normal"
                })
            });

            const data = await orderRes.json();

            if (!orderRes.ok || !data.success) {
                return { 
                    success: false, 
                    error: data.message || data.error?.message || "Failed to create Torod order" 
                };
            }

            const shipmentDetails = data.data || data;

            return {
                success: true,
                tracking_number: shipmentDetails.tracking_id || shipmentDetails.tracking_number,
                courier_name: shipmentDetails.courier_name || shipmentDetails.courier_company_name || "Torod",
                waybill_url: shipmentDetails.air_waybill_url || shipmentDetails.waybill_url,
                torod_order_id: shipmentDetails.order_id?.toString()
            };

        } catch (error) {
            console.error("[Torod API Error]:", error);
            return { success: false, error: String(error) };
        }
    }

    async cancelOrder(trackingId: string): Promise<{ success: boolean; error?: string }> {
        if (!this.isConfigured()) {
            console.log("[Torod Simulation] Cancelling order:", trackingId);
            return { success: true };
        }

        try {
            const token = await this.getAccessToken();
            const res = await fetch(`${this.apiUrl}/ar/api/shipment/cancel`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({ tracking_id: trackingId })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                return { success: false, error: data.message || "Failed to cancel shipment" };
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: String(error) };
        }
    }

    async getShippingRates(request: TorodShipmentRequest): Promise<any[]> {
        if (!this.isConfigured()) return [];

        try {
            const token = await this.getAccessToken();
            const res = await fetch(`${this.apiUrl}/ar/api/order/rates`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    weight: request.weight,
                    city: request.city,
                    cod_amount: request.cod_amount || 0
                })
            });

            const data = await res.json();
            return data.data || [];
        } catch {
            return [];
        }
    }

    async trackShipment(trackingId: string): Promise<any> {
        if (!this.isConfigured()) return { success: false, error: "Not configured" };

        try {
            const token = await this.getAccessToken();
            const trackFormData = new FormData();
            trackFormData.append("tracking_id", trackingId);

            const res = await fetch(`${this.apiUrl}/ar/api/order/track`, {
                method: "POST",
                body: trackFormData,
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Accept": "application/json"
                }
            });

            return await res.json();
        } catch (error) {
            console.error("[Torod Track Error]:", error);
            return { success: false, error: String(error) };
        }
    }

    /**
     * Torod sends `X-Hmac-Sha256`: HMAC-SHA256(raw body), **base64** (see their webhook docs).
     * Secret is your app **Client Secret**; use `TOROD_WEBHOOK_SECRET` or fall back to `TOROD_CLIENT_SECRET`.
     */
    validateWebhookSignature(body: string, signature: string): boolean {
        const secret = this.webhookSecret || this.clientSecret;
        if (!secret) return true;

        const sig = signature.trim();
        const expected = createHmac("sha256", secret).update(body, "utf8").digest();

        // Primary: base64 (Torod)
        try {
            const decoded = Buffer.from(sig, "base64");
            if (decoded.length === expected.length && timingSafeEqual(decoded, expected)) {
                return true;
            }
        } catch {
            /* invalid base64 */
        }

        // Fallback: hex (older / custom setups)
        if (/^[0-9a-fA-F]+$/.test(sig) && sig.length === expected.length * 2) {
            const fromHex = Buffer.from(sig, "hex");
            if (fromHex.length === expected.length && timingSafeEqual(fromHex, expected)) {
                return true;
            }
        }

        return false;
    }
}

export const torod = new TorodClient();

