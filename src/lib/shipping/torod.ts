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
    torod_status?: string;
    pending_shipment?: boolean;
    error?: string;
    is_simulation?: boolean;
}

function readEnvValue(value: string | undefined) {
    const trimmed = value?.trim();
    if (!trimmed || trimmed.startsWith("#")) return undefined;
    return trimmed;
}

class TorodClient {
    private clientId = readEnvValue(process.env.TOROD_CLIENT_ID);
    private clientSecret = readEnvValue(process.env.TOROD_CLIENT_SECRET);
    private webhookSecret = readEnvValue(process.env.TOROD_WEBHOOK_SECRET);
    private apiUrl = (readEnvValue(process.env.TOROD_API_URL) || "https://torod.co/en/api").replace(/\/+$/, "");
    private warehouse = readEnvValue(process.env.TOROD_WAREHOUSE);
    private courierPartnerId = readEnvValue(process.env.TOROD_COURIER_PARTNER_ID);
    private shipmentType = readEnvValue(process.env.TOROD_SHIPMENT_TYPE) || "normal";
    private isOwnContract = readEnvValue(process.env.TOROD_IS_OWN) || "0";
    private isInsurance = readEnvValue(process.env.TOROD_INSURANCE) || "0";

    private isConfigured() {
        return !!(this.clientId && this.clientSecret);
    }

    private endpoint(path: string) {
        return `${this.apiUrl}/${path.replace(/^\/+/, "")}`;
    }

    private formData(values: Record<string, string | number | undefined | null>) {
        const formData = new FormData();
        for (const [key, value] of Object.entries(values)) {
            if (value === undefined || value === null || value === "") continue;
            formData.append(key, String(value));
        }
        return formData;
    }

    private isSuccessResponse(res: Response, data: any) {
        if (!res.ok) return false;
        if (data?.status === false || data?.success === false) return false;
        return data?.status === true || data?.success === true || data?.code === 200 || res.ok;
    }

    private async postForm(endpoint: string, token: string, values: Record<string, string | number | undefined | null>) {
        const res = await fetch(this.endpoint(endpoint), {
            method: "POST",
            body: this.formData(values),
            headers: {
                "Authorization": `Bearer ${token}`,
                "Accept": "application/json",
            },
        });

        const data = await res.json().catch(() => ({}));
        return { res, data };
    }

    private async getAccessToken(): Promise<string> {
        if (!this.clientId || !this.clientSecret) {
            throw new Error("Torod credentials missing");
        }

        const formData = new FormData();
        formData.append("client_id", this.clientId);
        formData.append("client_secret", this.clientSecret);

        const res = await fetch(this.endpoint("token"), {
            method: "POST",
            body: formData,
            headers: { "Accept": "application/json" }
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.message || "Failed to authenticate with Torod");
        }

        const data = await res.json();
        const access_token = data.data?.bearer_token || data.data?.token || data.token || data.access_token;
        if (!access_token) throw new Error("Authentication successful but no token received");

        return access_token;
    }

