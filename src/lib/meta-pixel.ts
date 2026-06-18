// وشّى | WASHA — Meta Pixel Event Helpers (client-side only)
// يطلق أحداث فيسبوك لتغذية خوارزمية الإعلانات بدقة

declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fbq?: (...args: any[]) => void;
    }
}

function fbq(...args: unknown[]) {
    if (typeof window !== "undefined" && typeof window.fbq === "function") {
        window.fbq(...args);
    }
}

export function pixelViewContent(params: {
    contentId: string;
    contentName: string;
    contentType?: string;
    value?: number;
    currency?: string;
}) {
    fbq("track", "ViewContent", {
        content_ids: [params.contentId],
        content_name: params.contentName,
        content_type: params.contentType ?? "product",
        value: params.value,
        currency: params.currency ?? "SAR",
    });
}

export function pixelAddToCart(params: {
    contentId: string;
    contentName: string;
    value: number;
    currency?: string;
}) {
    fbq("track", "AddToCart", {
        content_ids: [params.contentId],
        content_name: params.contentName,
        value: params.value,
        currency: params.currency ?? "SAR",
    });
}

export function pixelInitiateCheckout(params: {
    numItems: number;
    value: number;
    currency?: string;
}) {
    fbq("track", "InitiateCheckout", {
        num_items: params.numItems,
        value: params.value,
        currency: params.currency ?? "SAR",
    });
}

export function pixelPurchase(params: {
    orderId: string;
    value: number;
    currency?: string;
}) {
    fbq("track", "Purchase", {
        content_ids: [params.orderId],
        value: params.value,
        currency: params.currency ?? "SAR",
    });
}
