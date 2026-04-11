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

    async bookShipment(request: TorodShipmentRequest): Promise<TorodShipmentResponse> {
        if (!this.isConfigured()) {
            return this.simulateBooking(request);
        }

        try {
            // 1. Get Access Token (Authentication)
            const formData = new FormData();
            formData.append("client_id", this.clientId!);
            formData.append("client_secret", this.clientSecret!);

            const authRes = await fetch(`${this.apiUrl}/ar/api/token`, {
                method: "POST",
                body: formData,
                headers: { "Accept": "application/json" }
            });

            if (!authRes.ok) {
                const errorData = await authRes.json().catch(() => ({}));
                throw new Error(errorData.message || "Failed to authenticate with Torod");
            }
            
            const authData = await authRes.json();
            const access_token = authData.data?.token || authData.token || authData.access_token;
            if (!access_token) throw new Error("Authentication successful but no token received");

            // 2. Create Order
            // Official Path: /ar/api/order/create
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
                    order_total: Math.round(request.cod_amount || 0), // Assuming COD is the total for now
                    payment: (request.cod_amount && request.cod_amount > 0) ? "COD" : "Prepaid",
                    weight: Math.ceil(request.weight),
                    no_of_box: 1,
                    type: "address",
                    address: request.address,
                    locate_address: request.address, // Using same string for map location if city is in it
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

            // Torod typically returns structured data under .data
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

    /**
     * تتبع الشحنة باستخدام رقم التتبع أو معرف الطلب
     */
    async trackShipment(trackingId: string): Promise<any> {
        if (!this.isConfigured()) return { success: false, error: "Not configured" };

        try {
            // 1. Get Token (Standard flow)
            const formData = new FormData();
            formData.append("client_id", this.clientId!);
            formData.append("client_secret", this.clientSecret!);

            const authRes = await fetch(`${this.apiUrl}/ar/api/token`, { method: "POST", body: formData });
            const authData = await authRes.json();
            const token = authData.data?.token || authData.token;

            // 2. Track Request
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
}

export const torod = new TorodClient();
