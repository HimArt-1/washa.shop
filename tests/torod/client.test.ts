import { afterEach, describe, expect, it, vi } from "vitest";

async function loadTorodWithEnv(env?: Record<string, string>) {
    vi.resetModules();
    vi.stubEnv("TOROD_CLIENT_ID", env?.TOROD_CLIENT_ID ?? "client-id");
    vi.stubEnv("TOROD_CLIENT_SECRET", env?.TOROD_CLIENT_SECRET ?? "client-secret");
    vi.stubEnv("TOROD_API_URL", env?.TOROD_API_URL ?? "https://torod.co/en/api");
    if (env?.TOROD_WAREHOUSE) vi.stubEnv("TOROD_WAREHOUSE", env.TOROD_WAREHOUSE);
    if (env?.TOROD_COURIER_PARTNER_ID) vi.stubEnv("TOROD_COURIER_PARTNER_ID", env.TOROD_COURIER_PARTNER_ID);

    const { torod } = await import("@/lib/shipping/torod");
    return torod;
}

function jsonResponse(body: unknown, init?: ResponseInit) {
    return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
        ...init,
    });
}

function sampleShipmentRequest() {
    return {
        order_number: "WA-1001",
        receiver_name: "عميل وشّى",
        receiver_mobile: "966532235005",
        receiver_email: "buyer@example.com",
        address: "Riyadh Saudi Arabia",
        city: "Riyadh",
        weight: 0.5,
        cod_amount: 0,
        items_count: 2,
    };
}

describe("Torod API client", () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.restoreAllMocks();
        vi.resetModules();
    });

    it("uses the official token, order/create, and order/ship/process form endpoints", async () => {
        const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
            const body = init.body as FormData;

            if (url.endsWith("/token")) {
                expect(body.get("client_id")).toBe("client-id");
                expect(body.get("client_secret")).toBe("client-secret");
                return jsonResponse({ status: true, data: { bearer_token: "access-token" } });
            }

            expect(init.headers).toMatchObject({ Authorization: "Bearer access-token", Accept: "application/json" });

            if (url.endsWith("/order/create")) {
                expect(body.get("name")).toBe("عميل وشّى");
                expect(body.get("payment")).toBe("Prepaid");
                expect(body.get("type")).toBe("address");
                expect(body.get("locate_address")).toBe("Riyadh Saudi Arabia");
                return jsonResponse({
                    status: true,
                    data: { order_id: "79586149", status: "Pending", tracking_id: null },
                });
            }

            if (url.endsWith("/order/ship/process")) {
                expect(body.get("order_id")).toBe("79586149");
                expect(body.get("warehouse")).toBe("WH-1");
                expect(body.get("courier_partner_id")).toBe("13");
                return jsonResponse({
                    status: true,
                    data: { tracking_id: "337476432479", aws_label: "https://torod.co/en/downloadLabel/4026" },
                });
            }

            throw new Error(`Unexpected URL: ${url}`);
        });
        vi.stubGlobal("fetch", fetchMock);

        const torod = await loadTorodWithEnv({
            TOROD_WAREHOUSE: "WH-1",
            TOROD_COURIER_PARTNER_ID: "13",
        });

        await expect(torod.bookShipment(sampleShipmentRequest())).resolves.toMatchObject({
            success: true,
            torod_order_id: "79586149",
            tracking_number: "337476432479",
            waybill_url: "https://torod.co/en/downloadLabel/4026",
            pending_shipment: false,
        });
        expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it("keeps a created Torod order pending when no ship-process configuration is available", async () => {
        vi.stubGlobal("fetch", vi.fn(async (url: string) => {
            if (url.endsWith("/token")) {
                return jsonResponse({ status: true, data: { bearer_token: "access-token" } });
            }
            if (url.endsWith("/order/create")) {
                return jsonResponse({
                    status: true,
                    data: { order_id: "79586149", status: "Pending", tracking_id: null },
                });
            }
            throw new Error(`Unexpected URL: ${url}`);
        }));

        const torod = await loadTorodWithEnv();

        await expect(torod.bookShipment(sampleShipmentRequest())).resolves.toMatchObject({
            success: true,
            torod_order_id: "79586149",
            tracking_number: undefined,
            pending_shipment: true,
        });
    });

    it("cancels using the official tracking_or_order_id field", async () => {
        const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
            const body = init.body as FormData;
            if (url.endsWith("/token")) {
                return jsonResponse({ status: true, data: { bearer_token: "access-token" } });
            }
            if (url.endsWith("/shipments/cancel")) {
                expect(body.get("tracking_or_order_id")).toBe("79586149");
                return jsonResponse({ status: true, message: "Shipment has cancelled successfully." });
            }
            throw new Error(`Unexpected URL: ${url}`);
        });
        vi.stubGlobal("fetch", fetchMock);

        const torod = await loadTorodWithEnv();

        await expect(torod.cancelOrder("79586149")).resolves.toEqual({ success: true });
    });
});