    async bookShipment(request: TorodShipmentRequest): Promise<TorodShipmentResponse> {
        if (!this.isConfigured()) {
            return {
                success: false,
                error: "تكامل طرود غير مهيأ. أضف بيانات الربط قبل حجز أي شحنة.",
            };
        }

        try {
            const access_token = await this.getAccessToken();

            const { res: orderRes, data } = await this.postForm("order/create", access_token, {
                name: request.receiver_name,
                email: request.receiver_email || "no-email@washa.shop",
                phone_number: request.receiver_mobile,
                item_description: `Items: ${request.items_count} from Order #${request.order_number}`,
                order_total: Math.round(request.cod_amount || 0),
                payment: (request.cod_amount && request.cod_amount > 0) ? "COD" : "Prepaid",
                weight: Math.max(1, Math.ceil(request.weight)),
                no_of_box: 1,
                type: "address",
                locate_address: request.address,
                address: request.address,
            });

            if (!this.isSuccessResponse(orderRes, data)) {
                return { 
                    success: false, 
                    error: data.message || data.error?.message || "Failed to create Torod order" 
                };
            }

            const orderDetails = data.data || data;
            const torodOrderId = orderDetails.order_id?.toString() || orderDetails.id?.toString();
            let trackingNumber = orderDetails.tracking_id || orderDetails.tracking_number;
            let waybillUrl = orderDetails.aws_label || orderDetails.air_waybill_url || orderDetails.waybill_url;
            let torodStatus = orderDetails.status?.toString();

            if (!torodOrderId && !trackingNumber) {
                return {
                    success: false,
                    error: data.message || "Torod order created without order_id or tracking_id",
                };
            }

            if (!trackingNumber && torodOrderId && this.warehouse && this.courierPartnerId) {
                const { res: shipRes, data: shipData } = await this.postForm("order/ship/process", access_token, {
                    order_id: torodOrderId,
                    warehouse: this.warehouse,
                    type: this.shipmentType,
                    courier_partner_id: this.courierPartnerId,
                    is_own: this.isOwnContract,
                    is_insurance: this.isInsurance,
                });

                if (!this.isSuccessResponse(shipRes, shipData)) {
                    return {
                        success: false,
                        torod_order_id: torodOrderId,
                        torod_status: torodStatus,
                        error: shipData.message || shipData.error?.message || "Torod order created but ship process failed",
                    };
                }

                const shipmentDetails = shipData.data || shipData;
                trackingNumber = shipmentDetails.tracking_id || shipmentDetails.tracking_number;
                waybillUrl = shipmentDetails.aws_label || shipmentDetails.air_waybill_url || shipmentDetails.waybill_url || waybillUrl;
                torodStatus = shipmentDetails.status?.toString() || "Shipped";
            }

            return {
                success: true,
                tracking_number: trackingNumber,
                courier_name: orderDetails.courier_name || orderDetails.courier_company_name || "Torod",
                waybill_url: waybillUrl,
                torod_order_id: torodOrderId,
                torod_status: torodStatus,
                pending_shipment: !trackingNumber,
            };

        } catch (error) {
            console.error("[Torod API Error]:", error);
            return { success: false, error: String(error) };
        }
    }

    async cancelOrder(trackingOrOrderId: string): Promise<{ success: boolean; error?: string }> {
        if (!this.isConfigured()) {
            return {
                success: false,
                error: "تكامل طرود غير مهيأ. لا يمكن إلغاء شحنة دون اتصال حقيقي.",
            };
        }

        try {
            const token = await this.getAccessToken();
            const { res, data } = await this.postForm("shipments/cancel", token, {
                tracking_or_order_id: trackingOrOrderId,
            });

            if (!this.isSuccessResponse(res, data)) {
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
            const { data } = await this.postForm("courier/partners/list", token, {
                weight: Math.max(1, Math.ceil(request.weight)),
                type: this.shipmentType,
                filter_by: "cheapest",
                payment: (request.cod_amount && request.cod_amount > 0) ? "COD" : "Prepaid",
                order_total: Math.round(request.cod_amount || 0),
            });

            return data.data || [];
        } catch {
            return [];
        }
    }

    async trackShipment(trackingId: string): Promise<any> {
        if (!this.isConfigured()) return { success: false, error: "Not configured" };

        try {
            const token = await this.getAccessToken();
            const { data } = await this.postForm("order/track", token, {
                tracking_id: trackingId,
            });

            return data;
        } catch (error) {
            console.error("[Torod Track Error]:", error);
            return { success: false, error: String(error) };
        }
    }

    requiresWebhookSignature(): boolean {
        return !!(this.webhookSecret || this.clientSecret);
    }

    validateWebhookAuthorization(authorization: string | null): boolean {
        const secrets = [this.webhookSecret, this.clientSecret].filter(Boolean) as string[];
        if (secrets.length === 0) return true;
        if (!authorization) return false;

        const headerValue = authorization.trim();
        const bearerValue = headerValue.toLowerCase().startsWith("bearer ")
            ? headerValue.slice(7).trim()
            : headerValue;

        return secrets.some((secret) => {
            const received = Buffer.from(bearerValue);
            const expected = Buffer.from(secret);
            return received.length === expected.length && timingSafeEqual(received, expected);
        });
    }

    validateWebhookRequest(body: string, params: { authorization?: string | null; hmac?: string | null }): boolean {
        if (this.validateWebhookAuthorization(params.authorization ?? null)) return true;
        if (params.hmac) return this.validateWebhookSignature(body, params.hmac);
        return !this.requiresWebhookSignature();
    }

    /**
     * Official Torod webhooks verify through the Authorization header carrying the Client Secret Key.
     * HMAC is kept only for older/custom setups that already send `X-Hmac-Sha256`.
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
